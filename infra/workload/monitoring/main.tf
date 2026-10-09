# Phase 9: monitoring, alerting and security services for eraseai-prod.
# CloudWatch alarms -> SNS email, one dashboard, GuardDuty, Security Hub
# (AWS Foundational Security Best Practices). ALB access logs are set up in
# the app stack.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "monitoring.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "monitoring" } }
}

data "terraform_remote_state" "app" {
  backend = "s3"
  config = {
    bucket = "eraseai-tfstate-110796370706"
    key    = "app.tfstate"
    region = "ap-southeast-1"
  }
}

variable "alert_email" {
  description = "Receives alarm emails (confirm the SNS subscription email once)"
  type        = string
  default     = "firdous.mahmood26@gmail.com"
}

locals {
  app     = data.terraform_remote_state.app.outputs
  alb     = local.app.alb_arn_suffix
  tg      = local.app.target_group_arn_suffix
  cluster = local.app.cluster_name
  service = local.app.service_name
  db      = "eraseai"
  region  = "ap-southeast-1"
}

# --- Alerts ------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name = "eraseai-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  # name => alarm definition
  alarms = {
    alb-5xx = {
      description = "Load balancer or app returned more than 10 server errors in 5 minutes"
      namespace   = "AWS/ApplicationELB", metric = "HTTPCode_Target_5XX_Count", stat = "Sum"
      dimensions  = { LoadBalancer = local.alb }, threshold = 10, op = "GreaterThanThreshold", periods = 1, missing = "notBreaching"
    }
    alb-latency = {
      description = "p95 response time above 2 seconds for 15 minutes"
      namespace   = "AWS/ApplicationELB", metric = "TargetResponseTime", stat = "p95"
      dimensions  = { LoadBalancer = local.alb }, threshold = 2, op = "GreaterThanThreshold", periods = 3, missing = "notBreaching"
    }
    unhealthy-targets = {
      description = "An app container is failing load balancer health checks"
      namespace   = "AWS/ApplicationELB", metric = "UnHealthyHostCount", stat = "Maximum"
      dimensions  = { LoadBalancer = local.alb, TargetGroup = local.tg }, threshold = 0, op = "GreaterThanThreshold", periods = 2, missing = "notBreaching"
    }
    no-healthy-targets = {
      description = "No healthy app container behind the load balancer: site is down"
      namespace   = "AWS/ApplicationELB", metric = "HealthyHostCount", stat = "Minimum"
      dimensions  = { LoadBalancer = local.alb, TargetGroup = local.tg }, threshold = 1, op = "LessThanThreshold", periods = 2, missing = "breaching"
    }
    ecs-cpu = {
      description = "App containers above 85% CPU for 15 minutes"
      namespace   = "AWS/ECS", metric = "CPUUtilization", stat = "Average"
      dimensions  = { ClusterName = local.cluster, ServiceName = local.service }, threshold = 85, op = "GreaterThanThreshold", periods = 3, missing = "notBreaching"
    }
    ecs-memory = {
      description = "App containers above 85% memory for 15 minutes"
      namespace   = "AWS/ECS", metric = "MemoryUtilization", stat = "Average"
      dimensions  = { ClusterName = local.cluster, ServiceName = local.service }, threshold = 85, op = "GreaterThanThreshold", periods = 3, missing = "notBreaching"
    }
    rds-cpu = {
      description = "Database above 80% CPU for 15 minutes"
      namespace   = "AWS/RDS", metric = "CPUUtilization", stat = "Average"
      dimensions  = { DBInstanceIdentifier = local.db }, threshold = 80, op = "GreaterThanThreshold", periods = 3, missing = "notBreaching"
    }
    rds-storage = {
      description = "Database free storage below 4 GB"
      namespace   = "AWS/RDS", metric = "FreeStorageSpace", stat = "Minimum"
      dimensions  = { DBInstanceIdentifier = local.db }, threshold = 4294967296, op = "LessThanThreshold", periods = 1, missing = "notBreaching"
    }
    rds-memory = {
      description = "Database freeable memory below 150 MB for 15 minutes"
      namespace   = "AWS/RDS", metric = "FreeableMemory", stat = "Minimum"
      dimensions  = { DBInstanceIdentifier = local.db }, threshold = 157286400, op = "LessThanThreshold", periods = 3, missing = "notBreaching"
    }
    waf-blocked-spike = {
      description = "WAF blocked more than 500 requests in 5 minutes (possible attack)"
      namespace   = "AWS/WAFV2", metric = "BlockedRequests", stat = "Sum"
      dimensions  = { WebACL = "eraseai", Region = local.region, Rule = "ALL" }, threshold = 500, op = "GreaterThanThreshold", periods = 1, missing = "notBreaching"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "this" {
  for_each            = local.alarms
  alarm_name          = "eraseai-${each.key}"
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  dimensions          = each.value.dimensions
  statistic           = contains(["Sum", "Average", "Minimum", "Maximum"], each.value.stat) ? each.value.stat : null
  extended_statistic  = contains(["Sum", "Average", "Minimum", "Maximum"], each.value.stat) ? null : each.value.stat
  period              = 300
  evaluation_periods  = each.value.periods
  threshold           = each.value.threshold
  comparison_operator = each.value.op
  treat_missing_data  = each.value.missing
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# --- Dashboard ---------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "eraseai"
  dashboard_body = jsonencode({
    widgets = [
      for i, w in [
        { title = "Requests and errors", metrics = [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", local.alb, { stat = "Sum" }],
          [".", "HTTPCode_Target_5XX_Count", ".", ".", { stat = "Sum" }],
          [".", "HTTPCode_Target_4XX_Count", ".", ".", { stat = "Sum" }],
        ] },
        { title = "Response time (p50 / p95)", metrics = [
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", local.alb, { stat = "p50" }],
          ["...", { stat = "p95" }],
        ] },
        { title = "App containers: CPU and memory %", metrics = [
          ["AWS/ECS", "CPUUtilization", "ClusterName", local.cluster, "ServiceName", local.service],
          [".", "MemoryUtilization", ".", ".", ".", "."],
        ] },
        { title = "Healthy app containers", metrics = [
          ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", local.tg, "LoadBalancer", local.alb, { stat = "Minimum" }],
        ] },
        { title = "Database CPU % and connections", metrics = [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", local.db],
          [".", "DatabaseConnections", ".", ".", { yAxis = "right" }],
        ] },
        { title = "WAF allowed / blocked", metrics = [
          ["AWS/WAFV2", "AllowedRequests", "WebACL", "eraseai", "Region", local.region, "Rule", "ALL", { stat = "Sum" }],
          [".", "BlockedRequests", ".", ".", ".", ".", ".", ".", { stat = "Sum" }],
        ] },
        ] : {
        type   = "metric"
        x      = (i % 2) * 12
        y      = floor(i / 2) * 6
        width  = 12
        height = 6
        properties = {
          title   = w.title
          metrics = w.metrics
          region  = local.region
          period  = 300
          view    = "timeSeries"
          stacked = false
        }
      }
    ]
  })
}

# --- Threat detection and security posture ----------------------------------

resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

resource "aws_guardduty_detector_feature" "s3" {
  detector_id = aws_guardduty_detector.main.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "rds" {
  detector_id = aws_guardduty_detector.main.id
  name        = "RDS_LOGIN_EVENTS"
  status      = "ENABLED"
}

# High and critical GuardDuty findings are emailed.
resource "aws_cloudwatch_event_rule" "guardduty" {
  name        = "eraseai-guardduty-high"
  description = "GuardDuty findings with severity 7 or higher"
  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
    detail        = { severity = [{ numeric = [">=", 7] }] }
  })
}

resource "aws_cloudwatch_event_target" "guardduty" {
  rule = aws_cloudwatch_event_rule.guardduty.name
  arn  = aws_sns_topic.alerts.arn
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EventBridge"
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.alerts.arn
      },
      {
        Sid       = "CloudWatchAlarms"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.alerts.arn
        Condition = { StringEquals = { "aws:SourceAccount" = "110796370706" } }
      },
    ]
  })
}

resource "aws_securityhub_account" "main" {
  enable_default_standards = false
}

resource "aws_securityhub_standards_subscription" "fsbp" {
  standards_arn = "arn:aws:securityhub:${local.region}::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}

output "alerts_topic_arn" { value = aws_sns_topic.alerts.arn }
output "dashboard" { value = "https://${local.region}.console.aws.amazon.com/cloudwatch/home?region=${local.region}#dashboards/dashboard/eraseai" }
output "guardduty_detector_id" { value = aws_guardduty_detector.main.id }
