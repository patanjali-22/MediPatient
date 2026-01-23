@echo off
echo Stopping all services to save costs...
aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 0
aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 0
echo.
echo All services stopped! No Fargate charges when services are stopped.
