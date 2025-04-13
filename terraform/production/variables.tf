variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for all resources"
}

variable "ami_id" {
  type        = string
  default     = "ami-0440d3b780d96b29d" # Amazon Linux 2023 AMI (Update with the latest AMI ID)
  description = "AMI ID for the EC2 instance"
}

variable "instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Type of EC2 instance"
}

variable "key_name" {
  type        = string
  description = "Key pair name for SSH access"
}

variable "zone_id" {
  type        = string
  description = "Route 53 hosted zone ID for poststrata.com"
}
