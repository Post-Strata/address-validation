terraform {
  backend "s3" {
    bucket         = "poststrata-terraform-state"
    key            = "address-validation/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "poststrata-terraform-locks"
    encrypt        = true
  }
}
