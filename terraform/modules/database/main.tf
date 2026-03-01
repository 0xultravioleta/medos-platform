locals {
  name_prefix = "${var.project_name}-${var.environment}"
  is_prod     = var.environment == "prod"
}

# --- KMS Key for RDS Encryption ---

resource "aws_kms_key" "rds" {
  description             = "KMS key for ${local.name_prefix} RDS encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "${local.name_prefix}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# --- DB Subnet Group ---

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet"
  }
}

# --- Parameter Group (pgvector) ---

resource "aws_db_parameter_group" "postgres17" {
  name   = "${local.name_prefix}-pg17"
  family = "postgres17"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,pgvector"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${local.name_prefix}-pg17-params"
  }
}

# --- RDS PostgreSQL 17 ---

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = local.is_prod ? var.allocated_storage * 4 : var.allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = "${var.project_name}_${var.environment}"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group]
  parameter_group_name   = aws_db_parameter_group.postgres17.name

  multi_az            = local.is_prod
  publicly_accessible = false

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"
  skip_final_snapshot       = false
  copy_tags_to_snapshot     = true

  deletion_protection = local.is_prod
  apply_immediately   = !local.is_prod

  performance_insights_enabled    = local.is_prod
  performance_insights_kms_key_id = local.is_prod ? aws_kms_key.rds.arn : null

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}
