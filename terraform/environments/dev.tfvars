environment          = "dev"
project_name         = "medos"
aws_region           = "us-east-1"
domain_name          = "dev.medos.health"
db_instance_class    = "db.t3.medium"
db_allocated_storage = 20

container_image_backend  = "YOUR_ECR_REPO/medos-backend:latest"
container_image_frontend = "YOUR_ECR_REPO/medos-frontend:latest"

state_bucket_name = "medos-terraform-state-dev"
state_lock_table  = "medos-terraform-locks-dev"
