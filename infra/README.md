# EraseAI AWS infrastructure (Terraform)

Each folder is one Terraform stack with its own state in
`s3://eraseai-tfstate-741853494029` (management account, ap-southeast-1).
Apply them in order.

| Stack | Account | What |
|---|---|---|
| `00-bootstrap` | management | State bucket (versioned, encrypted, TLS-only) |
| `01-landing-zone` | management | Control Tower landing zone 4.0, Security OU with Log Archive + Audit accounts, service roles, Workloads OU |
| `02-accounts` | management | Workloads OU registered with Control Tower; eraseai-prod account via Account Factory |

```bash
cd infra/<stack>
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

`00-bootstrap` was applied once with local state (a temporary
`backend_override.tf` with `backend "local" {}`), then migrated into the
bucket with `terraform init -migrate-state`.
