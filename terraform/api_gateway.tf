resource "aws_api_gateway_rest_api" "default" {
  name = "Foundry Magic L18n API Gateway"
  description = "The default Foundry Magic L18n API Gateway"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  parent_id = aws_api_gateway_rest_api.default.root_resource_id
  path_part = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type = "AWS_PROXY"
  uri = module.lambda_function.lambda_function_invoke_arn
}

resource "aws_api_gateway_method" "proxy_root" {
   rest_api_id   = aws_api_gateway_rest_api.default.id
   resource_id   = aws_api_gateway_rest_api.default.root_resource_id
   http_method   = "ANY"
   authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_root" {
   rest_api_id = aws_api_gateway_rest_api.default.id
   resource_id = aws_api_gateway_method.proxy_root.resource_id
   http_method = aws_api_gateway_method.proxy_root.http_method

   integration_http_method = "POST"
   type                    = "AWS_PROXY"
   uri                     = module.lambda_function.lambda_function_invoke_arn
}

resource "aws_api_gateway_deployment" "default" {
   depends_on = [
     aws_api_gateway_integration.lambda,
     aws_api_gateway_integration.lambda_root,
   ]

   rest_api_id = aws_api_gateway_rest_api.default.id
}

resource "aws_api_gateway_stage" "default" {
  deployment_id = aws_api_gateway_deployment.default.id
  rest_api_id = aws_api_gateway_rest_api.default.id
  depends_on = [aws_cloudwatch_log_group.default]
  stage_name = var.manifest_stage_name
}

resource "aws_cloudwatch_log_group" "default" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.default.id}/${var.manifest_stage_name}"
  retention_in_days = 7
}

output "base_url" {
  value = aws_api_gateway_deployment.default.invoke_url
}
