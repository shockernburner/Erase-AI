# v2: prepares the eraseai-prod account from the management account and
# enrolls it in Control Tower.
#   - inside eraseai-prod (through OrganizationAccountAccessRole): the
#     AWSControlTowerExecution role Control Tower needs, the GitHub OIDC
#     plan/deploy roles (environment "aws-new") and the workload state bucket
#   - in the management account: registers the Workloads OU with Control
#     Tower, which enrolls eraseai-prod

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-635096817158"
    key          = "v2/accounts.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = "eraseai-tfstate-635096817158"
    key    = "v2/org.tfstate"
    region = "ap-southeast-1"
  }
}

locals {
  org     = data.terraform_remote_state.org.outputs
  prod_id = local.org.prod_account_id
  repo    = "shockernburner/Erase-AI"
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["635096817158"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-accounts" } }
}

provider "aws" {
  alias               = "prod"
  region              = "ap-southeast-1"
  allowed_account_ids = [local.prod_id]
  assume_role {
    role_arn     = "arn:aws:iam::${local.prod_id}:role/OrganizationAccountAccessRole"
    session_name = "eraseai-v2-accounts"
  }
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-accounts" } }
}

# --- Control Tower enrollment ---------------------------------------------

resource "aws_iam_role" "ct_execution" {
  provider = aws.prod
  name     = "AWSControlTowerExecution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::635096817158:root" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ct_execution" {
  provider   = aws.prod
  role       = aws_iam_role.ct_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Registering the OU enrolls every account in it (eraseai-prod).
resource "aws_controltower_baseline" "workloads" {
  baseline_identifier = "arn:aws:controltower:ap-southeast-1::baseline/17BSJV3IGJ2QSGA2" # AWSControlTowerBaseline
  baseline_version    = "5.0"
  target_identifier   = local.org.workloads_ou_arn
  depends_on          = [aws_iam_role_policy_attachment.ct_execution]
}

# --- GitHub Actions access to eraseai-prod --------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  provider       = aws.prod
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_s3_bucket" "state" {
  provider = aws.prod
  bucket   = "eraseai-tfstate-${local.prod_id}"
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "state" {
  provider = aws.prod
  bucket   = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  provider = aws.prod
  bucket   = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  provider                = aws.prod
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "state" {
  provider = aws.prod
  bucket   = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TLSOnly"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

data "aws_iam_policy_document" "github_any_ref" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.repo}:*"]
    }
  }
}

data "aws_iam_policy_document" "github_env" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.repo}:environment:aws-new"]
    }
  }
}

# Read-only, any branch: previews and health reports.
resource "aws_iam_role" "plan" {
  provider             = aws.prod
  name                 = "eraseai-github-plan"
  max_session_duration = 3600
  assume_role_policy   = data.aws_iam_policy_document.github_any_ref.json
}

resource "aws_iam_role_policy_attachment" "plan" {
  provider   = aws.prod
  role       = aws_iam_role.plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_role_policy" "plan" {
  provider = aws.prod
  name     = "state-lock-and-no-secret-state"
  role     = aws_iam_role.plan.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/*.tflock"
      },
      {
        # The data stack's state holds the database password.
        Effect   = "Deny"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.state.arn}/*data.tfstate"
      },
    ]
  })
}

# Deploys: only jobs in the GitHub "aws-new" environment.
resource "aws_iam_role" "deploy" {
  provider             = aws.prod
  name                 = "eraseai-github-deploy"
  max_session_duration = 7200
  assume_role_policy   = data.aws_iam_policy_document.github_env.json
}

resource "aws_iam_role_policy_attachment" "deploy" {
  provider   = aws.prod
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "prod_account_id" { value = local.prod_id }
output "github_plan_role_arn" { value = aws_iam_role.plan.arn }
output "github_deploy_role_arn" { value = aws_iam_role.deploy.arn }
output "workload_state_bucket" { value = aws_s3_bucket.state.bucket }
