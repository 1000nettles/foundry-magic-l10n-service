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

  tags = {
    Name = "ddb-translations"
    Environment = "staging"
  }
}
