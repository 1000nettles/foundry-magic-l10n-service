terraform {
  backend "s3" {
    bucket = "1000nettles-foundry-magic-l18n-state"
    key = "./terraform.tfstate"
    region = "us-east-1"

    dynamodb_table = "1000nettles-foundry-magic-l18n-state"
    encrypt = true
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "1000nettles-foundry-magic-l18n-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

// Make sure to manually create the DynamoDB table!
