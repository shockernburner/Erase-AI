# Phase 3: DNS (Route 53), TLS certificates (ACM) and the web application
# firewall (WAF) for eraseai-prod. The WAF is attached to the load balancer
# in the app stack (Phase 5).
#
# aws.eraseai.ai is a delegated subdomain: GoDaddy keeps eraseai.ai and
# holds 4 NS records for "aws" pointing at this zone.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "edge.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "edge" } }
}

variable "domain" {
  type    = string
  default = "aws.eraseai.ai"
}

# Wait until ACM has issued the certificate (needs the 4 NS records for
# "aws" at GoDaddy, added 2026-10-09).
variable "wait_for_certificate" {
  type    = bool
  default = true
}

# --- DNS -------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  name    = var.domain
  comment = "EraseAI on AWS (delegated from GoDaddy)"
}

# Only Amazon may issue certificates for this zone.
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "CAA"
  ttl     = 3600
  records = ["0 issue \"amazon.com\"", "0 issuewild \"amazon.com\""]
}

# --- Certificate -----------------------------------------------------------

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}

# ACM gives the apex and the wildcard the same validation record, so one
# record (from the apex entry) validates both names.
locals {
  cert_dvo = one([for o in aws_acm_certificate.main.domain_validation_options : o if o.domain_name == var.domain])
}

resource "aws_route53_record" "cert_validation" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = local.cert_dvo.resource_record_name
  type            = local.cert_dvo.resource_record_type
  ttl             = 300
  records         = [local.cert_dvo.resource_record_value]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  count                   = var.wait_for_certificate ? 1 : 0
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [aws_route53_record.cert_validation.fqdn]
  timeouts { create = "45m" }
}

# --- WAF -------------------------------------------------------------------

resource "aws_wafv2_web_acl" "main" {
  name        = "eraseai"
  description = "EraseAI load balancer"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Per-IP limit: 2,000 requests per 5 minutes.
  rule {
    name     = "rate-limit"
    priority = 0
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "eraseai-rate-limit"
    }
  }

  rule {
    name     = "aws-ip-reputation"
    priority = 10
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "eraseai-ip-reputation"
    }
  }

  rule {
    name     = "aws-common"
    priority = 20
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
        # Dataset uploads (CSV/JSON up to 10 MB) exceed the 8 KB body rule.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "eraseai-common"
    }
  }

  rule {
    name     = "aws-known-bad-inputs"
    priority = 30
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "eraseai-known-bad-inputs"
    }
  }

  rule {
    name     = "aws-sqli"
    priority = 40
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "eraseai-sqli"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "eraseai"
  }
}

# WAF log group names must start with "aws-waf-logs-".
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-eraseai"
  retention_in_days = 90
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  redacted_fields {
    single_header { name = "authorization" }
  }
  redacted_fields {
    single_header { name = "cookie" }
  }
}

# --- Outputs ---------------------------------------------------------------

output "zone_id" { value = aws_route53_zone.main.zone_id }
output "domain" { value = var.domain }
output "name_servers" { value = aws_route53_zone.main.name_servers }
output "certificate_arn" { value = aws_acm_certificate.main.arn }
output "certificate_status" { value = aws_acm_certificate.main.status }
output "waf_acl_arn" { value = aws_wafv2_web_acl.main.arn }
