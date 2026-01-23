# AWS Deployment Guide for Patient Management System

This guide explains how to deploy the Patient Management microservices to AWS **cost-efficiently**.

## 💰 Cost Comparison

| Deployment Type | Monthly Cost | What's Included |
|-----------------|--------------|-----------------|
| **Cost-Efficient (Recommended)** | **~$50-70** | No NAT, No MSK, Single DB |
| Full Production | ~$240 | NAT Gateway, MSK Kafka, Multi-DB |

## Cost-Efficient Architecture

This deployment **saves ~$170/month** by:

| Optimization | Savings | Trade-off |
|--------------|---------|-----------|
| No NAT Gateway | ~$35/month | Services in public subnets with public IPs |
| No MSK (Kafka) | ~$100/month | Events stored in-memory (fine for demo/dev) |
| Single RDS instance | ~$15/month | Shared database with schema separation |
| Minimal Fargate | ~$20/month | 0.25 vCPU, 512MB per service |
| 1-day log retention | ~$5/month | Less log history |

### Final Cost Breakdown

**When services are STOPPED (desiredCount=0):**

| Service | Cost |
|---------|------|
| ECS Fargate | **$0** (no running tasks) |
| RDS PostgreSQL | ~$15/month (always on) |
| ALB | ~$16/month (always on) |
| CloudWatch Logs | ~$1/month |
| ECR | ~$1/month |
| **Total (idle)** | **~$33/month** |

**When services are RUNNING:**

| Service | Specification | Monthly Cost |
|---------|---------------|--------------|
| ECS Fargate (5 services) | 0.25 vCPU, 512 MB each | ~$25 |
| RDS PostgreSQL | db.t3.micro, single instance | ~$15 |
| ALB | Application Load Balancer | ~$16 |
| CloudWatch Logs | 1-day retention | ~$2 |
| ECR | Container storage | ~$1 |
| Data Transfer | Minimal | ~$5 |
| **Total (running)** | | **~$50-70/month** |

**💡 TIP:** For a quick demo, run services for just a few hours:
- 1 hour of all services = ~$0.05
- 1 day of all services = ~$1.20
- Keep stopped when not demoing = just ~$33/month for infrastructure

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
   ```bash
   aws configure
   ```

2. **AWS CDK** installed globally
   ```bash
   npm install -g aws-cdk
   ```

3. **Docker** installed and running

4. **Java 21** and Maven installed

## Quick Deployment (5 Steps)

### Step 1: Bootstrap CDK (First Time Only)

```bash
# Get your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Bootstrap CDK
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

### Step 2: Create ECR Repositories

```bash
for repo in api-gateway auth-service patient-service billing-service analytics-service; do
  aws ecr create-repository --repository-name patient-management/$repo --region $AWS_REGION 2>/dev/null || true
done
```

### Step 3: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# From the project root directory
cd ~/OneDrive/Desktop/patient-management

# Build and push each service
for service in api-gateway auth-service patient-service billing-service analytics-service; do
  echo "Building $service..."
  docker build -t $service:latest ./$service
  docker tag $service:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/patient-management/$service:latest
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/patient-management/$service:latest
done
```

### Step 4: Deploy the Cost-Efficient Stack

```bash
cd infrastructure

# Set environment variables
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_REGION

# Synthesize and deploy (uses cost-efficient stack)
mvn clean compile -DskipTests exec:java -Dexec.mainClass=com.pm.stack.AwsStackCostEfficient

# Deploy to AWS
cdk deploy PatientManagementStack --require-approval never
```

### Step 5: Get Your API URL

```bash
# Get the ALB DNS name (your API endpoint)
aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, 'Patient')].DNSName" \
  --output text
```

## Testing the Deployment

### Health Check
```bash
curl http://<ALB_DNS>/actuator/health
```

### Login
```bash
curl -X POST http://<ALB_DNS>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"password123"}'
```

### Create Patient
```bash
TOKEN="<token_from_login>"
curl -X POST http://<ALB_DNS>/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St",
    "dateOfBirth": "1990-01-15"
  }'
```

## 🎮 Start and Stop Services (IMPORTANT!)

**Services are deployed with 0 running instances by default.** This means:
- ✅ No charges when not using
- ✅ No auto-restart
- ✅ You control when services run

### Start All Services (when you want to demo)
```bash
# Start all services
aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 1
```

### Stop All Services (when done - stops charges!)
```bash
# Stop all services (NO charges for Fargate when stopped)
aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 0
```

### One-liner to Stop Everything
```bash
for svc in api-gateway auth-service patient-service billing-service analytics-service; do aws ecs update-service --cluster patient-management-cluster --service $svc --desired-count 0; done
```

### One-liner to Start Everything
```bash
for svc in api-gateway auth-service patient-service billing-service analytics-service; do aws ecs update-service --cluster patient-management-cluster --service $svc --desired-count 1; done
```

## 🧹 Clean Up (IMPORTANT - Stop Charges!)

```bash
# Destroy the stack
cdk destroy PatientManagementStack --force

# Delete ECR repositories
for repo in api-gateway auth-service patient-service billing-service analytics-service; do
  aws ecr delete-repository --repository-name patient-management/$repo --force 2>/dev/null || true
done
```

## Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │              AWS Cloud                   │
                    │                                          │
   Internet ───────►│  ┌─────────┐    ┌──────────────────┐   │
                    │  │   ALB   │───►│   API Gateway    │   │
                    │  └─────────┘    │   (Fargate)      │   │
                    │                 └────────┬─────────┘   │
                    │                          │              │
                    │     ┌────────────────────┼───────────┐ │
                    │     │        Service Discovery        │ │
                    │     │     (patient-management.local)  │ │
                    │     └────────────────────┼───────────┘ │
                    │                          │              │
                    │  ┌─────────┬─────────┬───┴───┬───────┐ │
                    │  │  Auth   │ Patient │Billing│Analyt.│ │
                    │  │ Service │ Service │Service│Service│ │
                    │  │(Fargate)│(Fargate)│(Farg.)│(Farg.)│ │
                    │  └────┬────┴────┬────┴───────┴───────┘ │
                    │       │         │                       │
                    │       └────┬────┘                       │
                    │            ▼                            │
                    │    ┌──────────────┐                    │
                    │    │  RDS Postgres │                    │
                    │    │   (Shared)    │                    │
                    │    └──────────────┘                    │
                    │                                          │
                    └─────────────────────────────────────────┘
```

## Troubleshooting

### Services not starting
```bash
aws logs tail /ecs/patient-management/api-gateway --follow
```

### Database connection issues
- Check security group allows port 5432 from ECS
- Verify RDS is in same VPC as ECS services

### Check service health
```bash
aws ecs describe-services \
  --cluster patient-management-cluster \
  --services api-gateway auth-service patient-service billing-service analytics-service \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount}'
```

## Free Tier Notes

If you're on AWS Free Tier, you may get additional savings:
- **RDS**: 750 hours/month of db.t3.micro (first 12 months)
- **ECS**: No free tier, but Fargate Spot can save 70%
- **ALB**: 750 hours/month (first 12 months)

To use Fargate Spot (saves ~70% on compute), modify the stack to use:
```java
.capacityProviderStrategies(List.of(
    CapacityProviderStrategy.builder()
        .capacityProvider("FARGATE_SPOT")
        .weight(1)
        .build()
))
```
