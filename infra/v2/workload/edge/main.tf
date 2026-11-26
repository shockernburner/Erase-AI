# v2 DNS (Route 53) and TLS certificate (ACM) for eraseai-prod (checklist
# item 3). The web application firewall lives in the app stack, so pausing
# can remove it together with the load balancer.
#
# aws.eraseai.ai is a delegated subdomain: GoDaddy keeps eraseai.ai and
# holds 4 NS records for "aws" pointing at this zone.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    # bucket: passed with -backend-config (eraseai-tfstate-<account>)
    key          = "edge.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = [var.account_id]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-edge" } }
}

# Common v2 inputs (set by .github/workflows/aws-v2.yml).
variable "account_id" {
  description = "eraseai-prod account ID in the v2 organization"
  type        = string
}

variable "state_bucket" {
  description = "Terraform state bucket in eraseai-prod"
  type        = string
}

variable "paused" {
  description = "Paused: nothing runs and paid idle resources are removed"
  type        = bool
  default     = true
}

variable "domain" {
  type    = string
  default = "aws.eraseai.ai"
}

# Wait until ACM has issued the certificate. Needs the 4 NS records for
# "aws" at GoDaddy to point at this zone; the pipeline sets this to true
# once public DNS shows the delegation.
variable "wait_for_certificate" {
  type    = bool
  default = false
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

# --- Outputs ---------------------------------------------------------------

output "zone_id" { value = aws_route53_zone.main.zone_id }
output "domain" { value = var.domain }
output "name_servers" { value = aws_route53_zone.main.name_servers }
output "certificate_arn" { value = aws_acm_certificate.main.arn }
output "certificate_status" { value = aws_acm_certificate.main.status }
