# Production Deployment Guide

This guide explains how to deploy the infrastructure manually and set up the application deployment via GitHub Actions.

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Terraform installed locally
3. Access to the GitHub repository settings to add secrets

## Infrastructure Deployment Steps

### 1. Set up Terraform variables

Create a `terraform.tfvars` file in the production directory with the following content:

```
aws_region = "us-east-1"
key_name = "your-ssh-key-name"
zone_id = "your-route53-zone-id"
db_username = "dbusername"
db_password = "secure-password"
db_name = "addressvalidation"
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_multi_az = false
```

### 2. Initialize and apply Terraform

```bash
cd terraform/production
terraform init
terraform plan
terraform apply
```

### 3. Collect the outputs

After Terraform completes, note the following outputs:
- `public_ip`: EC2 instance IP address
- `db_endpoint`: Database endpoint
- `database_url`: Full database connection string

## GitHub Actions Setup

Add the following secrets to your GitHub repository:

1. `EC2_SSH_PRIVATE_KEY`: The private SSH key for accessing your EC2 instance
2. `EC2_HOST`: The public IP or DNS of your EC2 instance
3. `EC2_USERNAME`: The username for SSH access (typically `ec2-user`)
4. `DATABASE_URL`: The database connection string from Terraform output
5. `SHOPIFY_API_KEY`: Your Shopify API key
6. `SHOPIFY_API_SECRET`: Your Shopify API secret
7. `SHOPIFY_APP_URL`: Your application URL (e.g., "https://zip.shopify.poststrata.com")
8. `SHOPIFY_APP_SCOPES`: Required scopes (e.g., "write_products,write_customers,write_orders")
9. `USPS_CONSUMER_KEY`: Your USPS API key
10. `USPS_CONSUMER_SECRET`: Your USPS Consumer ID

## Manual EC2 Setup

If you need to manually prepare the EC2 instance:

1. SSH into the instance:
   ```
   ssh -i your-key.pem ec2-user@public-ip
   ```

2. Install Docker and Docker Compose:
   ```
   sudo yum update -y
   sudo amazon-linux-extras install docker -y
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. Set up Node.js:
   ```
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

4. Create a systemd service:
   ```
   sudo vim /etc/systemd/system/address-validation.service
   ```

   ```
   [Unit]
   Description=Address Validation Shopify App
   After=network.target
   
   [Service]
   Type=simple
   User=ec2-user
   WorkingDirectory=/home/ec2-user/current
   ExecStart=/home/ec2-user/.nvm/versions/node/v18.18.1/bin/npm run start
   Restart=always
   Environment=NODE_ENV=production
   
   [Install]
   WantedBy=multi-user.target
   ```

   ```
   sudo systemctl daemon-reload
   sudo systemctl enable address-validation
   ```

## Troubleshooting

1. **Database Connection Issues**:
   - Check that the security group allows traffic from the EC2 instance to RDS on port 5432
   - Verify the DATABASE_URL environment variable is correctly set

2. **Deployment Failures**:
   - Check GitHub Actions logs for details
   - SSH into the instance and check application logs: `journalctl -u address-validation.service`

3. **Application not accessible**:
   - Verify Route 53 record is pointing to the correct IP
   - Check that the security group allows inbound traffic on ports 80 and 443