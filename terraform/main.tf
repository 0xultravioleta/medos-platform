terraform {
  backend "s3" {
    bucket         = "medos-terraform-state"
    key            = "medos/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medos-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      HIPAA       = "true"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# --- Networking (VPC, Subnets, Security Groups) ---
module "networking" {
  source = "./modules/networking"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
}

# --- Database (PostgreSQL 17 + pgvector) ---
module "database" {
  source = "./modules/database"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  rds_security_group = module.networking.rds_security_group_id
  db_instance_class  = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  db_username        = var.db_username
  db_password        = var.db_password
}

# --- Cache (Redis 7) ---
module "cache" {
  source = "./modules/cache"

  project_name         = var.project_name
  environment          = var.environment
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  redis_security_group = module.networking.redis_security_group_id
}

# --- ECS Fargate ---
module "ecs" {
  source = "./modules/ecs"

  project_name             = var.project_name
  environment              = var.environment
  aws_region               = var.aws_region
  vpc_id                   = module.networking.vpc_id
  public_subnet_ids        = module.networking.public_subnet_ids
  private_subnet_ids       = module.networking.private_subnet_ids
  alb_security_group       = module.networking.alb_security_group_id
  ecs_security_group       = module.networking.ecs_security_group_id
  container_image_backend  = var.container_image_backend
  container_image_frontend = var.container_image_frontend
  domain_name              = var.domain_name
  rds_endpoint             = module.database.rds_endpoint
  redis_endpoint           = module.cache.redis_endpoint
  db_username              = var.db_username
  db_password              = var.db_password
}
