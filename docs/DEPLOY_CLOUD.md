# Running EraseAI outside Replit (Google Cloud or AWS)

EraseAI runs today on **Replit**. This guide moves a **copy** to Google Cloud
(Cloud Run + Cloud SQL), and lists the AWS equivalents. The live site on Replit
keeps running until you switch the domain.

## 1. Current architecture (what runs where today)

| Layer | Today |
|---|---|
| Frontend | React 19 + TypeScript single-page app, built with Vite 7, Tailwind CSS 4, wouter, TanStack Query. Static files. |
| Backend | Node.js 24, Express 5, TypeScript bundled with esbuild, Drizzle ORM, pino logs. One stateless HTTP service under `/api`. |
| Database | PostgreSQL 16, managed by Replit. App tables (users, sessions, organizations, scans, API keys, usage…) plus a `stripe.*` mirror kept in sync by `stripe-replit-sync`. |
| Compute | Replit Autoscale deployment: two services on one domain (static website at `/`, API at `/api`). Replit's infrastructure runs on Google Cloud. |
| Storage | No file/object storage. Uploads (CSV/JSON datasets, up to 10 MB) are processed in memory and their rows stored in Postgres. |
| Networking | Custom domain `eraseai.ai`, TLS and routing by Replit's edge proxy. |
| Secrets | Replit Secrets (environment variables). Stripe keys come through Replit's Stripe connector. |
| Outside services | Stripe (payments), Resend (email), Google OAuth (sign-in), Google Play Developer API (Android subscription checks), Chrome Web Store, Google Play. |
| Clients | Chrome extension (Manifest V3) and Android app (Kotlin) calling `https://eraseai.ai/api`. |

Diagram:

```
 Browser (website)      Chrome extension      Android app
        \                      |                  /
         \_____________ https://eraseai.ai ______/
                               |
                Replit edge (TLS, routing)   [runs on Google Cloud]
                 /                         \
   Static website (/)              API server (/api)  Node 24 + Express
                                         |
                                PostgreSQL 16 (Replit managed)
                                         |
     Stripe · Resend · Google OAuth · Google Play Developer API
```

## 2. What changes off Replit (already done in code)

All of these switch on only when the setting is present, so Replit keeps
working as before:

- **One container**: `Dockerfile` at the repo root builds the website and the
  API; the API also serves the website when `WEB_DIST_DIR` is set (the
  Dockerfile sets it). Listens on `$PORT` (8080).
- **Stripe**: set `STRIPE_SECRET_KEY` (and `STRIPE_PUBLISHABLE_KEY`) instead of
  Replit's connector.
- **Stripe webhook**: set `PUBLIC_BASE_URL` (e.g. `https://gcp.eraseai.ai`); on
  start the server registers `PUBLIC_BASE_URL/api/stripe/webhook` with Stripe.

## 3. Settings (environment variables / secrets)

| Name | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string of the new database |
| `PUBLIC_BASE_URL` | The copy's address, e.g. `https://gcp.eraseai.ai` |
| `WEB_BASE_URL` | Same as above (used in password-reset emails) |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | **Use Stripe test keys for a copy** (see note) |
| `SESSION_SECRET`, `ADMIN_BOOTSTRAP_PASSWORD` | Copy from Replit Secrets |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Copy from Replit; add the new redirect URI in Google Cloud (step 8) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Copy from Replit |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Copy from Replit |
| `CORS`/others | Anything else in Replit → Publishing → Deployment secrets that you use |

**Stripe for a copy:** use **test** keys. With live keys, the copy would add a
second live webhook and could change real customers' subscriptions in its own
(copied) database. Switch to live keys only on the day the copy becomes the
real site.

## 4. Google Cloud: step by step

Prerequisites: a Google Cloud project with billing, and `gcloud` installed
(or use Cloud Shell in the browser, which has everything).

```bash
PROJECT=your-project-id
REGION=asia-southeast1          # Singapore; pick the region near your users
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com
```

### 4.1 Database (Cloud SQL for PostgreSQL 16)

```bash
gcloud sql instances create eraseai-db --database-version=POSTGRES_16 \
  --region=$REGION --tier=db-g1-small --storage-size=10GB --availability-type=zonal
gcloud sql databases create eraseai --instance=eraseai-db
gcloud sql users create eraseai --instance=eraseai-db --password='CHOOSE-A-STRONG-PASSWORD'
```

### 4.2 Copy the data from Replit

In the **Replit Shell** (production database URL is in Publishing → Deployment
secrets → `DATABASE_URL`):

```bash
pg_dump "$PRODUCTION_DATABASE_URL" --no-owner --no-privileges -Fc -f eraseai.dump
```

Download `eraseai.dump` (Files panel → right-click → Download). Then from Cloud
Shell (upload the file there) restore it through the Cloud SQL proxy:

```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy $PROJECT:$REGION:eraseai-db --port 6543 &
pg_restore --no-owner --no-privileges -d "postgresql://eraseai:PASSWORD@127.0.0.1:6543/eraseai" eraseai.dump
```

Starting from an empty database instead? The core tables (`users`, `scans`…)
come from the Drizzle schema, not from server startup, so create them once
before the first start: `DATABASE_URL=... pnpm --filter @workspace/db run push`.

### 4.3 Secrets

```bash
printf '%s' 'VALUE' | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
# repeat for each secret in section 3, including DATABASE_URL:
# postgresql://eraseai:PASSWORD@/eraseai?host=/cloudsql/PROJECT:REGION:eraseai-db
```

Give Cloud Run access:

```bash
PN=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT \
  --member=serviceAccount:$PN-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding $PROJECT \
  --member=serviceAccount:$PN-compute@developer.gserviceaccount.com \
  --role=roles/cloudsql.client
```

### 4.4 Build the container

From a clone of the GitHub repository (Cloud Shell: `git clone` it):

```bash
gcloud artifacts repositories create eraseai --repository-format=docker --location=$REGION
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT/eraseai/app:latest .
```

### 4.5 Deploy on Cloud Run

```bash
gcloud run deploy eraseai \
  --image $REGION-docker.pkg.dev/$PROJECT/eraseai/app:latest \
  --region $REGION --allow-unauthenticated \
  --add-cloudsql-instances $PROJECT:$REGION:eraseai-db \
  --min-instances 1 --memory 1Gi --cpu 1 \
  --set-env-vars PUBLIC_BASE_URL=https://gcp.eraseai.ai,WEB_BASE_URL=https://gcp.eraseai.ai \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,SESSION_SECRET=SESSION_SECRET:latest,ADMIN_BOOTSTRAP_PASSWORD=ADMIN_BOOTSTRAP_PASSWORD:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:latest
```

`--min-instances 1` keeps one server warm (sign-in sessions and rate limits
live in Postgres, so more instances are safe).

### 4.6 Address (test domain first)

Cloud Run → the service → **Manage custom domains** → add `gcp.eraseai.ai`,
then add the DNS record it shows at your domain registrar. TLS is automatic.
(Or use the `*.run.app` address it prints, and set `PUBLIC_BASE_URL` to it.)

### 4.7 Check it

- `https://gcp.eraseai.ai/api/healthz` → `{"status":"ok"}`
- The website loads; log in with an existing account (data was copied).
- Admin dashboard → Stripe setup → **Set up prices** (creates prices in the
  Stripe account whose keys you set).

### 4.8 Google sign-in on the copy

Google Cloud Console → Credentials → Web client → **Authorized redirect URIs**
→ add `https://gcp.eraseai.ai/api/auth/google/callback`.

### 4.9 Switching the real site (only when ready)

1. Put the live Stripe keys in the secrets; redeploy.
2. Take a fresh `pg_dump` from Replit right before, restore it (step 4.2).
3. Point `eraseai.ai` DNS to Cloud Run (domain mapping or a load balancer),
   set `PUBLIC_BASE_URL=https://eraseai.ai`.
4. In Stripe → Developers → Webhooks, remove the old Replit endpoint if a
   second one appears.
5. The Chrome extension and Android app already call `https://eraseai.ai/api`,
   so they follow the domain with no update.

## 5. AWS equivalents

The same container runs on AWS:

| Google Cloud | AWS |
|---|---|
| Cloud Run | **App Runner** (simplest) or ECS Fargate behind an Application Load Balancer |
| Cloud SQL for PostgreSQL | **RDS for PostgreSQL 16** (db.t4g.small to start) |
| Secret Manager | **Secrets Manager** (or SSM Parameter Store) |
| Artifact Registry / Cloud Build | **ECR** (`docker build` + `docker push`) |
| Custom domain mapping | **Route 53** + certificate from **ACM** (App Runner custom domain does both) |
| Cloud SQL proxy for restore | `pg_restore` from an EC2 instance or CloudShell in the same VPC |

## 6. AWS: step by step (copy-paste)

Target: **App Runner** (runs the container, HTTPS, autoscaling) + **RDS for
PostgreSQL 16** (private, in your default VPC) + **Secrets Manager** + **ECR**.
Region below is Singapore (`ap-southeast-1`); change `REGION` if you prefer.

You need: the AWS CLI v2 logged in as an admin user (`aws configure`, or use
**AWS CloudShell** in the console, which is already logged in), and Docker on
your computer for step 6.5.

### 6.1 Variables (run first, in every new terminal)

```bash
export REGION=ap-southeast-1
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export APP=eraseai
export DB_PASSWORD='CHOOSE-A-STRONG-PASSWORD-WITHOUT-@-OR-/'
export SITE=https://aws.eraseai.ai     # the copy's address; later https://eraseai.ai
aws configure set region $REGION
echo "Account $ACCOUNT in $REGION"
```

**Coming back later in a new terminal?** Run 6.1, then this to look up what
the earlier steps created:

```bash
export VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
export SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC --query 'Subnets[].SubnetId' --output text)
export PRIVATE_SUBNETS=$(echo $SUBNETS | cut -d' ' -f2-)
export APP_SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$APP-apprunner --query 'SecurityGroups[0].GroupId' --output text)
export DB_SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$APP-db --query 'SecurityGroups[0].GroupId' --output text)
export DB_HOST=$(aws rds describe-db-instances --db-instance-identifier $APP-db --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null)
export DATABASE_URL="postgresql://eraseai:$DB_PASSWORD@$DB_HOST:5432/eraseai?sslmode=no-verify"
export VPC_CONNECTOR=$(aws apprunner list-vpc-connectors --query "VpcConnectors[?VpcConnectorName=='$APP-vpc'].VpcConnectorArn | [0]" --output text)
export SERVICE_ARN=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP'].ServiceArn | [0]" --output text)
```

### 6.2 Network: security groups in the default VPC

```bash
export VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
export SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC --query 'Subnets[].SubnetId' --output text)

# Group for App Runner's connection into the VPC
export APP_SG=$(aws ec2 create-security-group --group-name $APP-apprunner \
  --description "EraseAI App Runner" --vpc-id $VPC --query GroupId --output text)

# Group for the database: Postgres only from App Runner and from inside the VPC
export DB_SG=$(aws ec2 create-security-group --group-name $APP-db \
  --description "EraseAI database" --vpc-id $VPC --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $DB_SG --protocol tcp --port 5432 --source-group $APP_SG
aws ec2 authorize-security-group-ingress --group-id $DB_SG --protocol tcp --port 5432 \
  --cidr $(aws ec2 describe-vpcs --vpc-ids $VPC --query 'Vpcs[0].CidrBlock' --output text)
```

**Internet for private parts.** The app reaches the private database through a
VPC connector, so its outgoing traffic (Stripe, Resend, Google) also goes
through the VPC. That needs a NAT gateway: the first subnet stays public and
holds the NAT; the others become private and send internet traffic through it.

```bash
export PUBLIC_SUBNET=$(echo $SUBNETS | awk '{print $1}')
export PRIVATE_SUBNETS=$(echo $SUBNETS | cut -d' ' -f2-)
export EIP=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
export NAT=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET --allocation-id $EIP \
  --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT
export RT=$(aws ec2 create-route-table --vpc-id $VPC --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT
for s in $PRIVATE_SUBNETS; do aws ec2 associate-route-table --route-table-id $RT --subnet-id $s; done
echo "public: $PUBLIC_SUBNET  private: $PRIVATE_SUBNETS"
```

(Use a fresh account or a VPC with nothing else in it: this makes those
subnets private. A NAT gateway costs about US$40 a month plus data.)

### 6.3 Database (RDS for PostgreSQL 16)

```bash
aws rds create-db-subnet-group --db-subnet-group-name $APP-subnets \
  --db-subnet-group-description "EraseAI" --subnet-ids $SUBNETS

aws rds create-db-instance --db-instance-identifier $APP-db \
  --engine postgres --engine-version 16 \
  --db-instance-class db.t4g.small --allocated-storage 20 --storage-type gp3 \
  --master-username eraseai --master-user-password "$DB_PASSWORD" \
  --db-name eraseai --db-subnet-group-name $APP-subnets \
  --vpc-security-group-ids $DB_SG --no-publicly-accessible \
  --backup-retention-period 7 --storage-encrypted

aws rds wait db-instance-available --db-instance-identifier $APP-db   # ~10 minutes
export DB_HOST=$(aws rds describe-db-instances --db-instance-identifier $APP-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)
export DATABASE_URL="postgresql://eraseai:$DB_PASSWORD@$DB_HOST:5432/eraseai?sslmode=no-verify"
echo $DATABASE_URL
```

(`sslmode=no-verify` keeps the connection encrypted; RDS requires TLS and
Node doesn't ship Amazon's certificate authority.)

### 6.4 Copy the data from Replit

1. **Replit Shell** (production `DATABASE_URL` is in Publishing → Deployment
   secrets):

   ```bash
   pg_dump "PASTE-PRODUCTION-DATABASE_URL" --no-owner --no-privileges -Fc -f eraseai.dump
   ```

   Download `eraseai.dump` from the Files panel.

2. The database is private, so restore from inside the VPC: AWS console →
   **CloudShell** → Actions → **Create VPC environment** → choose the default
   VPC, one of the **private** subnets printed in 6.2, security group
   `eraseai-apprunner`. In that CloudShell tab:
   Actions → **Upload file** → `eraseai.dump`, then:

   ```bash
   sudo dnf install -y postgresql16
   pg_restore --no-owner --no-privileges \
     -d "postgresql://eraseai:YOUR-DB-PASSWORD@YOUR-DB-HOST:5432/eraseai?sslmode=require" eraseai.dump
   ```

   (Use the host printed in 6.3. Some "already exists" or "extension" notices
   are harmless.)

   Starting empty instead of copying? The core tables (`users`, `scans`…)
   come from the Drizzle schema, not from server startup. From the same VPC
   CloudShell, in a clone of the repository: `pnpm install` then
   `DATABASE_URL="postgresql://...?sslmode=no-verify" pnpm --filter @workspace/db run push`,
   then redeploy (6.9). Don't do this before a `pg_restore`: the restore
   expects an empty database.

### 6.5 Build the container and push it to ECR

On your computer, in a clone of the GitHub repository (`git pull` first):

```bash
aws ecr create-repository --repository-name $APP --image-scanning-configuration scanOnPush=true
aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# --platform matters on Apple Silicon Macs: App Runner runs x86_64 only
docker build --platform linux/amd64 -t $APP .
docker tag $APP:latest $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$APP:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$APP:latest
```

### 6.6 Secrets

Copy each value from Replit → Publishing → Deployment secrets. For a copy, use
**Stripe test keys** (see section 3).

```bash
put() { aws secretsmanager create-secret --name "$APP/$1" --secret-string "$2" --query ARN --output text; }
put DATABASE_URL "$DATABASE_URL"
put STRIPE_SECRET_KEY 'sk_test_...'
put STRIPE_PUBLISHABLE_KEY 'pk_test_...'
put SESSION_SECRET '...'
put ADMIN_BOOTSTRAP_PASSWORD '...'
put GOOGLE_CLIENT_ID '...'
put GOOGLE_CLIENT_SECRET '...'
put RESEND_API_KEY '...'
put GOOGLE_PLAY_SERVICE_ACCOUNT_JSON "$(cat play-service-account.json)"
```

To change one later: `aws secretsmanager put-secret-value --secret-id eraseai/NAME --secret-string 'new'`,
then redeploy (6.9).

### 6.7 Roles for App Runner

```bash
# Lets App Runner pull the image from ECR
aws iam create-role --role-name $APP-apprunner-ecr --assume-role-policy-document '{
  "Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name $APP-apprunner-ecr \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# Lets the running app read its secrets
aws iam create-role --role-name $APP-apprunner-instance --assume-role-policy-document '{
  "Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Service":"tasks.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam put-role-policy --role-name $APP-apprunner-instance --policy-name read-secrets --policy-document "{
  \"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",
  \"Action\":\"secretsmanager:GetSecretValue\",
  \"Resource\":\"arn:aws:secretsmanager:$REGION:$ACCOUNT:secret:$APP/*\"}]}"

# Connection from App Runner into the VPC (to reach the private database)
export VPC_CONNECTOR=$(aws apprunner create-vpc-connector --vpc-connector-name $APP-vpc \
  --subnets $PRIVATE_SUBNETS --security-groups $APP_SG \
  --query 'VpcConnector.VpcConnectorArn' --output text)
```

### 6.8 Create the App Runner service

```bash
sec() { aws secretsmanager describe-secret --secret-id "$APP/$1" --query ARN --output text; }
cat > apprunner.json <<JSON
{
  "ServiceName": "$APP",
  "SourceConfiguration": {
    "AuthenticationConfiguration": { "AccessRoleArn": "arn:aws:iam::$ACCOUNT:role/$APP-apprunner-ecr" },
    "AutoDeploymentsEnabled": false,
    "ImageRepository": {
      "ImageIdentifier": "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$APP:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "PUBLIC_BASE_URL": "$SITE",
          "WEB_BASE_URL": "$SITE"
        },
        "RuntimeEnvironmentSecrets": {
          "DATABASE_URL": "$(sec DATABASE_URL)",
          "STRIPE_SECRET_KEY": "$(sec STRIPE_SECRET_KEY)",
          "STRIPE_PUBLISHABLE_KEY": "$(sec STRIPE_PUBLISHABLE_KEY)",
          "SESSION_SECRET": "$(sec SESSION_SECRET)",
          "ADMIN_BOOTSTRAP_PASSWORD": "$(sec ADMIN_BOOTSTRAP_PASSWORD)",
          "GOOGLE_CLIENT_ID": "$(sec GOOGLE_CLIENT_ID)",
          "GOOGLE_CLIENT_SECRET": "$(sec GOOGLE_CLIENT_SECRET)",
          "RESEND_API_KEY": "$(sec RESEND_API_KEY)",
          "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON": "$(sec GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)"
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB",
    "InstanceRoleArn": "arn:aws:iam::$ACCOUNT:role/$APP-apprunner-instance"
  },
  "HealthCheckConfiguration": { "Protocol": "HTTP", "Path": "/api/healthz", "Interval": 10, "Timeout": 5, "HealthyThreshold": 1, "UnhealthyThreshold": 5 },
  "NetworkConfiguration": {
    "EgressConfiguration": { "EgressType": "VPC", "VpcConnectorArn": "$VPC_CONNECTOR" }
  }
}
JSON
export SERVICE_ARN=$(aws apprunner create-service --cli-input-json file://apprunner.json \
  --query 'Service.ServiceArn' --output text)
echo "Waiting for the first deploy (~5 minutes)…"
until [ "$(aws apprunner describe-service --service-arn $SERVICE_ARN --query Service.Status --output text)" != "OPERATION_IN_PROGRESS" ]; do sleep 20; done
aws apprunner describe-service --service-arn $SERVICE_ARN --query '[Service.Status, Service.ServiceUrl]' --output text
```

### 6.9 Check it, then redeploy after code changes

```bash
URL=https://$(aws apprunner describe-service --service-arn $SERVICE_ARN --query Service.ServiceUrl --output text)
curl -s $URL/api/healthz                 # {"status":"ok"}
curl -s $URL/api/auth/providers          # {"email":true,"google":true,...}
```

Open `$URL` in the browser: the site loads and existing accounts can log in.
Admin dashboard → Stripe setup → **Set up prices** (for the Stripe account
whose keys you stored).

After each code change: repeat the `docker build/tag/push` of 6.5, then

```bash
aws apprunner start-deployment --service-arn $SERVICE_ARN
```

Logs: CloudWatch → Log groups → `/aws/apprunner/eraseai/…/application`.

### 6.10 Your domain

```bash
aws apprunner associate-custom-domain --service-arn $SERVICE_ARN --domain-name aws.eraseai.ai
aws apprunner describe-custom-domains --service-arn $SERVICE_ARN \
  --query 'CustomDomains[0].CertificateValidationRecords' --output table
```

Add the shown CNAME records (and a CNAME `aws.eraseai.ai` → the service URL)
at your DNS provider. TLS is issued automatically within about 30 minutes.

Google sign-in on the copy: Google Cloud Console → Credentials → Web client →
add `https://aws.eraseai.ai/api/auth/google/callback`.

### 6.11 Switching the real site to AWS (when ready)

1. Store the **live** Stripe keys: `put-secret-value` for `eraseai/STRIPE_SECRET_KEY`
   and `eraseai/STRIPE_PUBLISHABLE_KEY`.
2. Fresh copy of the data: repeat 6.4 into an empty database (or drop and
   recreate the `eraseai` database first) right before switching.
3. `aws apprunner update-service --service-arn $SERVICE_ARN --source-configuration ...`
   with `PUBLIC_BASE_URL`/`WEB_BASE_URL` set to `https://eraseai.ai` (or edit
   them in the App Runner console → Configuration), then `associate-custom-domain`
   for `eraseai.ai` and `www.eraseai.ai`, and move the DNS records.
4. Stripe → Developers → Webhooks: delete the old Replit endpoint.
5. Google sign-in: keep `https://eraseai.ai/api/auth/google/callback` (already there).
6. Keep Replit running a few days, then stop its deployment.

The Chrome extension and the Android app call `https://eraseai.ai/api`, so
they move with the domain; no app update is needed.

### 6.12 Pause while idle, resume later

Paused, the copy costs about US$5–10 a month (database storage, secrets, image).

```bash
# Pause (run 6.1 and the "coming back later" block first)
aws apprunner pause-service --service-arn $SERVICE_ARN
aws rds stop-db-instance --db-instance-identifier $APP-db      # AWS restarts it after 7 days; stop it again
export NAT=$(aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[0].NatGatewayId' --output text)
export EIP=$(aws ec2 describe-nat-gateways --nat-gateway-ids $NAT --query 'NatGateways[0].NatGatewayAddresses[0].AllocationId' --output text)
aws ec2 delete-nat-gateway --nat-gateway-id $NAT
aws ec2 wait nat-gateway-deleted --nat-gateway-ids $NAT && aws ec2 release-address --allocation-id $EIP
```

```bash
# Resume: database, NAT gateway (the private route table already exists), app
aws rds start-db-instance --db-instance-identifier $APP-db
export PUBLIC_SUBNET=$(echo $SUBNETS | awk '{print $1}')
export EIP=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
export NAT=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET --allocation-id $EIP --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT
export RT=$(aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=$(echo $PRIVATE_SUBNETS | awk '{print $1}') --query 'RouteTables[0].RouteTableId' --output text)
aws ec2 replace-route --route-table-id $RT --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT
aws rds wait db-instance-available --db-instance-identifier $APP-db
aws apprunner resume-service --service-arn $SERVICE_ARN
```

### 6.13 Rough monthly cost (Singapore, before credits)

App Runner 1 vCPU / 2 GB, always on: ~US$50–65 · RDS db.t4g.small + 20 GB:
~US$35 · NAT gateway: ~US$40 + data · Secrets Manager: ~US$4 · ECR, logs:
a few dollars. About **US$135 a month**, so $10,000 of credits lasts years at
this size.
