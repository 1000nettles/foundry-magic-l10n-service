provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "orig_modules" {
  bucket = "1000nettles-foundry-magic-l18n-orig-modules"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  versioning {
    enabled = true
  }

}
