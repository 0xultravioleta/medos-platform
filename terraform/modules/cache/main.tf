locals {
  name_prefix = "${var.project_name}-${var.environment}"
  is_prod     = var.environment == "prod"
}

# --- Subnet Group ---

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${local.name_prefix}-redis-subnet"
  }
}

# --- Dev: Single Node Cluster ---

resource "aws_elasticache_cluster" "dev" {
  count = local.is_prod ? 0 : 1

  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_security_group]

  snapshot_retention_limit = 1
  maintenance_window       = "sun:05:00-sun:06:00"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}

# --- Prod: Replication Group ---

resource "aws_elasticache_replication_group" "prod" {
  count = local.is_prod ? 1 : 0

  replication_group_id = "${local.name_prefix}-redis"
  description          = "${local.name_prefix} Redis replication group"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.r6g.large"
  parameter_group_name = "default.redis7"
  port                 = 6379

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_security_group]

  snapshot_retention_limit = 7
  snapshot_window          = "04:00-05:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}
