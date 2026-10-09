# Phase 1b: register the Workloads OU with Control Tower and create the
# eraseai-prod account through Account Factory (so it is enrolled and
# governed by the landing zone from the start).

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-741853494029"
    key          = "02-accounts.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["741853494029"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "02-accounts" } }
}

data "terraform_remote_state" "lz" {
  backend = "s3"
  config = {
    bucket = "eraseai-tfstate-741853494029"
    key    = "01-landing-zone.tfstate"
    region = "ap-southeast-1"
  }
}

variable "prod_account_email" {
  type    = string
  default = "firdous.mahmood26+aws-prod@gmail.com"
}

# IDs that Control Tower creates; looked up once after 01-landing-zone and
# kept in terraform.tfvars (they are not secret).
variable "control_tower_baseline_arn" {
  description = "ARN of the AWSControlTowerBaseline (aws controltower list-baselines)"
  type        = string
}

variable "control_tower_baseline_version" {
  type = string
}

variable "identity_center_enabled_baseline_arn" {
  description = "Enabled IdentityCenterBaseline ARN (aws controltower list-enabled-baselines)"
  type        = string
}

variable "account_factory_portfolio_id" {
  description = "Service Catalog portfolio 'AWS Control Tower Account Factory Portfolio'"
  type        = string
}

data "aws_caller_identity" "me" {}

# Register the Workloads OU so accounts in it are governed by Control Tower.
resource "aws_controltower_baseline" "workloads" {
  baseline_identifier = var.control_tower_baseline_arn
  baseline_version    = var.control_tower_baseline_version
  target_identifier   = data.terraform_remote_state.lz.outputs.workloads_ou_arn
  parameters {
    key   = "IdentityCenterEnabledBaselineArn"
    value = var.identity_center_enabled_baseline_arn
  }
}

# Let this deploy user launch Account Factory.
resource "aws_servicecatalog_principal_portfolio_association" "deployer" {
  portfolio_id  = var.account_factory_portfolio_id
  principal_arn = data.aws_caller_identity.me.arn
}

resource "aws_servicecatalog_provisioned_product" "eraseai_prod" {
  name                       = "eraseai-prod"
  product_name               = "AWS Control Tower Account Factory"
  provisioning_artifact_name = "AWS Control Tower Account Factory"

  provisioning_parameters {
    key   = "AccountName"
    value = "eraseai-prod"
  }
  provisioning_parameters {
    key   = "AccountEmail"
    value = var.prod_account_email
  }
  provisioning_parameters {
    key   = "ManagedOrganizationalUnit"
    value = "Workloads (${data.terraform_remote_state.lz.outputs.workloads_ou_id})"
  }
  provisioning_parameters {
    key   = "SSOUserEmail"
    value = "firdous.mahmood26@gmail.com"
  }
  provisioning_parameters {
    key   = "SSOUserFirstName"
    value = "Firdous"
  }
  provisioning_parameters {
    key   = "SSOUserLastName"
    value = "Mahmood"
  }

  depends_on = [
    aws_controltower_baseline.workloads,
    aws_servicecatalog_principal_portfolio_association.deployer,
  ]
  lifecycle { prevent_destroy = true }
  timeouts {
    create = "60m"
    update = "60m"
  }
}

locals {
  prod_account_id = one([for o in aws_servicecatalog_provisioned_product.eraseai_prod.outputs : o.value if o.key == "AccountId"])
}

# GitHub OIDC deploy/plan roles and the workload state bucket, pushed into
# eraseai-prod the same way Control Tower deploys its own baselines.
resource "aws_cloudformation_stack_set" "github_deploy" {
  name                    = "eraseai-github-deploy"
  permission_model        = "SELF_MANAGED"
  administration_role_arn = "arn:aws:iam::741853494029:role/service-role/AWSControlTowerStackSetRole"
  execution_role_name     = "AWSControlTowerExecution"
  capabilities            = ["CAPABILITY_NAMED_IAM"]
  template_body           = file("${path.module}/github-deploy.yaml")
}

resource "aws_cloudformation_stack_set_instance" "github_deploy" {
  stack_set_name            = aws_cloudformation_stack_set.github_deploy.name
  account_id                = local.prod_account_id
  stack_set_instance_region = "ap-southeast-1"
}

output "github_plan_role_arn" { value = "arn:aws:iam::${local.prod_account_id}:role/eraseai-github-plan" }
output "github_deploy_role_arn" { value = "arn:aws:iam::${local.prod_account_id}:role/eraseai-github-deploy" }
output "workload_state_bucket" { value = "eraseai-tfstate-${local.prod_account_id}" }

output "prod_account_id" { value = local.prod_account_id }
