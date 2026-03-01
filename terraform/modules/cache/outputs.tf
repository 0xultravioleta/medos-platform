output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = local.is_prod ? aws_elasticache_replication_group.prod[0].primary_endpoint_address : aws_elasticache_cluster.dev[0].cache_nodes[0].address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}
