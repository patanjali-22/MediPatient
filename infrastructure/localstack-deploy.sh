#!/bin/bash
set -euo pipefail

# Dummy AWS creds for LocalStack (no real AWS account needed)
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_SESSION_TOKEN="${AWS_SESSION_TOKEN:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

ENDPOINT_URL="${ENDPOINT_URL:-http://localhost:4566}"
STACK_NAME="${STACK_NAME:-patient-management}"
TEMPLATE_FILE="${TEMPLATE_FILE:-./cdk.out/localstack.template.json}"

dump_events() {
  aws --endpoint-url="${ENDPOINT_URL}" cloudformation describe-stack-events \
    --stack-name "${STACK_NAME}" \
    --query "StackEvents[].[Timestamp,ResourceStatus,LogicalResourceId,ResourceType,ResourceStatusReason]" \
    --output table || true
}

trap 'echo "Deploy failed. Recent CloudFormation events:"; dump_events' ERR

aws --endpoint-url="${ENDPOINT_URL}" cloudformation delete-stack \
  --stack-name "${STACK_NAME}" || true

aws --endpoint-url="${ENDPOINT_URL}" cloudformation deploy \
  --stack-name "${STACK_NAME}" \
  --template-file "${TEMPLATE_FILE}"

aws --endpoint-url="${ENDPOINT_URL}" elbv2 describe-load-balancers \
  --query "LoadBalancers[0].DNSName" --output text
