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
| `data` | 6 | RDS PostgreSQL 16 (private, encrypted, TLS-only, 14-day backups, deletion protection), Secrets Manager eraseai/* (generated + console-set third-party keys), migration bucket + one-off restore task |
| `frontend` | 7 | Amplify Hosting app eraseai-web (zip deployments from CI), /api proxy to the ALB, SPA fallback, security headers, custom domain aws.eraseai.ai |
| `monitoring` | 9 | CloudWatch alarms (ALB, ECS, RDS, WAF) to SNS email, dashboard, GuardDuty (S3, RDS login) with high-severity alerts, Security Hub (AWS FSBP); ALB access logs live in the app stack |

## Paused (cost saving until AWS credits arrive)

`network.nat_enabled = false`, `app.paused = true`, `data.paused = true`:
no NAT gateway, 0 containers, database stopped (a daily EventBridge
Scheduler job re-stops it, since RDS auto-starts after 7 days). Load
balancer, WAF, DNS, certificates, Amplify and all data remain.

Resume: set `nat_enabled = true` (network), `paused = false` (data, then
app), push, approve the three applies. The app comes back on the image in
`/eraseai/app/image-tag`.

## v2: new organization (from 2026-11-26)

The deployment moved to the organization owned by founder@eraseai.ai
(management account 635096817158), so the AWS account matches the AWS
Startups / Activate profile. Code: `infra/v2/`. Everything above this
section is v1 (old organization 741853494029), kept until its teardown.

| Path | Account | What |
|---|---|---|
| `v2/bootstrap/github-bootstrap.yaml` | management | Run once from CloudShell: GitHub OIDC roles (environment `aws-new`) + state bucket |
| `v2/org` | management | Control Tower 4.0 (Identity Center left self-managed), Security OU (Log Archive `connect+log@`, Audit `connect+audit@`), Workloads OU, eraseai-prod (`founder+prod@`) |
| `v2/accounts` | management → eraseai-prod | AWSControlTowerExecution role, GitHub plan/deploy roles, workload state bucket; registers the Workloads OU (enrolls eraseai-prod) |
| `v2/workload/*` | eraseai-prod | network, edge (DNS + cert), ecr, data (empty database, no customer data), app (ECS + ALB + WAF), frontend (Amplify), monitoring |

One pipeline, `.github/workflows/aws-v2.yml`, converges all of it on every
push and tests it. `infra/v2/settings.env` controls it:
`MODE=running|paused` (paused also removes the load balancer, WAF and NAT)
and `ATTACH_DOMAIN` (attach aws.eraseai.ai to the v2 website once the v1
Amplify app has released it). The app's schema is created by
`drizzle-kit push` from inside the image (verified locally on an empty
PostgreSQL 16: 23 tables, sign-up, login and a scan work).
