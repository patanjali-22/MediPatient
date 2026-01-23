#!/bin/bash
set -euo pipefail

# AWS Deployment Script for Patient Management System
# This script deploys the application to AWS using CDK

echo "=========================================="
echo "Patient Management - AWS Deployment"
echo "=========================================="

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    if ! command -v aws &> /dev/null; then
        echo "ERROR: AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo "ERROR: Docker is not installed. Please install it first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo "ERROR: npm is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        echo "Installing AWS CDK..."
        npm install -g aws-cdk
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "ERROR: AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi

    echo "All prerequisites met!"
}

# Get AWS account info
get_aws_info() {
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    export AWS_REGION=${AWS_REGION:-us-east-1}

    echo "AWS Account: $AWS_ACCOUNT_ID"
    echo "AWS Region: $AWS_REGION"
}

# Bootstrap CDK (one-time setup)
bootstrap_cdk() {
    echo ""
    echo "Bootstrapping CDK..."
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
}

# Build and push Docker images to ECR
push_images_to_ecr() {
    echo ""
    echo "Building and pushing Docker images to ECR..."

    ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

    # Array of services
    SERVICES=("api-gateway" "auth-service" "patient-service" "billing-service" "analytics-service")

    for SERVICE in "${SERVICES[@]}"; do
        echo ""
        echo "Building $SERVICE..."

        # Build the image
        docker build -t $SERVICE:latest ../$SERVICE

        # Tag for ECR
        docker tag $SERVICE:latest $ECR_REGISTRY/patient-management/$SERVICE:latest

        # Push to ECR
        echo "Pushing $SERVICE to ECR..."
        docker push $ECR_REGISTRY/patient-management/$SERVICE:latest
    done

    echo "All images pushed to ECR!"
}

# Synthesize and deploy CDK stack
deploy_cdk_stack() {
    echo ""
    echo "Synthesizing CDK stack..."

    # Set environment variables for CDK
    export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
    export CDK_DEFAULT_REGION=$AWS_REGION

    # Compile and run the Cost-Efficient AWS stack synthesizer
    mvn clean compile -DskipTests exec:java -Dexec.mainClass=com.pm.stack.AwsStackCostEfficient

    echo ""
    echo "Deploying CDK stack to AWS..."
    cdk deploy PatientManagementStack --require-approval never
}

# Get deployment outputs
get_outputs() {
    echo ""
    echo "=========================================="
    echo "Deployment Complete!"
    echo "=========================================="

    # Get ALB DNS name
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --query "LoadBalancers[?contains(LoadBalancerName, 'Patient')].DNSName" \
        --output text 2>/dev/null || echo "Not found yet")

    echo ""
    echo "API Gateway URL: http://$ALB_DNS"
    echo ""
    echo "Test the deployment:"
    echo "  curl http://$ALB_DNS/actuator/health"
    echo ""
    echo "Login:"
    echo "  curl -X POST http://$ALB_DNS/auth/login \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"email\":\"testuser@test.com\",\"password\":\"password123\"}'"
}

# Main execution
main() {
    cd "$(dirname "$0")"

    check_prerequisites
    get_aws_info

    echo ""
    read -p "Do you want to bootstrap CDK? (first time only) [y/N]: " bootstrap
    if [[ "$bootstrap" =~ ^[Yy]$ ]]; then
        bootstrap_cdk
    fi

    echo ""
    read -p "Do you want to build and push Docker images to ECR? [Y/n]: " push_images
    if [[ ! "$push_images" =~ ^[Nn]$ ]]; then
        push_images_to_ecr
    fi

    echo ""
    read -p "Do you want to deploy the CDK stack? [Y/n]: " deploy
    if [[ ! "$deploy" =~ ^[Nn]$ ]]; then
        deploy_cdk_stack
    fi

    get_outputs
}

main "$@"
