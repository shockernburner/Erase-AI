# Phase 6: PostgreSQL 16 (RDS) and the app's secrets (Secrets Manager) for
# eraseai-prod, plus a private bucket and a one-off ECS task that restores a
# pg_dump into the database (data migration from Replit).

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "data.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "data" } }
}

data "terraform_remote_state" "stack" {
  for_each = toset(["network", "app"])
  backend  = "s3"
  config = {
    bucket = "eraseai-tfstate-110796370706"
    key    = "${each.key}.tfstate"
    region = "ap-southeast-1"
  }
}

data "aws_caller_identity" "me" {}

locals {
  net     = data.terraform_remote_state.stack["network"].outputs
  app     = data.terraform_remote_state.stack["app"].outputs
  account = data.aws_caller_identity.me.account_id
}

variable "instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "multi_az" {
  description = "Standby in the second AZ (doubles the database cost)"
  type        = bool
  default     = false
}

# S3 key of a pg_dump (custom format) in the migration bucket. Changing it
# runs the restore task once; it WIPES the database first.
variable "restore_dump_key" {
  type    = string
  default = "eraseai.dump" # Replit dump uploaded 2026-10-09
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
  # Values come from Stripe / Google / Resend: set them in the console
  # (Secrets Manager -> eraseai/<NAME> -> Retrieve secret value -> Edit),
  # then add the name to secret_names in the app stack.
  external = [
    "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "RESEND_API_KEY", "EMAIL_FROM",
    "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
  ]
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

resource "aws_secretsmanager_secret" "external" {
  for_each                = toset(local.external)
  name                    = "eraseai/${each.key}"
  description             = "Set the value in the console; not managed by Terraform"
  recovery_window_in_days = 7
}

# --- Migration: dump bucket and restore task ---------------------------------

resource "aws_s3_bucket" "migration" {
  bucket = "eraseai-migration-${local.account}"
}

resource "aws_s3_bucket_public_access_block" "migration" {
  bucket                  = aws_s3_bucket.migration.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "migration" {
  bucket = aws_s3_bucket.migration.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# Dumps hold customer data: deleted automatically after 3 days.
resource "aws_s3_bucket_lifecycle_configuration" "migration" {
  bucket = aws_s3_bucket.migration.id
  rule {
    id     = "expire-dumps"
    status = "Enabled"
    filter {}
    expiration { days = 3 }
  }
}

resource "aws_s3_bucket_policy" "migration" {
  bucket = aws_s3_bucket.migration.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TLSOnly"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.migration.arn, "${aws_s3_bucket.migration.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_iam_role" "restore" {
  name = "eraseai-db-restore"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = local.account } }
    }]
  })
}

resource "aws_iam_role_policy" "restore" {
  name = "read-dumps"
  role = aws_iam_role.restore.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.migration.arn}/*"
    }]
  })
}

resource "aws_cloudwatch_log_group" "restore" {
  name              = "/eraseai/db-restore"
  retention_in_days = 30
}

resource "aws_ecs_task_definition" "restore" {
  family                   = "eraseai-db-restore"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = "arn:aws:iam::${local.account}:role/eraseai-ecs-execution"
  task_role_arn            = aws_iam_role.restore.arn
  # Two containers, no package installs (app subnets only allow HTTPS out):
  # "fetch" (AWS CLI image) copies the dump into a shared volume, then
  # "restore" (PostgreSQL image) loads it.
  volume { name = "dump" }
  container_definitions = jsonencode([
    {
      name        = "fetch"
      image       = "public.ecr.aws/aws-cli/aws-cli:latest"
      essential   = false
      entryPoint  = ["sh", "-c"]
      command     = ["aws s3 cp --only-show-errors \"s3://$BUCKET/$DUMP_KEY\" /dump/eraseai.dump && ls -l /dump"]
      environment = [{ name = "BUCKET", value = aws_s3_bucket.migration.bucket }]
      mountPoints = [{ sourceVolume = "dump", containerPath = "/dump" }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.restore.name
          awslogs-region        = "ap-southeast-1"
          awslogs-stream-prefix = "fetch"
        }
      }
    },
    {
      name        = "restore"
      image       = "public.ecr.aws/docker/library/postgres:16"
      essential   = true
      dependsOn   = [{ containerName = "fetch", condition = "SUCCESS" }]
      mountPoints = [{ sourceVolume = "dump", containerPath = "/dump", readOnly = true }]
      entryPoint  = ["bash", "-c"]
      command = [<<-SH
        set -euo pipefail
        [ "$(head -c 5 /dump/eraseai.dump)" = PGDMP ] || { echo "not a pg_dump custom-format file"; exit 1; }
        DB="$${DATABASE_URL/sslmode=no-verify/sslmode=require}"
        ADMIN=$(printf %s "$DB" | sed "s#:5432/eraseai?#:5432/postgres?#")
        psql "$ADMIN" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS eraseai WITH (FORCE)" -c "CREATE DATABASE eraseai"
        pg_restore --no-owner --no-privileges -d "$DB" /dump/eraseai.dump || echo "pg_restore finished with warnings"
        psql "$DB" -At -c "select 'users=' || count(*) from users" -c "select 'tables=' || count(*) from information_schema.tables where table_schema='public'"
        echo RESTORE_DONE
      SH
      ]
      secrets = [{ name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.generated["DATABASE_URL"].arn }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.restore.name
          awslogs-region        = "ap-southeast-1"
          awslogs-stream-prefix = "restore"
        }
      }
    },
  ])
}

# Runs the restore once per dump key, from the GitHub runner (deploy role).
# Re-running needs a new key (upload under a new name), never the same one.
resource "terraform_data" "restore" {
  count            = var.restore_dump_key == "" ? 0 : 1
  triggers_replace = [var.restore_dump_key]
  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-SH
      set -euo pipefail
      task=$(aws ecs run-task --cluster ${local.app.cluster_name} --launch-type FARGATE \
        --task-definition ${aws_ecs_task_definition.restore.arn} \
        --network-configuration 'awsvpcConfiguration={subnets=[${join(",", local.net.app_subnet_ids)}],securityGroups=[${local.net.app_security_group_id}],assignPublicIp=DISABLED}' \
        --overrides '{"containerOverrides":[{"name":"fetch","environment":[{"name":"DUMP_KEY","value":"${var.restore_dump_key}"}]}]}' \
        --query 'tasks[0].taskArn' --output text)
      echo "restore task: $task"
      aws ecs wait tasks-stopped --cluster ${local.app.cluster_name} --tasks "$task"
      code=$(aws ecs describe-tasks --cluster ${local.app.cluster_name} --tasks "$task" --query "tasks[0].containers[?name=='restore'].exitCode | [0]" --output text)
      aws logs tail ${aws_cloudwatch_log_group.restore.name} --since 30m | grep -vE 'debconf|^\s*$' | tail -20
      [ "$code" = 0 ]
    SH
  }
  depends_on = [aws_db_instance.main, aws_secretsmanager_secret_version.generated]
}

# --- Outputs -----------------------------------------------------------------

output "db_endpoint" { value = aws_db_instance.main.address }
output "db_identifier" { value = aws_db_instance.main.identifier }
output "migration_bucket" { value = aws_s3_bucket.migration.bucket }
output "secret_names" { value = concat(keys(local.generated), local.external) }
