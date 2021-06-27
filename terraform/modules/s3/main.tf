resource "aws_s3_bucket" "instance" {
  bucket = var.bucket_name

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  versioning {
    enabled = false
  }

  lifecycle_rule {
    id      = "expire"
    enabled = true

    expiration {
      days = 1
    }
  }
}

resource "aws_s3_bucket_object" "packages_orig_dir" {
    bucket = var.bucket_name
    key    = "packages_orig/"
    source = "/dev/null"
}

resource "aws_iam_policy" "s3_access" {
  name        = "s3_access_policy"
  description = "Access all of the dedicated S3 instance"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:*",
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

output "bucket_name" {
  value = var.bucket_name
}

output "s3_iam_policy" {
  value = aws_iam_policy.s3_access.arn
}
