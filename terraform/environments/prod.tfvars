environment          = "prod"
project_name         = "medos"
aws_region           = "us-east-1"
domain_name          = "app.medos.health"
db_instance_class    = "db.r6g.large"
db_allocated_storage = 100

container_image_backend  = "YOUR_ECR_REPO/medos-backend:latest"
container_image_frontend = "YOUR_ECR_REPO/medos-frontend:latest"

state_bucket_name = "medos-terraform-state-prod"
state_lock_table  = "medos-terraform-locks-prod"
