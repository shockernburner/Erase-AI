# EraseAI AWS infrastructure (Terraform)

Each folder is one Terraform stack with its own state in
`s3://eraseai-tfstate-741853494029` (management account, ap-southeast-1).
Apply them in order.

| Stack | Account | What |
|---|---|---|
| `00-bootstrap` | management | State bucket (versioned, encrypted, TLS-only) |
| `01-landing-zone` | management | Control Tower landing zone 4.0, Security OU with Log Archive + Audit accounts, service roles, Workloads OU |
| `02-accounts` | management | Workloads OU registered with Control Tower; eraseai-prod (110796370706) via Account Factory; GitHub OIDC plan/deploy roles + workload state bucket in eraseai-prod (StackSet) |

```bash
cd infra/<stack>
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

`00-bootstrap` was applied once with local state (a temporary
`backend_override.tf` with `backend "local" {}`), then migrated into the
bucket with `terraform init -migrate-state`.

## Known quirk: Control Tower tag reads through the Claude Code session proxy

From the Claude Code cloud session, `controltower:ListTagsForResource` fails
with `AccessDeniedException: Unable to determine service/operation name`
(the session's AWS proxy mangles that REST path). Effect: Terraform reports
an error right after creating an `aws_controltower_*` resource and marks it
tainted, although the resource itself is fine. Recovery used here:

```bash
aws controltower get-landing-zone --landing-zone-identifier <arn>   # confirm ACTIVE
terraform untaint aws_controltower_landing_zone.this
terraform plan -refresh=false -out=tfplan && terraform apply tfplan
```

Never apply a plan that wants to *replace* the landing zone. From AWS
CloudShell or GitHub Actions (no proxy) plain `terraform plan` works.
