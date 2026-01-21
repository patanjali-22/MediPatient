# MediPatient(Patient Management Microservices)

MediPatient is a microservices-based system built with **Java 21 + Spring Boot**.
It demonstrates a typical healthcare-style domain split into services (patients, auth, billing, analytics) behind a single edge **API Gateway**, plus infrastructure provisioning for running locally on **LocalStack**.


## What’s in this repo

### Services
- **api-gateway** (Spring Cloud Gateway)
  - Single entrypoint for HTTP clients
  - Runs on **port 4004**
- **auth-service** (Spring Boot + Spring Security + JWT + JPA)
  - Issues and validates JWTs
  - Runs on **port 4005**
  - Uses Postgres (provisioned via the infra stack; H2 exists for dev/test)
- **patient-service** (Spring Boot + JPA + Validation)
  - CRUD for patients
  - Runs on **port 4000**
  - Emits events to Kafka (MSK in the infra stack)
  - Calls billing-service over gRPC
- **billing-service** (Spring Boot + gRPC)
  - Billing/account operations over HTTP and gRPC
  - Runs on **HTTP 4001** and **gRPC 9001**
- **analytics-service** (Spring Boot + Kafka)
  - Consumes events and exposes analytics endpoints
  - Runs on **port 4002**

### Infrastructure
- **infrastructure/** is an AWS CDK (Java) app.
- It provisions (for LocalStack):
  - VPC
  - ECS cluster + Fargate services
  - ALB in front of `api-gateway`
  - Postgres databases for auth-service and patient-service
  - MSK (Kafka)

### Requests & tests
- `api-requests/**` contains ready-to-run HTTP request files (JetBrains HTTP client)
- `grpc-requests/**` contains gRPC HTTP client requests
- `integration-tests/**` contains JUnit + RestAssured integration tests

## Architecture (high level)

Typical flow:
1. Client calls **API Gateway** (`:4004`)
2. Gateway routes auth endpoints to **auth-service** (`:4005`)
3. Gateway routes patient endpoints to **patient-service** (`:4000`)
4. patient-service talks to **billing-service** over gRPC (`:9001`)
5. patient-service publishes Kafka events; **analytics-service** consumes them

## Tech stack
- Java 21
- Spring Boot (services)
- Spring Cloud Gateway (api-gateway)
- PostgreSQL (RDS in CDK; LocalStack emulation)
- Kafka/MSK (LocalStack emulation)
- gRPC + Protobuf (patient-service ↔ billing-service)
- AWS CDK v2 (Java)
- JUnit + RestAssured (integration-tests)

## Prerequisites
- Java 21
- Maven (or use the included `mvnw` / `mvnw.cmd` in each module)
- Docker + Docker Desktop
- LocalStack
- AWS CLI (for deploying the synthesized CloudFormation template into LocalStack)

> Notes for Windows:
> - Use `mvnw.cmd` (not `./mvnw`).
> - Ensure Docker Desktop is running.

## Running locally (LocalStack)

This repo is set up to synthesize an AWS CDK template and deploy it to LocalStack using AWS CLI.

### 1) Start LocalStack
Start LocalStack in Docker, exposing the edge port:

```bash
# Example (adjust to your setup)
docker run --rm -it \
  -p 4566:4566 \
  -e SERVICES=cloudformation,ec2,ecs,elbv2,iam,logs,rds,route53,msk,servicediscovery \
  localstack/localstack
```

### 2) Build container images
Each microservice has a Dockerfile. Build them from the repo root:

```bash
docker build -t api-gateway ./api-gateway
docker build -t auth-service ./auth-service
docker build -t patient-service ./patient-service
docker build -t billing-service ./billing-service
docker build -t analytics-service ./analytics-service
```

### 3) Synthesize the CDK template
From `infrastructure/`:

```bash
# Windows
cd infrastructure
mvnw.cmd -DskipTests exec:java -Dexec.mainClass=com.pm.stack.LocalStack
```

This generates `infrastructure/cdk.out/localstack.template.json`.

### 4) Deploy into LocalStack
From `infrastructure/`:

```bash
# If you’re on macOS/Linux:
./localstack-deploy.sh

# On Windows, run the equivalent AWS CLI commands (PowerShell):
$env:AWS_ACCESS_KEY_ID="test"
$env:AWS_SECRET_ACCESS_KEY="test"
$env:AWS_DEFAULT_REGION="us-east-1"
aws --endpoint-url=http://localhost:4566 cloudformation deploy --stack-name patient-management --template-file .\\cdk.out\\localstack.template.json
aws --endpoint-url=http://localhost:4566 elbv2 describe-load-balancers --query "LoadBalancers[0].DNSName" --output text
```

The output DNS name will look like:

```
lb-<id>.elb.localhost.localstack.cloud
```

## Calling the API

### Important: include the port
The ALB listener for the API Gateway is **port 4004**.
So always call:

```
http://lb-<id>.elb.localhost.localstack.cloud:4004
```

### Auth
Use `api-requests/auth-service/login.http` to get a JWT.

Typical endpoint:
- `POST /auth/login`

### Patients
Use `api-requests/patient-service/*.http`.

Typical endpoints:
- `GET /api/patients`
- `POST /api/patients`
- `PUT /api/patients/{id}`
- `DELETE /api/patients/{id}`

## Ports
| Component | Port(s) |
|---|---:|
| api-gateway | 4004 |
| auth-service | 4005 |
| patient-service | 4000 |
| billing-service | 4001 (HTTP), 9001 (gRPC) |
| analytics-service | 4002 |
| LocalStack edge | 4566 |

## Running tests

### Unit tests
From any service directory:

```bash
mvnw.cmd test
```

### Integration tests
From `integration-tests/`:

```bash
mvnw.cmd test
```

> The integration tests assume the system is already running (e.g., deployed in LocalStack).

## Troubleshooting

### `Connection refused` to `127.0.0.1:80`
You’re calling the load balancer without specifying a port. Use:

- `http://lb-...elb.localhost.localstack.cloud:4004/...`

### `Connection refused` to `127.0.0.1:4004`
This means nothing is listening on your host on port 4004.
Common causes:
- LocalStack isn’t running
- Docker Desktop isn’t running
- The infra stack wasn’t deployed / ALB not created
- The api-gateway task isn’t running/healthy

### Where to look
- LocalStack logs (Docker)
- CloudFormation events:

```bash
aws --endpoint-url=http://localhost:4566 cloudformation describe-stack-events --stack-name patient-management
```

## Repo layout

```
api-gateway/          # Spring Cloud Gateway edge service
auth-service/         # Auth + JWT
patient-service/      # Patient CRUD + events
billing-service/      # Billing + gRPC
analytics-service/    # Kafka consumer + reporting
infrastructure/       # AWS CDK (Java) for LocalStack
api-requests/         # HTTP requests (JetBrains)
grpc-requests/        # gRPC requests (JetBrains)
integration-tests/    # JUnit + RestAssured
```
