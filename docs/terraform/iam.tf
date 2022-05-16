resource "aws_iam_user" "pricing" {
  force_destroy = false
  name          = "pricing"
  path          = "/"
}

resource "aws_iam_user_policy_attachment" "pricing" {
  user       = aws_iam_user.pricing.name
  policy_arn = aws_iam_policy.ec2_pricing.arn
}

resource "aws_iam_policy" "ec2_pricing" {
  name        = "ec2_pricing"
  description = "allow access to ec2 instance types and pricing information"
  path        = "/"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeRegions",
          "pricing:*"
        ],
        Resource = "*"
      }
    ]
  })
  tags = {
    Terraformed = "true"
  }
}
