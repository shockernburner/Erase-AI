# v2: the website on AWS Amplify Hosting (checklist item 7).
# Amplify serves the static React build; /api/* is proxied to the ALB
# (api.aws.eraseai.ai) so the browser sees one origin for cookies.
# Builds are deployed by CI (.github/workflows/aws-v2.yml) as zip
# deployments, so Amplify needs no access to the GitHub repository.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    # bucket: passed with -backend-config (eraseai-tfstate-<account>)
    key          = "frontend.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = [var.account_id]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-frontend" } }
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

data "terraform_remote_state" "app" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "app.tfstate"
    region = "ap-southeast-1"
  }
}

data "terraform_remote_state" "edge" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "edge.tfstate"
    region = "ap-southeast-1"
  }
}

locals {
  api_url = data.terraform_remote_state.app.outputs.api_url # https://api.aws.eraseai.ai
  domain  = data.terraform_remote_state.edge.outputs.domain # aws.eraseai.ai
}

resource "aws_amplify_app" "web" {
  name     = "eraseai-web"
  platform = "WEB"

  # Order matters: the API proxy first, then the single-page-app fallback.
  custom_rule {
    source = "/api/<*>"
    target = "${local.api_url}/api/<*>"
    status = "200"
  }
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|mjs|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest|zip|xml)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  custom_headers = <<-YAML
    customHeaders:
      - pattern: '**'
        headers:
          - key: Strict-Transport-Security
            value: max-age=31536000; includeSubDomains
          - key: X-Content-Type-Options
            value: nosniff
          - key: X-Frame-Options
            value: DENY
          - key: Referrer-Policy
            value: strict-origin-when-cross-origin
          - key: Permissions-Policy
            value: camera=(), microphone=(), geolocation=()
      - pattern: 'assets/**'
        headers:
          - key: Cache-Control
            value: public, max-age=31536000, immutable
  YAML
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.web.id
  branch_name = "main"
  stage       = "PRODUCTION"
}

# aws.eraseai.ai can belong to one Amplify app only: attach it here after
# the v1 (old organization) app has released it.
variable "attach_domain" {
  type    = bool
  default = false
}

resource "aws_amplify_domain_association" "site" {
  count                 = var.attach_domain ? 1 : 0
  app_id                = aws_amplify_app.web.id
  domain_name           = local.domain
  wait_for_verification = false # verified once DNS + certificate are ready
  certificate_settings { type = "AMPLIFY_MANAGED" }
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }
}

output "app_id" { value = aws_amplify_app.web.id }
output "branch" { value = aws_amplify_branch.main.branch_name }
output "default_url" { value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.web.default_domain}" }
output "site_url" { value = "https://${local.domain}" }
