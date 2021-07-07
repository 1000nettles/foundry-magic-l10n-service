resource "aws_api_gateway_account" "default" {
  cloudwatch_role_arn = aws_iam_role.cloudwatch.arn
}

resource "aws_iam_role" "cloudwatch" {
  name = "api_gateway_cloudwatch_global"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "cloudwatch" {
  name = "default"
  role = aws_iam_role.cloudwatch.id

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_api_gateway_rest_api" "default" {
  name = "Foundry Magic L18n API Gateway"
  description = "The default Foundry Magic L18n API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "localize" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  parent_id = aws_api_gateway_rest_api.default.root_resource_id
  path_part = "localize"
}

resource "aws_api_gateway_resource" "retrieve" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  parent_id = aws_api_gateway_rest_api.default.root_resource_id
  path_part = "retrieve"
}

resource "aws_api_gateway_method" "localize_get" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_resource.localize.id
  http_method = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "retrieve_get" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_resource.retrieve.id
  http_method = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_acceptor" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_method.localize_get.resource_id
  http_method = aws_api_gateway_method.localize_get.http_method

  integration_http_method = "POST"
  type = "AWS_PROXY"
  uri = module.lambda_function_acceptor.lambda_function_invoke_arn
}

resource "aws_api_gateway_integration" "lambda_retriever" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_method.retrieve_get.resource_id
  http_method = aws_api_gateway_method.retrieve_get.http_method

  integration_http_method = "POST"
  type = "AWS_PROXY"
  uri = module.lambda_function_retriever.lambda_function_invoke_arn
}

resource "aws_api_gateway_deployment" "default" {
   depends_on = [
     aws_api_gateway_integration.lambda_acceptor,
     aws_api_gateway_integration.lambda_retriever,
   ]

   rest_api_id = aws_api_gateway_rest_api.default.id
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.default.id
  rest_api_id = aws_api_gateway_rest_api.default.id
  depends_on = [aws_cloudwatch_log_group.default]
  stage_name = var.staging_stage_name
}

resource "aws_api_gateway_method_settings" "localize" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  method_path = "localize/GET"

  settings {
    metrics_enabled = true
    data_trace_enabled = true
    logging_level = "INFO"
  }
}

resource "aws_api_gateway_method_settings" "retrieve" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  stage_name  = aws_api_gateway_stage.stage.stage_name
  method_path = "retrieve/GET"

  settings {
    metrics_enabled = true
    data_trace_enabled = true
    logging_level = "INFO"
  }
}

resource "aws_cloudwatch_log_group" "default" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.default.id}/${var.staging_stage_name}"
  retention_in_days = 7
}

output "base_url" {
  value = aws_api_gateway_deployment.default.invoke_url
}
