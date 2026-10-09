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

## Workload stacks (eraseai-prod, 110796370706)

`infra/workload/<stack>`, state in `s3://eraseai-tfstate-110796370706`.
Applied only by GitHub Actions (`.github/workflows/infra.yml`): a push that
changes a stack runs `plan` with the read-only role, then `apply` with the
deploy role inside the `production` environment (needs approval there).
Manual run: Actions → infra → Run workflow → stack name.

| Stack | Phase | What |
|---|---|---|
| `network` | 2 | VPC 10.20.0.0/16 over 2 AZs: public / app / db subnets, IGW, NAT, S3 endpoint, security groups (ALB → app:8080 → db:5432), VPC flow logs |
| `edge` | 3 | Route 53 zone aws.eraseai.ai (delegated from GoDaddy), ACM cert aws.eraseai.ai + *.aws.eraseai.ai, WAF (rate limit + AWS managed rules) with logs |
| `ecr` | 4 | ECR repo eraseai/app (immutable SHA tags, scan on push, lifecycle: 30 builds), pull-through cache for public.ecr.aws base images |
| `app` | 5 | ECS Fargate cluster (Container Insights), task/execution roles, ALB (HTTPS TLS1.2+/1.3, HTTP→HTTPS, WAF attached), api.aws.eraseai.ai, service with circuit-breaker rollback and CPU autoscaling (starts at 0 tasks) |
