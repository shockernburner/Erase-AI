# Phase 5: ECS Fargate cluster, the app service and its public load
# balancer (HTTPS, WAF) for eraseai-prod. Reads the network, edge and ecr
# stacks' outputs.
#
#   https://api.aws.eraseai.ai  ->  ALB (+WAF)  ->  Fargate tasks :8080


terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "app.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "app" } }
}

data "terraform_remote_state" "stack" {
  for_each = toset(["network", "edge", "ecr"])
  backend  = "s3"
  config = {
    bucket = "eraseai-tfstate-110796370706"
    key    = "${each.key}.tfstate"
    region = "ap-southeast-1"
  }
}

locals {
  net  = data.terraform_remote_state.stack["network"].outputs
  edge = data.terraform_remote_state.stack["edge"].outputs
  ecr  = data.terraform_remote_state.stack["ecr"].outputs

  api_host = "api.${local.edge.domain}"
  site_url = "https://${local.edge.domain}"
}

variable "image_tag" {
  description = "Image tag (git commit SHA) in eraseai/app; CI sets it"
  type        = string
  default     = "8cf2cf20f19bdea0c660a9989bfe7b9d9f041e25"
}

variable "desired_count" {
  description = "Minimum running tasks"
  type        = number
  default     = 1
}

variable "max_count" {
  type    = number
  default = 4
}

# Secrets Manager entries (eraseai/<NAME>) passed to the container. Only
# names whose secret has a value may be listed, or tasks fail to start.
variable "secret_names" {
  type    = list(string)
  default = ["DATABASE_URL", "SESSION_SECRET", "ADMIN_BOOTSTRAP_PASSWORD"]
}

data "aws_caller_identity" "me" {}

# --- Cluster and logs --------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "eraseai"
  setting {
    name  = "containerInsights"
    value = "enhanced"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/eraseai/app"
  retention_in_days = 90
}

# --- IAM ---------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.me.account_id]
    }
  }
}

# Used by ECS itself: pull the image, write logs, read the secrets.
resource "aws_iam_role" "execution" {
  name               = "eraseai-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "read-app-secrets"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = "arn:aws:secretsmanager:ap-southeast-1:${data.aws_caller_identity.me.account_id}:secret:eraseai/*"
    }]
  })
}

# Used by the app code. It calls no AWS APIs today, so no permissions.
resource "aws_iam_role" "task" {
  name               = "eraseai-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
}

# --- Load balancer -----------------------------------------------------------

resource "aws_lb" "main" {
  name                       = "eraseai"
  load_balancer_type         = "application"
  internal                   = false
  subnets                    = local.net.public_subnet_ids
  security_groups            = [local.net.alb_security_group_id]
  drop_invalid_header_fields = true
  idle_timeout               = 120 # 10 MB dataset uploads
  enable_deletion_protection = true
}

resource "aws_lb_target_group" "app" {
  name                 = "eraseai-app"
  port                 = 8080
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = local.net.vpc_id
  deregistration_delay = 30
  health_check {
    path                = "/api/healthz"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-2021-06"
  certificate_arn   = local.edge.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = local.edge.waf_acl_arn
}

resource "aws_route53_record" "api" {
  zone_id = local.edge.zone_id
  name    = local.api_host
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# --- Task and service --------------------------------------------------------

resource "aws_ecs_task_definition" "app" {
  family                   = "eraseai-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name                   = "app"
    image                  = "${local.ecr.repository_url}:${var.image_tag}"
    essential              = true
    readonlyRootFilesystem = false
    portMappings           = [{ containerPort = 8080, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "8080" },
      { name = "PUBLIC_BASE_URL", value = local.site_url },
      { name = "WEB_BASE_URL", value = local.site_url },
    ]
    secrets = [
      for n in var.secret_names : { name = n, valueFrom = "eraseai/${n}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = "ap-southeast-1"
        awslogs-stream-prefix = "app"
      }
    }
  }])
}

resource "aws_ecs_service" "app" {
  name                              = "eraseai-app"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.app.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 90
  propagate_tags                    = "SERVICE"

  network_configuration {
    subnets          = local.net.app_subnet_ids
    security_groups  = [local.net.app_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]
  # Autoscaling moves the count between min and max.
  lifecycle { ignore_changes = [desired_count] }
}

resource "aws_appautoscaling_target" "app" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.desired_count
  max_capacity       = var.max_count
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "eraseai-cpu"
  service_namespace  = aws_appautoscaling_target.app.service_namespace
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  policy_type        = "TargetTrackingScaling"
  target_tracking_scaling_policy_configuration {
    target_value       = 60
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# --- Outputs -----------------------------------------------------------------

output "api_url" { value = "https://${local.api_host}" }
output "alb_dns_name" { value = aws_lb.main.dns_name }
output "alb_arn_suffix" { value = aws_lb.main.arn_suffix }
output "target_group_arn_suffix" { value = aws_lb_target_group.app.arn_suffix }
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "service_name" { value = aws_ecs_service.app.name }
output "log_group" { value = aws_cloudwatch_log_group.app.name }
