variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for cache subnet group"
  type        = list(string)
}

variable "redis_security_group" {
  description = "Security group ID for Redis (created by networking module)"
  type        = string
}
