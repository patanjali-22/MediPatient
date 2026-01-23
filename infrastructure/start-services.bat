@echo off
echo Starting all services...
aws ecs update-service --cluster patient-management-cluster --service auth-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service patient-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service billing-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service analytics-service --desired-count 1
aws ecs update-service --cluster patient-management-cluster --service api-gateway --desired-count 1
echo.
echo All services started! Wait 2-3 minutes for them to become healthy.
echo Test at: http://patient-mgmt-alb-2039385279.us-east-1.elb.amazonaws.com/actuator/health
