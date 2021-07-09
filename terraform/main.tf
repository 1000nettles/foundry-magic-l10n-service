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

module "lambda_function_acceptor" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "foundry-magic-l10n-acceptor"
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
    Name = "foundry-magic-l10n"
  }
}

module "lambda_function_retriever" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "foundry-magic-l10n-retriever"
  description   = "A Lambda function to retrieve the translations, if completed"
  handler       = "main.handler"
  runtime       = "nodejs14.x"
  timeout       = 60

  lambda_role = aws_iam_role.lambda_exec.arn
  create_role = false

  environment_variables = {
    BUCKET = module.s3_instance.bucket_name
    ROLE_ARN = aws_iam_role.lambda_exec.arn
  }

  source_path = "../app/lambdas/Retriever"

  tags = {
    Name = "foundry-magic-l10n"
  }
}

 # IAM role which dictates what other AWS services the Lambda function
 # may access.
resource "aws_iam_role" "lambda_exec" {
  name = "foundry-magic-l10n-lambda-exec"
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

resource "aws_lambda_permission" "apigw_permission_acceptor" {
   statement_id  = "AllowAPIGatewayInvoke"
   action        = "lambda:InvokeFunction"
   function_name = module.lambda_function_acceptor.lambda_function_name
   principal     = "apigateway.amazonaws.com"

   # The "/*/*" portion grants access from any method on any resource
   # within the API Gateway REST API.
   source_arn = "${aws_api_gateway_rest_api.default.execution_arn}/*"
}

resource "aws_lambda_permission" "apigw_permission_retriever" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function_retriever.lambda_function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.default.execution_arn}/*"
}

output "lambda_exec_role" {
  value = aws_iam_role.lambda_exec.arn
}
