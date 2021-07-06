resource "aws_dynamodb_table" "translations" {
  name = "Translations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "SourceText"
  range_key = "Target"

  attribute {
    name = "SourceText"
    type = "S"
  }

  attribute {
    name = "Target"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "ddb-translations"
    Environment = "staging"
  }
}

resource "aws_dynamodb_table" "translations_jobs" {
  name = "TranslationsJobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "ID"

  attribute {
    name = "ID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "ddb-translations-jobs"
    Environment = "staging"
  }
}

resource "aws_iam_policy" "ddb_access" {
  name        = "ddb_access_policy"
  description = "Access the Translations table within DynamoDB"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid: "DDBTranslationsTableFullAccess"
        Action = [
          "dynamodb:*",
        ]
        Effect   = "Allow"
        Resource = [
          aws_dynamodb_table.translations.arn,
          aws_dynamodb_table.translations_jobs.arn
        ]
      }
    ]
  })
}

output "tables" {
  value = [
    aws_dynamodb_table.translations.arn,
    aws_dynamodb_table.translations_jobs.arn
  ]
}

output "ddb_iam_policy" {
  value = aws_iam_policy.ddb_access.arn
}
