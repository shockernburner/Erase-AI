# Phase 2: network for eraseai-prod (110796370706).
# Applied by GitHub Actions (.github/workflows/infra.yml) with the
# eraseai-github-deploy role; state lives in the account's own bucket.
#
#   public  (2 AZ)  ALB, NAT gateway          -> internet gateway
#   app     (2 AZ)  ECS Fargate tasks         -> NAT gateway
#   db      (2 AZ)  RDS                       -> no internet route

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "network.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "network" } }
}

variable "cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "nat_per_az" {
  description = "One NAT gateway per AZ (HA, ~US$40/month each) instead of one shared"
  type        = bool
  default     = false
}

data "aws_availability_zones" "up" {
  state = "available"
}

locals {
  azs = slice(sort(data.aws_availability_zones.up.names), 0, 2)
  # /20 per subnet: public 0-1, app 2-3, db 4-5
  subnets = {
    for i, az in local.azs : az => {
      public = cidrsubnet(var.cidr, 4, i)
      app    = cidrsubnet(var.cidr, 4, 2 + i)
      db     = cidrsubnet(var.cidr, 4, 4 + i)
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "eraseai" }
}

# No rules: nothing may use the default security group.
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "eraseai-default-unused" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "eraseai" }
}

# --- Subnets ---------------------------------------------------------------

resource "aws_subnet" "public" {
  for_each          = local.subnets
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value.public
  tags              = { Name = "eraseai-public-${each.key}", Tier = "public" }
}

resource "aws_subnet" "app" {
  for_each          = local.subnets
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value.app
  tags              = { Name = "eraseai-app-${each.key}", Tier = "app" }
}

resource "aws_subnet" "db" {
  for_each          = local.subnets
  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = each.value.db
  tags              = { Name = "eraseai-db-${each.key}", Tier = "db" }
}

# --- NAT -------------------------------------------------------------------

locals {
  nat_azs = var.nat_per_az ? local.azs : [local.azs[0]]
}

resource "aws_eip" "nat" {
  for_each = toset(local.nat_azs)
  domain   = "vpc"
  tags     = { Name = "eraseai-nat-${each.key}" }
}

resource "aws_nat_gateway" "main" {
  for_each      = toset(local.nat_azs)
  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id
  tags          = { Name = "eraseai-${each.key}" }
  depends_on    = [aws_internet_gateway.main]
}

# --- Routing ---------------------------------------------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "eraseai-public" }
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "app" {
  for_each = local.subnets
  vpc_id   = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[var.nat_per_az ? each.key : local.azs[0]].id
  }
  tags = { Name = "eraseai-app-${each.key}" }
}

resource "aws_route_table_association" "app" {
  for_each       = aws_subnet.app
  subnet_id      = each.value.id
  route_table_id = aws_route_table.app[each.key].id
}

# Database subnets: local traffic only.
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "eraseai-db" }
}

resource "aws_route_table_association" "db" {
  for_each       = aws_subnet.db
  subnet_id      = each.value.id
  route_table_id = aws_route_table.db.id
}

# S3 traffic (ECR image layers, logs) stays on the AWS network, free.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.ap-southeast-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [for rt in aws_route_table.app : rt.id]
  tags              = { Name = "eraseai-s3" }
}

# --- Security groups -------------------------------------------------------

resource "aws_security_group" "alb" {
  name        = "eraseai-alb"
  description = "Public load balancer"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "eraseai-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from the internet"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from the internet (redirected to HTTPS)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_app" {
  security_group_id            = aws_security_group.alb.id
  description                  = "To the app containers"
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
  referenced_security_group_id = aws_security_group.app.id
}

resource "aws_security_group" "app" {
  name        = "eraseai-app"
  description = "ECS Fargate tasks"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "eraseai-app" }
}

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "From the load balancer"
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
  referenced_security_group_id = aws_security_group.alb.id
}

# Stripe, Resend, Google, ECR, Secrets Manager: HTTPS out through NAT.
resource "aws_vpc_security_group_egress_rule" "app_https" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS to AWS APIs and third-party services"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  description                  = "To PostgreSQL"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.db.id
}

resource "aws_security_group" "db" {
  name        = "eraseai-db"
  description = "RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "eraseai-db" }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "From the app containers"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}

# --- Flow logs -------------------------------------------------------------

resource "aws_cloudwatch_log_group" "flow" {
  name              = "/eraseai/vpc-flow-logs"
  retention_in_days = 90
}

resource "aws_iam_role" "flow" {
  name = "eraseai-vpc-flow-logs"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = "110796370706" } }
    }]
  })
}

resource "aws_iam_role_policy" "flow" {
  name = "write-flow-logs"
  role = aws_iam_role.flow.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
      Resource = "${aws_cloudwatch_log_group.flow.arn}:*"
    }]
  })
}

resource "aws_flow_log" "vpc" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow.arn
  iam_role_arn             = aws_iam_role.flow.arn
  max_aggregation_interval = 600
}

# --- Outputs (read by later stacks via terraform_remote_state) -------------

output "vpc_id" { value = aws_vpc.main.id }
output "azs" { value = local.azs }
output "public_subnet_ids" { value = [for az in local.azs : aws_subnet.public[az].id] }
output "app_subnet_ids" { value = [for az in local.azs : aws_subnet.app[az].id] }
output "db_subnet_ids" { value = [for az in local.azs : aws_subnet.db[az].id] }
output "alb_security_group_id" { value = aws_security_group.alb.id }
output "app_security_group_id" { value = aws_security_group.app.id }
output "db_security_group_id" { value = aws_security_group.db.id }
output "nat_public_ips" { value = [for e in aws_eip.nat : e.public_ip] }
