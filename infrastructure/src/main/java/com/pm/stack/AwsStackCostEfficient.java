package com.pm.stack;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import software.amazon.awscdk.App;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.Peer;
import software.amazon.awscdk.services.ec2.Port;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ec2.SubnetConfiguration;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.ecr.IRepository;
import software.amazon.awscdk.services.ecr.Repository;
import software.amazon.awscdk.services.ecs.AwsLogDriverProps;
import software.amazon.awscdk.services.ecs.Cluster;
import software.amazon.awscdk.services.ecs.ContainerDefinitionOptions;
import software.amazon.awscdk.services.ecs.ContainerImage;
import software.amazon.awscdk.services.ecs.FargateService;
import software.amazon.awscdk.services.ecs.FargateTaskDefinition;
import software.amazon.awscdk.services.ecs.LogDriver;
import software.amazon.awscdk.services.ecs.PortMapping;
import software.amazon.awscdk.services.ecs.Protocol;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationProtocol;
import software.amazon.awscdk.services.elasticloadbalancingv2.HealthCheck;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.logs.RetentionDays;
import software.amazon.awscdk.services.rds.Credentials;
import software.amazon.awscdk.services.rds.DatabaseInstance;
import software.amazon.awscdk.services.rds.DatabaseInstanceEngine;
import software.amazon.awscdk.services.rds.PostgresEngineVersion;
import software.amazon.awscdk.services.rds.PostgresInstanceEngineProps;
import software.amazon.awscdk.services.servicediscovery.PrivateDnsNamespace;

/**
 * AWS Cost-Efficient Stack for Patient Management System
 *
 * COST OPTIMIZATIONS:
 * - NO NAT Gateway (saves ~$35/month) - uses public subnets with public IPs
 * - NO MSK (saves ~$100/month) - uses in-memory events or external free Kafka
 * - Single RDS instance (saves ~$15/month) - shared database
 * - Minimal Fargate resources (0.25 vCPU, 512MB)
 * - Short log retention (1 day)
 *
 * Estimated cost: ~$50-70/month
 */
public class AwsStackCostEfficient extends Stack {

    private final Vpc vpc;
    private final Cluster ecsCluster;
    private final SecurityGroup ecsSecurityGroup;
    private final SecurityGroup dbSecurityGroup;
    private final PrivateDnsNamespace serviceDiscoveryNamespace;

    // ECR Repositories (looked up, not created - they must exist before deployment)
    private IRepository apiGatewayRepo;
    private IRepository authServiceRepo;
    private IRepository patientServiceRepo;
    private IRepository billingServiceRepo;
    private IRepository analyticsServiceRepo;

    public AwsStackCostEfficient(final App scope, final String id, final StackProps props) {
        super(scope, id, props);

        // Create VPC WITHOUT NAT Gateway (cost saving)
        this.vpc = createVpc();

        // Create Security Groups
        this.ecsSecurityGroup = createEcsSecurityGroup();
        this.dbSecurityGroup = createDbSecurityGroup();

        // Create ECR Repositories
        createEcrRepositories();

        // Create Service Discovery Namespace
        this.serviceDiscoveryNamespace = PrivateDnsNamespace.Builder.create(this, "ServiceDiscovery")
                .name("patient-management.local")
                .vpc(vpc)
                .build();

        // Create ECS Cluster
        this.ecsCluster = createEcsCluster();

        // Create SINGLE shared RDS Database (cost saving - instead of 2 databases)
        DatabaseInstance sharedDb = createDatabase("SharedDB", "patientmanagement");

        // Create ECS Services (all in public subnets with public IPs to avoid NAT)
        createFargateService(
                "AuthService",
                authServiceRepo,
                List.of(4005),
                sharedDb,
                "auth",
                Map.of("JWT_SECRET", "Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM=")
        );

        createFargateService(
                "BillingService",
                billingServiceRepo,
                List.of(4001, 9001),
                null,
                null,
                null
        );

        // Analytics service - works without Kafka (stores events in memory)
        createFargateService(
                "AnalyticsService",
                analyticsServiceRepo,
                List.of(4002),
                null,
                null,
                Map.of("KAFKA_ENABLED", "false") // Disable Kafka to save costs
        );

        createFargateService(
                "PatientService",
                patientServiceRepo,
                List.of(4000),
                sharedDb,
                "patient",
                Map.of(
                        "BILLING_SERVICE_ADDRESS", "billing-service.patient-management.local",
                        "BILLING_SERVICE_GRPC_PORT", "9001",
                        "KAFKA_ENABLED", "false" // Disable Kafka to save costs
                )
        );

        // Create API Gateway with ALB
        FargateService apiGateway = createApiGatewayService();

        CfnOutput.Builder.create(this, "CostEstimate")
                .value("Estimated monthly cost: $50-70 (when services are running)")
                .description("Approximate monthly AWS cost")
                .build();
    }

    private Vpc createVpc() {
        // Create VPC with ONLY public subnets (NO NAT Gateway = saves ~$35/month)
        return Vpc.Builder.create(this, "PatientManagementVPC")
                .vpcName("patient-management-vpc")
                .maxAzs(2)
                .natGateways(0) // NO NAT Gateway - cost saving!
                .subnetConfiguration(List.of(
                        SubnetConfiguration.builder()
                                .name("Public")
                                .subnetType(SubnetType.PUBLIC)
                                .cidrMask(24)
                                .build()
                ))
                .build();
    }

    private SecurityGroup createEcsSecurityGroup() {
        SecurityGroup sg = SecurityGroup.Builder.create(this, "EcsSecurityGroup")
                .vpc(vpc)
                .securityGroupName("patient-management-ecs-sg")
                .description("Security group for ECS services")
                .allowAllOutbound(true)
                .build();

        // Allow internal communication between services
        sg.addIngressRule(Peer.ipv4(vpc.getVpcCidrBlock()), Port.allTcp(), "Allow internal traffic");
        // Allow health checks from ALB
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(4004), "Allow ALB health checks");

        return sg;
    }

    private SecurityGroup createDbSecurityGroup() {
        SecurityGroup sg = SecurityGroup.Builder.create(this, "DbSecurityGroup")
                .vpc(vpc)
                .securityGroupName("patient-management-db-sg")
                .description("Security group for RDS database")
                .allowAllOutbound(false)
                .build();

        // Allow PostgreSQL from ECS
        sg.addIngressRule(ecsSecurityGroup, Port.tcp(5432), "Allow PostgreSQL from ECS");

        return sg;
    }

    private void createEcrRepositories() {
        // Look up existing ECR repositories (created manually before deployment)
        this.apiGatewayRepo = Repository.fromRepositoryName(this, "ApiGatewayRepo",
                "patient-management/api-gateway");

        this.authServiceRepo = Repository.fromRepositoryName(this, "AuthServiceRepo",
                "patient-management/auth-service");

        this.patientServiceRepo = Repository.fromRepositoryName(this, "PatientServiceRepo",
                "patient-management/patient-service");

        this.billingServiceRepo = Repository.fromRepositoryName(this, "BillingServiceRepo",
                "patient-management/billing-service");

        this.analyticsServiceRepo = Repository.fromRepositoryName(this, "AnalyticsServiceRepo",
                "patient-management/analytics-service");
    }

    private Cluster createEcsCluster() {
        return Cluster.Builder.create(this, "PatientManagementCluster")
                .clusterName("patient-management-cluster")
                .vpc(vpc)
                .build();
    }

    private DatabaseInstance createDatabase(String id, String dbName) {
        // Single shared database to reduce costs
        return DatabaseInstance.Builder.create(this, id)
                .engine(DatabaseInstanceEngine.postgres(
                        PostgresInstanceEngineProps.builder()
                                .version(PostgresEngineVersion.VER_15)
                                .build()))
                .vpc(vpc)
                .vpcSubnets(SubnetSelection.builder()
                        .subnetType(SubnetType.PUBLIC) // Public subnet (no NAT needed)
                        .build())
                .securityGroups(List.of(dbSecurityGroup))
                .instanceType(InstanceType.of(InstanceClass.T3, InstanceSize.MICRO)) // Smallest instance
                .allocatedStorage(20) // Minimum storage
                .credentials(Credentials.fromGeneratedSecret("admin_user"))
                .databaseName(dbName)
                .multiAz(false) // Single AZ (cost saving)
                .publiclyAccessible(false) // Keep private for security
                .removalPolicy(RemovalPolicy.DESTROY)
                .deletionProtection(false)
                .build();
    }

    private FargateService createFargateService(
            String id,
            IRepository ecrRepo,
            List<Integer> ports,
            DatabaseInstance db,
            String schemaPrefix,
            Map<String, String> additionalEnvVars) {

        // Minimal resources to save costs
        FargateTaskDefinition taskDefinition = FargateTaskDefinition.Builder
                .create(this, id + "TaskDef")
                .cpu(256)        // 0.25 vCPU (minimum)
                .memoryLimitMiB(512)  // 512 MB (minimum for Java)
                .build();

        Map<String, String> envVars = new HashMap<>();

        // Disable Kafka by default (no MSK = save ~$100/month)
        envVars.put("SPRING_KAFKA_BOOTSTRAP_SERVERS", "");
        envVars.put("KAFKA_ENABLED", "false");

        if (additionalEnvVars != null) {
            envVars.putAll(additionalEnvVars);
        }

        if (db != null && db.getSecret() != null) {
            // Use schema prefix to separate data in shared database
            String schema = schemaPrefix != null ? schemaPrefix : id.toLowerCase();
            envVars.put("SPRING_DATASOURCE_URL", String.format("jdbc:postgresql://%s:%s/%s?currentSchema=%s",
                    db.getDbInstanceEndpointAddress(),
                    db.getDbInstanceEndpointPort(),
                    "patientmanagement",
                    schema));
            envVars.put("SPRING_DATASOURCE_USERNAME", "admin_user");
            envVars.put("SPRING_DATASOURCE_PASSWORD", db.getSecret().secretValueFromJson("password").unsafeUnwrap());
            envVars.put("SPRING_JPA_HIBERNATE_DDL_AUTO", "update");
            envVars.put("SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA", schema);
        }

        String serviceName = id.toLowerCase().replace("service", "-service");
        if (!serviceName.endsWith("-service")) {
            serviceName = serviceName + "-service";
        }
        serviceName = serviceName.replace("--", "-");

        ContainerDefinitionOptions containerOptions = ContainerDefinitionOptions.builder()
                .image(ContainerImage.fromEcrRepository(ecrRepo, "latest"))
                .portMappings(ports.stream()
                        .map(port -> PortMapping.builder()
                                .containerPort(port)
                                .hostPort(port)
                                .protocol(Protocol.TCP)
                                .build())
                        .toList())
                .environment(envVars)
                .logging(LogDriver.awsLogs(AwsLogDriverProps.builder()
                        .logGroup(LogGroup.Builder.create(this, id + "LogGroup")
                                .logGroupName("/ecs/patient-management/" + serviceName)
                                .removalPolicy(RemovalPolicy.DESTROY)
                                .retention(RetentionDays.ONE_DAY) // Short retention = lower cost
                                .build())
                        .streamPrefix(serviceName)
                        .build()))
                .build();

        taskDefinition.addContainer(id + "Container", containerOptions);

        return FargateService.Builder.create(this, id)
                .cluster(ecsCluster)
                .taskDefinition(taskDefinition)
                .desiredCount(0) // START WITH 0 - manually scale up when needed (saves money when not in use)
                .securityGroups(List.of(ecsSecurityGroup))
                .assignPublicIp(true) // Public IP (no NAT needed)
                .vpcSubnets(SubnetSelection.builder()
                        .subnetType(SubnetType.PUBLIC)
                        .build())
                .serviceName(serviceName)
                .cloudMapOptions(software.amazon.awscdk.services.ecs.CloudMapOptions.builder()
                        .cloudMapNamespace(serviceDiscoveryNamespace)
                        .name(serviceName)
                        .build())
                .build();
    }

    private FargateService createApiGatewayService() {
        FargateTaskDefinition taskDefinition = FargateTaskDefinition.Builder
                .create(this, "APIGatewayTaskDef")
                .cpu(256)
                .memoryLimitMiB(512)
                .build();

        Map<String, String> envVars = Map.of(
                "SPRING_PROFILES_ACTIVE", "aws",
                "AUTH_SERVICE_URL", "http://auth-service.patient-management.local:4005",
                "PATIENT_SERVICE_URL", "http://patient-service.patient-management.local:4000",
                "BILLING_SERVICE_URL", "http://billing-service.patient-management.local:4001",
                "ANALYTICS_SERVICE_URL", "http://analytics-service.patient-management.local:4002"
        );

        ContainerDefinitionOptions containerOptions = ContainerDefinitionOptions.builder()
                .image(ContainerImage.fromEcrRepository(apiGatewayRepo, "latest"))
                .portMappings(List.of(
                        PortMapping.builder()
                                .containerPort(4004)
                                .hostPort(4004)
                                .protocol(Protocol.TCP)
                                .build()
                ))
                .environment(envVars)
                .logging(LogDriver.awsLogs(AwsLogDriverProps.builder()
                        .logGroup(LogGroup.Builder.create(this, "ApiGatewayLogGroup")
                                .logGroupName("/ecs/patient-management/api-gateway")
                                .removalPolicy(RemovalPolicy.DESTROY)
                                .retention(RetentionDays.ONE_DAY)
                                .build())
                        .streamPrefix("api-gateway")
                        .build()))
                .build();

        taskDefinition.addContainer("APIGatewayContainer", containerOptions);

        // Use FargateService (allows desiredCount=0) instead of ApplicationLoadBalancedFargateService
        FargateService fargateService = FargateService.Builder.create(this, "APIGatewayFargateService")
                .cluster(ecsCluster)
                .taskDefinition(taskDefinition)
                .desiredCount(0) // START WITH 0 - manually scale up when needed
                .securityGroups(List.of(ecsSecurityGroup))
                .assignPublicIp(true)
                .vpcSubnets(SubnetSelection.builder()
                        .subnetType(SubnetType.PUBLIC)
                        .build())
                .serviceName("api-gateway")
                .cloudMapOptions(software.amazon.awscdk.services.ecs.CloudMapOptions.builder()
                        .cloudMapNamespace(serviceDiscoveryNamespace)
                        .name("api-gateway")
                        .build())
                .build();

        // Create ALB separately
        software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancer alb =
                software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancer.Builder
                        .create(this, "APIGatewayALB")
                        .vpc(vpc)
                        .internetFacing(true)
                        .loadBalancerName("patient-mgmt-alb")
                        .securityGroup(ecsSecurityGroup)
                        .build();

        // Create target group
        software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationTargetGroup targetGroup =
                software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationTargetGroup.Builder
                        .create(this, "APIGatewayTargetGroup")
                        .vpc(vpc)
                        .port(4004)
                        .protocol(ApplicationProtocol.HTTP)
                        .targetType(software.amazon.awscdk.services.elasticloadbalancingv2.TargetType.IP)
                        .healthCheck(HealthCheck.builder()
                                .path("/actuator/health")
                                .port("4004")
                                .healthyHttpCodes("200")
                                .interval(Duration.seconds(60))
                                .timeout(Duration.seconds(10))
                                .healthyThresholdCount(2)
                                .unhealthyThresholdCount(5)
                                .build())
                        .build();

        // Register service with target group
        fargateService.attachToApplicationTargetGroup(targetGroup);

        // Create listener
        alb.addListener("HTTPListener", software.amazon.awscdk.services.elasticloadbalancingv2.BaseApplicationListenerProps.builder()
                .port(80)
                .defaultTargetGroups(List.of(targetGroup))
                .build());

        // Output ALB DNS
        CfnOutput.Builder.create(this, "ALBDnsName")
                .value(alb.getLoadBalancerDnsName())
                .description("ALB DNS Name - Use this to access your API")
                .exportName("ALBDnsName")
                .build();

        return fargateService;
    }

    public static void main(final String[] args) {
        App app = new App();

        String account = System.getenv("CDK_DEFAULT_ACCOUNT");
        String region = System.getenv("CDK_DEFAULT_REGION");

        if (account == null) {
            account = System.getenv("AWS_ACCOUNT_ID");
        }
        if (region == null) {
            region = System.getenv("AWS_REGION");
            if (region == null) {
                region = "us-east-1";
            }
        }

        Environment env = Environment.builder()
                .account(account)
                .region(region)
                .build();

        StackProps props = StackProps.builder()
                .env(env)
                .description("Patient Management System - Cost Efficient Stack (~$50-70/month)")
                .build();

        new AwsStackCostEfficient(app, "PatientManagementStack", props);
        app.synth();

        System.out.println("=========================================");
        System.out.println("Cost-Efficient AWS Stack synthesized!");
        System.out.println("=========================================");
        System.out.println("Account: " + account);
        System.out.println("Region: " + region);
        System.out.println("");
        System.out.println("COST SAVINGS:");
        System.out.println("  - NO NAT Gateway: saves ~$35/month");
        System.out.println("  - NO MSK (Kafka): saves ~$100/month");
        System.out.println("  - Single RDS instance: saves ~$15/month");
        System.out.println("  - Services start with 0 instances (no cost until you start them)");
        System.out.println("");
        System.out.println("IMPORTANT: Services are deployed with desiredCount=0");
        System.out.println("They will NOT auto-start. Use these commands to control them:");
        System.out.println("");
        System.out.println("START ALL SERVICES:");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 1");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 1");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 1");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 1");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 1");
        System.out.println("");
        System.out.println("STOP ALL SERVICES (to stop charges):");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 0");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 0");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 0");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 0");
        System.out.println("  aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 0");
        System.out.println("");
        System.out.println("DELETE EVERYTHING:");
        System.out.println("  cdk destroy PatientManagementStack");
    }
}
