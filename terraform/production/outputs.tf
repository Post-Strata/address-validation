output "public_ip" {
  value       = aws_eip.app_eip.public_ip
  description = "Elastic IP of the EC2 instance"
}

output "public_dns" {
  value       = aws_instance.app_server.public_dns
  description = "Public DNS of the EC2 instance"
}

output "app_url" {
  value       = "https://${aws_route53_record.app_dns.name}"
  description = "URL for the Shopify app"
}

output "db_endpoint" {
  value       = aws_db_instance.app_db.endpoint
  description = "Endpoint for the RDS database"
}

output "db_name" {
  value       = aws_db_instance.app_db.db_name
  description = "Name of the database"
}

output "database_url" {
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.app_db.endpoint}/${var.db_name}"
  description = "Full database connection string for the app"
  sensitive   = true
}