resource "aws_dynamodb_table" "instance" {
  name = "FoundryMagicL18n"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "ddb-foundry-magic-l18n"
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
          aws_dynamodb_table.instance.arn
        ]
      }
    ]
  })
}

output "tables" {
  value = [
    aws_dynamodb_table.instance.arn
  ]
}

output "ddb_iam_policy" {
  value = aws_iam_policy.ddb_access.arn
}
