provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "instance" {
  bucket = var.bucket_name

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  versioning {
    enabled = true
  }

}

resource "aws_s3_bucket_object" "packages_orig_dir" {
    bucket = var.bucket_name
    key    = "packages_orig/"
    source = "/dev/null"
}
