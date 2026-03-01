variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_security_group" {
  description = "ALB security group ID (created by networking module)"
  type        = string
}

variable "ecs_security_group" {
  description = "ECS security group ID (created by networking module)"
  type        = string
}

variable "container_image_backend" {
  description = "Docker image for FastAPI backend"
  type        = string
}

variable "container_image_frontend" {
  description = "Docker image for Next.js frontend"
  type        = string
}

variable "domain_name" {
  description = "Domain name for ACM certificate"
  type        = string
}

variable "rds_endpoint" {
  description = "RDS endpoint for backend config"
  type        = string
  sensitive   = true
}

variable "redis_endpoint" {
  description = "Redis endpoint for backend config"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
