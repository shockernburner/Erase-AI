# v2 organization (management account 635096817158, owned by
# founder@eraseai.ai): Control Tower landing zone 4.0, the shared Log Archive
# and Audit accounts, the service roles Control Tower uses, the Workloads OU
# and the eraseai-prod account. Applied by GitHub Actions (aws-v2.yml).
#
# IAM Identity Center already exists in this organization (Sydney, created
# with the account), so Control Tower does not manage it (accessManagement
# off). Users and access are managed in Identity Center directly.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-635096817158"
    key          = "v2/org.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = var.home_region
  allowed_account_ids = ["635096817158"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-org" } }
}

variable "home_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "log_archive_email" {
  type    = string
  default = "connect+log@eraseai.ai"
}

variable "audit_email" {
  type    = string
  default = "connect+audit@eraseai.ai"
}

variable "prod_email" {
  type    = string
  default = "founder+prod@eraseai.ai"
}

data "aws_organizations_organization" "this" {}

# --- Shared accounts -------------------------------------------------------
# Landing zone 4.0 needs the service integration accounts together in one
# OU directly under the root.

resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_account" "log_archive" {
  name                       = "Log Archive"
  email                      = var.log_archive_email
  iam_user_access_to_billing = "ALLOW"
  close_on_deletion          = false
  parent_id                  = aws_organizations_organizational_unit.security.id
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [role_name, iam_user_access_to_billing, email]
  }
}

resource "aws_organizations_account" "audit" {
  name                       = "Audit"
  email                      = var.audit_email
  iam_user_access_to_billing = "ALLOW"
  close_on_deletion          = false
  parent_id                  = aws_organizations_organizational_unit.security.id
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [role_name, iam_user_access_to_billing, email]
  }
}

# --- Control Tower service roles (AWS "Getting started with the APIs") -----

data "aws_iam_policy_document" "trust" {
  for_each = {
    admin      = "controltower.amazonaws.com"
    cloudtrail = "cloudtrail.amazonaws.com"
    stackset   = "cloudformation.amazonaws.com"
    config     = "config.amazonaws.com"
  }
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = [each.value]
    }
  }
}

resource "aws_iam_role" "admin" {
  name               = "AWSControlTowerAdmin"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.trust["admin"].json
}

resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.admin.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSControlTowerServiceRolePolicy"
}

resource "aws_iam_role_policy" "admin" {
  name = "AWSControlTowerAdminPolicy"
  role = aws_iam_role.admin.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "ec2:DescribeAvailabilityZones", Resource = "*" }]
  })
}

resource "aws_iam_role" "cloudtrail" {
  name               = "AWSControlTowerCloudTrailRole"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.trust["cloudtrail"].json
}

resource "aws_iam_role_policy_attachment" "cloudtrail" {
  role       = aws_iam_role.cloudtrail.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSControlTowerCloudTrailRolePolicy"
}

resource "aws_iam_role" "stackset" {
  name               = "AWSControlTowerStackSetRole"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.trust["stackset"].json
}

resource "aws_iam_role_policy" "stackset" {
  name = "AWSControlTowerStackSetRolePolicy"
  role = aws_iam_role.stackset.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = "arn:aws:iam::*:role/AWSControlTowerExecution"
    }]
  })
}

resource "aws_iam_role" "config_aggregator" {
  name               = "AWSControlTowerConfigAggregatorRoleForOrganizations"
  path               = "/service-role/"
  assume_role_policy = data.aws_iam_policy_document.trust["config"].json
}

resource "aws_iam_role_policy_attachment" "config_aggregator" {
  role       = aws_iam_role.config_aggregator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRoleForOrganizations"
}

# --- Landing zone ----------------------------------------------------------

resource "aws_controltower_landing_zone" "this" {
  version = "4.0"
  manifest_json = jsonencode({
    governedRegions  = [var.home_region]
    accessManagement = { enabled = false }
    backup           = { enabled = false }
    centralizedLogging = {
      enabled   = true
      accountId = aws_organizations_account.log_archive.id
      configurations = {
        loggingBucket       = { retentionDays = 365 }
        accessLoggingBucket = { retentionDays = 3650 }
      }
    }
    config = {
      enabled   = true
      accountId = aws_organizations_account.audit.id
      configurations = {
        loggingBucket       = { retentionDays = 365 }
        accessLoggingBucket = { retentionDays = 3650 }
      }
    }
    securityRoles = { enabled = true, accountId = aws_organizations_account.audit.id }
  })

  depends_on = [
    aws_iam_role_policy_attachment.admin,
    aws_iam_role_policy.admin,
    aws_iam_role_policy_attachment.cloudtrail,
    aws_iam_role_policy.stackset,
    aws_iam_role_policy_attachment.config_aggregator,
  ]
  timeouts {
    create = "120m"
    update = "120m"
  }
}

# OU for application accounts; registered with Control Tower in 02-accounts.
resource "aws_organizations_organizational_unit" "workloads" {
  name       = "Workloads"
  parent_id  = data.aws_organizations_organization.this.roots[0].id
  depends_on = [aws_controltower_landing_zone.this]
}

# Workload account. Enrolled in Control Tower by the accounts stack, which
# first creates the AWSControlTowerExecution role inside it.
resource "aws_organizations_account" "prod" {
  name                       = "eraseai-prod"
  email                      = var.prod_email
  parent_id                  = aws_organizations_organizational_unit.workloads.id
  role_name                  = "OrganizationAccountAccessRole"
  iam_user_access_to_billing = "ALLOW"
  close_on_deletion          = false
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [role_name, iam_user_access_to_billing, email]
  }
}

output "prod_account_id" { value = aws_organizations_account.prod.id }
output "log_archive_account_id" { value = aws_organizations_account.log_archive.id }
output "audit_account_id" { value = aws_organizations_account.audit.id }
output "landing_zone_arn" { value = aws_controltower_landing_zone.this.arn }
output "security_ou_id" { value = aws_organizations_organizational_unit.security.id }
output "workloads_ou_id" { value = aws_organizations_organizational_unit.workloads.id }
output "workloads_ou_arn" { value = aws_organizations_organizational_unit.workloads.arn }
