# AWS Deployment Script for Patient Management System (PowerShell)
# This script deploys the application to AWS using CDK

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Patient Management - AWS Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check prerequisites
function Test-Prerequisites {
    Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

    # Check AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: AWS CLI is not installed. Please install it first." -ForegroundColor Red
        exit 1
    }

    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Docker is not installed. Please install it first." -ForegroundColor Red
        exit 1
    }

    # Check npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: npm is not installed. Please install Node.js first." -ForegroundColor Red
        exit 1
    }

    # Check/Install CDK
    if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
        Write-Host "Installing AWS CDK..." -ForegroundColor Yellow
        npm install -g aws-cdk
    }

    # Check AWS credentials
    try {
        aws sts get-caller-identity | Out-Null
    } catch {
        Write-Host "ERROR: AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
        exit 1
    }

    Write-Host "All prerequisites met!" -ForegroundColor Green
}

# Get AWS account info
function Get-AwsInfo {
    $script:AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    $script:AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

    Write-Host "`nAWS Account: $AWS_ACCOUNT_ID" -ForegroundColor Cyan
    Write-Host "AWS Region: $AWS_REGION" -ForegroundColor Cyan
}

# Bootstrap CDK
function Initialize-Cdk {
    Write-Host "`nBootstrapping CDK..." -ForegroundColor Yellow
    cdk bootstrap "aws://$AWS_ACCOUNT_ID/$AWS_REGION"
}

# Build and push Docker images to ECR
function Push-ImagesToEcr {
    Write-Host "`nBuilding and pushing Docker images to ECR..." -ForegroundColor Yellow

    $ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    # Login to ECR
    Write-Host "Logging into ECR..." -ForegroundColor Yellow
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

    # Services to build and push
    $services = @("api-gateway", "auth-service", "patient-service", "billing-service", "analytics-service")

    foreach ($service in $services) {
        Write-Host "`nBuilding $service..." -ForegroundColor Yellow

        # Build the image
        docker build -t "${service}:latest" "../$service"

        # Tag for ECR
        docker tag "${service}:latest" "$ECR_REGISTRY/patient-management/${service}:latest"

        # Push to ECR
        Write-Host "Pushing $service to ECR..." -ForegroundColor Yellow
        docker push "$ECR_REGISTRY/patient-management/${service}:latest"
    }

    Write-Host "`nAll images pushed to ECR!" -ForegroundColor Green
}

# Deploy CDK stack
function Deploy-CdkStack {
    Write-Host "`nSynthesizing CDK stack..." -ForegroundColor Yellow

    # Set environment variables
    $env:CDK_DEFAULT_ACCOUNT = $AWS_ACCOUNT_ID
    $env:CDK_DEFAULT_REGION = $AWS_REGION

    # Compile and synthesize (Cost-Efficient Stack)
    mvn clean compile -DskipTests exec:java "-Dexec.mainClass=com.pm.stack.AwsStackCostEfficient"

    Write-Host "`nDeploying CDK stack to AWS..." -ForegroundColor Yellow
    cdk deploy PatientManagementStack --require-approval never
}

# Get deployment outputs
function Get-DeploymentOutputs {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "Deployment Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green

    # Get ALB DNS name
    try {
        $ALB_DNS = aws elbv2 describe-load-balancers `
            --query "LoadBalancers[?contains(LoadBalancerName, 'Patient')].DNSName" `
            --output text
    } catch {
        $ALB_DNS = "Not found yet"
    }

    Write-Host "`nAPI Gateway URL: http://$ALB_DNS" -ForegroundColor Cyan
    Write-Host "`nTest the deployment:" -ForegroundColor Yellow
    Write-Host "  curl http://$ALB_DNS/actuator/health" -ForegroundColor White
    Write-Host "`nLogin:" -ForegroundColor Yellow
    Write-Host "  Invoke-RestMethod -Uri 'http://$ALB_DNS/auth/login' -Method POST -ContentType 'application/json' -Body '{`"email`":`"testuser@test.com`",`"password`":`"password123`"}'" -ForegroundColor White
}

# Main execution
function Main {
    Set-Location $PSScriptRoot

    Test-Prerequisites
    Get-AwsInfo

    $bootstrap = Read-Host "`nDo you want to bootstrap CDK? (first time only) [y/N]"
    if ($bootstrap -match "^[Yy]$") {
        Initialize-Cdk
    }

    $pushImages = Read-Host "`nDo you want to build and push Docker images to ECR? [Y/n]"
    if ($pushImages -notmatch "^[Nn]$") {
        Push-ImagesToEcr
    }

    $deploy = Read-Host "`nDo you want to deploy the CDK stack? [Y/n]"
    if ($deploy -notmatch "^[Nn]$") {
        Deploy-CdkStack
    }

    Get-DeploymentOutputs
}

Main
