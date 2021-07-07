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

module "ddb_instance" {
  source = "./modules/ddb"
}

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "foundry-magic-l18n-acceptor"
  description   = "A Lambda function to accept a manifest URL and generate translation batches"
  handler       = "main.handler"
  runtime       = "nodejs14.x"
  timeout       = 60

  lambda_role = aws_iam_role.lambda_exec.arn
  create_role = false

  environment_variables = {
    BUCKET = module.s3_instance.bucket_name
    ROLE_ARN = aws_iam_role.lambda_exec.arn
  }

  source_path = "../app/lambdas/Acceptor"

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

resource "aws_iam_role_policy_attachment" "terraform_lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

// Attach all our custom policies to our main policy
resource "aws_iam_role_policy_attachment" "attach_pass_role_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.pass_role_policy.arn
}

resource "aws_iam_role_policy_attachment" "attach_translate_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.translate_access.arn
}

resource "aws_iam_role_policy_attachment" "attach_s3_iam_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = module.s3_instance.s3_iam_policy
}

resource "aws_iam_role_policy_attachment" "attach_ddb_iam_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = module.ddb_instance.ddb_iam_policy
}

resource "aws_iam_policy" "pass_role_policy" {
  name        = "pass_role_policy"
  description = "Allow our role to pass itself"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "iam:GetRole",
          "iam:PassRole"
        ]
        Effect   = "Allow"
        Resource = aws_iam_role.lambda_exec.arn
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
      identifiers = [
        "lambda.amazonaws.com",
        "translate.amazonaws.com"
      ]
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
   source_arn = "${aws_api_gateway_rest_api.default.execution_arn}/*"
}

output "aws_lambda_permission_apigw" {
  value = aws_lambda_permission.apigw.source_arn
}
