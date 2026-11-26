# v2 PostgreSQL 16 (RDS) and the app's secrets (Secrets Manager) for
# eraseai-prod (checklist item 6). The replica starts with an EMPTY database:
# no live or customer data. The pipeline creates the schema (drizzle-kit
# push) the first time the app runs.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  backend "s3" {
    # bucket: passed with -backend-config (eraseai-tfstate-<account>)
    key          = "data.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = [var.account_id]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "v2-data" } }
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

data "terraform_remote_state" "stack" {
  for_each = toset(["network"])
  backend  = "s3"
  config = {
    bucket = var.state_bucket
    key    = "${each.key}.tfstate"
    region = "ap-southeast-1"
  }
}

data "aws_caller_identity" "me" {}

locals {
  net     = data.terraform_remote_state.stack["network"].outputs
  account = data.aws_caller_identity.me.account_id
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro" # replica: smallest Graviton class
}

variable "multi_az" {
  description = "Standby in the second AZ (doubles the database cost)"
  type        = bool
  default     = false
}

# --- Database ----------------------------------------------------------------

resource "random_password" "db" {
  length  = 40
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "eraseai"
  subnet_ids = local.net.db_subnet_ids
}

resource "aws_db_parameter_group" "pg16" {
  name   = "eraseai-pg16"
  family = "postgres16"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log queries slower than 1 s
  }
}

resource "aws_db_instance" "main" {
  identifier     = "eraseai"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class
  multi_az       = var.multi_az

  db_name  = "eraseai"
  username = "eraseai"
  password = random_password.db.result
  port     = 5432

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [local.net.db_security_group_id]
  publicly_accessible    = false
  parameter_group_name   = aws_db_parameter_group.pg16.name
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  backup_retention_period   = 14
  backup_window             = "18:00-19:00" # 02:00-03:00 Singapore
  maintenance_window        = "sun:19:30-sun:20:30"
  copy_tags_to_snapshot     = true
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "eraseai-final"

  auto_minor_version_upgrade            = true
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  lifecycle { ignore_changes = [engine_version] } # minor upgrades by RDS
}

# --- Secrets -----------------------------------------------------------------

resource "random_password" "session" {
  length  = 64
  special = false
}

resource "random_password" "admin" {
  length  = 24
  special = false
}

locals {
  generated = {
    DATABASE_URL             = "postgresql://eraseai:${random_password.db.result}@${aws_db_instance.main.address}:5432/eraseai?sslmode=no-verify"
    SESSION_SECRET           = random_password.session.result
    ADMIN_BOOTSTRAP_PASSWORD = random_password.admin.result
  }
}

resource "aws_secretsmanager_secret" "generated" {
  for_each                = local.generated
  name                    = "eraseai/${each.key}"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "generated" {
  for_each      = local.generated
  secret_id     = aws_secretsmanager_secret.generated[each.key].id
  secret_string = each.value
}

# --- Outputs -----------------------------------------------------------------

output "db_endpoint" { value = aws_db_instance.main.address }
output "db_identifier" { value = aws_db_instance.main.identifier }
output "secret_names" { value = keys(local.generated) }

# --- Pause: keep the database stopped -----------------------------------------

resource "aws_iam_role" "db_scheduler" {
  name = "eraseai-db-stop-scheduler"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = local.account } }
    }]
  })
}

resource "aws_iam_role_policy" "db_scheduler" {
  name = "stop-db"
  role = aws_iam_role.db_scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "rds:StopDBInstance"
      Resource = aws_db_instance.main.arn
    }]
  })
}

resource "aws_scheduler_schedule" "db_stop" {
  name                         = "eraseai-db-keep-stopped"
  description                  = "Stops the database daily while the environment is paused"
  state                        = var.paused ? "ENABLED" : "DISABLED"
  schedule_expression          = "cron(0 20 * * ? *)" # 04:00 Singapore
  schedule_expression_timezone = "UTC"
  flexible_time_window { mode = "OFF" }
  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.db_scheduler.arn
    input    = jsonencode({ DbInstanceIdentifier = aws_db_instance.main.identifier })
    retry_policy { maximum_retry_attempts = 0 }
  }
}

# Stop or start the database right away when the pause setting changes.
resource "terraform_data" "db_power" {
  triggers_replace = [var.paused]
  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-SH
      id=${aws_db_instance.main.identifier}
      state=$(aws rds describe-db-instances --db-instance-identifier $id --query 'DBInstances[0].DBInstanceStatus' --output text)
      echo "database $id is $state"
      if [ "${var.paused}" = true ]; then
        case "$state" in creating|backing-up|modifying|configuring-enhanced-monitoring|configuring-log-exports|starting) aws rds wait db-instance-available --db-instance-identifier $id; state=available;; esac
        [ "$state" = available ] && aws rds stop-db-instance --db-instance-identifier $id --query 'DBInstance.DBInstanceStatus' --output text || true
      else
        [ "$state" = stopped ] && aws rds start-db-instance --db-instance-identifier $id --query 'DBInstance.DBInstanceStatus' --output text && aws rds wait db-instance-available --db-instance-identifier $id || true
      fi
    SH
  }
  depends_on = [aws_db_instance.main]
}
