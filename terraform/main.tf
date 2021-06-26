terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "s3_instance" {
  source = "./modules/s3"
}

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "foundry-magic-l18n"
  description   = "A Lambda function to generate localizations for Foundry systems and modules"
  handler       = "main.handler"
  runtime       = "nodejs14.x"
  timeout       = 60

  attach_policies = true
  number_of_policies = 3
  policies = [
    module.s3_instance.s3_iam_policy,
    aws_iam_policy.translate_access.arn,
    aws_iam_policy.ddb_access.arn,
  ]

  source_path = "../app"

  tags = {
    Name = "foundry-magic-l18n"
  }
}

 # IAM role which dictates what other AWS services the Lambda function
 # may access.
resource "aws_iam_role" "lambda_exec" {
   name = "foundry-magic-l18n-lambda-exec"
   assume_role_policy  = data.aws_iam_policy_document.instance_assume_role_policy.json
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
        Resource = aws_dynamodb_table.translations.arn
      }
    ]
  })
}

resource "aws_iam_policy" "translate_access" {
  name        = "translate_access_policy"
  description = "Access all functionality of AWS Translate"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "translate:*",
          "comprehend:DetectDominantLanguage",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

data "aws_iam_policy_document" "instance_assume_role_policy" {
  statement {
    sid = "AssumeRole"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}


resource "aws_lambda_permission" "apigw" {
   statement_id  = "AllowAPIGatewayInvoke"
   action        = "lambda:InvokeFunction"
   function_name = module.lambda_function.lambda_function_name
   principal     = "apigateway.amazonaws.com"

   # The "/*/*" portion grants access from any method on any resource
   # within the API Gateway REST API.
   source_arn = "${aws_api_gateway_rest_api.default.execution_arn}/*/*"
}
