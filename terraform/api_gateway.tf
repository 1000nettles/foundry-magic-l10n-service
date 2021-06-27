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

resource "aws_api_gateway_method" "localize_get" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_resource.localize.id
  http_method = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  resource_id = aws_api_gateway_method.localize_get.resource_id
  http_method = aws_api_gateway_method.localize_get.http_method

  integration_http_method = "POST"
  type = "AWS_PROXY"
  uri = module.lambda_function.lambda_function_invoke_arn
}

resource "aws_api_gateway_deployment" "default" {
   depends_on = [
     aws_api_gateway_integration.lambda,
   ]

   rest_api_id = aws_api_gateway_rest_api.default.id
}

resource "aws_api_gateway_stage" "default" {
  deployment_id = aws_api_gateway_deployment.default.id
  rest_api_id = aws_api_gateway_rest_api.default.id
  depends_on = [aws_cloudwatch_log_group.default]
  stage_name = var.localize_stage_name
}

/*resource "aws_api_gateway_method_settings" "default" {
  rest_api_id = aws_api_gateway_rest_api.default.id
  stage_name  = aws_api_gateway_stage.default.stage_name
  method_path = "localize/GET"

  settings {
    caching_enabled = true
    cache_ttl_in_seconds = 600
  }
}*/

resource "aws_cloudwatch_log_group" "default" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.default.id}/${var.localize_stage_name}"
  retention_in_days = 7
}

output "base_url" {
  value = aws_api_gateway_deployment.default.invoke_url
}
