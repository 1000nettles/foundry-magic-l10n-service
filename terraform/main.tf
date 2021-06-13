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

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "foundry-magic-l18n"
  description   = "A Lambda function to generate localizations for Foundry systems and modules"
  handler       = "main.handler"
  runtime       = "nodejs14.x"
  
  lambda_role = aws_iam_role.lambda_exec.arn

  source_path = "../src/main.js"

  tags = {
    Name = "foundry-magic-l18n"
  }
}

 # IAM role which dictates what other AWS services the Lambda function
 # may access.
resource "aws_iam_role" "lambda_exec" {
   name = "foundry-magic-l18n-lambda"

    assume_role_policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action = "sts:AssumeRole",
          Effect = "Allow"
          Sid    = ""
          Principal = {
            Service: "lambda.amazonaws.com"
          }
        },
      ]
    })
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
