provider "aws" {
  region = var.aws_region
}

# Create a VPC for our resources
resource "aws_vpc" "app_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "zip-shopify-vpc"
  }
}

# Create two subnets in different availability zones for high availability
resource "aws_subnet" "app_subnet_1" {
  vpc_id            = aws_vpc.app_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "zip-shopify-subnet-1"
  }
}

resource "aws_subnet" "app_subnet_2" {
  vpc_id            = aws_vpc.app_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "zip-shopify-subnet-2"
  }
}

# Create an internet gateway to allow access to the internet
resource "aws_internet_gateway" "app_igw" {
  vpc_id = aws_vpc.app_vpc.id

  tags = {
    Name = "zip-shopify-igw"
  }
}

# Create a route table for the VPC
resource "aws_route_table" "app_route_table" {
  vpc_id = aws_vpc.app_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app_igw.id
  }

  tags = {
    Name = "zip-shopify-route-table"
  }
}

# Associate the route table with the subnets
resource "aws_route_table_association" "app_subnet_1_association" {
  subnet_id      = aws_subnet.app_subnet_1.id
  route_table_id = aws_route_table.app_route_table.id
}

resource "aws_route_table_association" "app_subnet_2_association" {
  subnet_id      = aws_subnet.app_subnet_2.id
  route_table_id = aws_route_table.app_route_table.id
}

# Create a security group for the database
resource "aws_security_group" "db_sg" {
  name        = "zip-shopify-db-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.app_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "PostgreSQL access from app servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "zip-shopify-db-sg"
  }
}

# Create a DB subnet group
resource "aws_db_subnet_group" "app_db_subnet_group" {
  name        = "zip-shopify-db-subnet-group"
  description = "Database subnet group for Shopify app"
  subnet_ids  = [aws_subnet.app_subnet_1.id, aws_subnet.app_subnet_2.id]

  tags = {
    Name = "zip-shopify-db-subnet-group"
  }
}

# Create the RDS PostgreSQL instance
resource "aws_db_instance" "app_db" {
  identifier             = "zip-shopify-db"
  engine                 = "postgres"
  engine_version         = "14"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp2"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.app_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  multi_az               = var.db_multi_az

  tags = {
    Name = "zip-shopify-db"
  }
}

# Security group for the EC2 instance
resource "aws_security_group" "app_sg" {
  name        = "zip-shopify-sg"
  description = "Security group for Shopify app"
  vpc_id      = aws_vpc.app_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access (key-based auth only)"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 instance
resource "aws_instance" "app_server" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = aws_subnet.app_subnet_1.id
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  associate_public_ip_address = true
  
  tags = {
    Name = "zip-shopify-poststrata"
  }

  # The user_data script will set up Docker, Nginx with Let's Encrypt SSL, and create the environment file
  user_data = <<-EOF
              #!/bin/bash
              
              # Determine which Amazon Linux version we're running
              if grep -q "Amazon Linux 2" /etc/os-release; then
                # Amazon Linux 2 commands
                yum update -y
                
                # Install EPEL repository (needed for Certbot)
                amazon-linux-extras install -y epel
                
                # Install and configure Docker
                amazon-linux-extras install -y docker
                systemctl start docker
                systemctl enable docker
                usermod -a -G docker ec2-user
                
                # Install Nginx
                amazon-linux-extras install -y nginx1
                
                # Install Certbot for Let's Encrypt SSL
                yum install -y certbot python3-certbot-nginx
                
              else
                # Amazon Linux 2023 commands
                dnf update -y
                
                # Install and configure Docker
                dnf install -y docker
                systemctl start docker
                systemctl enable docker
                usermod -a -G docker ec2-user
                
                # Install Nginx and Certbot
                dnf install -y nginx certbot python3-certbot-nginx
              fi
              
              # Install Docker Compose
              curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              mkdir -p /app
              
              # Create Nginx configuration for HTTP and HTTPS
              cat > /etc/nginx/conf.d/app.conf <<NGINX
              # HTTP server - will redirect all traffic to HTTPS
              server {
                  listen 80;
                  server_name zip.shopify.poststrata.com;
                  
                  # Initially we set up proxying, but after Certbot runs
                  # these will be replaced with a redirect to HTTPS
                  location / {
                      proxy_pass http://localhost:3000;
                      proxy_http_version 1.1;
                      proxy_set_header Upgrade \$http_upgrade;
                      proxy_set_header Connection 'upgrade';
                      proxy_set_header Host \$host;
                      proxy_cache_bypass \$http_upgrade;
                      proxy_set_header X-Real-IP \$remote_addr;
                      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                      proxy_set_header X-Forwarded-Proto \$scheme;
                  }
              }
              NGINX
              
              # Enable and start Nginx
              systemctl enable nginx
              systemctl start nginx
              
              # Create a script to obtain SSL certificate after DNS propagation
              cat > /root/setup-ssl.sh <<'SSLSETUP'
              #!/bin/bash
              
              # Wait for DNS to propagate (you might need to run this script manually if DNS takes longer)
              sleep 180
              
              # Obtain SSL certificate from Let's Encrypt
              # This will also modify the Nginx config to enable HTTPS and redirect all HTTP to HTTPS
              certbot --nginx -d zip.shopify.poststrata.com --non-interactive --agree-tos --email developers@poststrata.com --redirect
              
              # Set up automatic renewal
              echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
              SSLSETUP
              
              chmod +x /root/setup-ssl.sh
              
              # Schedule the SSL setup script to run after instance startup
              echo "@reboot root /root/setup-ssl.sh" | tee -a /etc/crontab > /dev/null
              
              # Run the SSL setup script in the background
              nohup /root/setup-ssl.sh > /root/ssl-setup.log 2>&1 &
              
              # Create env file for the application
              cat > /app/.env <<EOL
              DATABASE_PROVIDER=postgresql
              DATABASE_URL=postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.app_db.endpoint}/${var.db_name}
              EOL
              EOF

  depends_on = [aws_db_instance.app_db]
}

# DNS record in Route 53
resource "aws_route53_record" "app_dns" {
  zone_id = var.zone_id
  name    = "zip.shopify.poststrata.com"
  type    = "A"
  ttl     = 300
  records = [aws_instance.app_server.public_ip]
}