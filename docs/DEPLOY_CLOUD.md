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

The server also creates any missing tables on start, so a fresh empty database
works too.

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

Steps on AWS mirror section 4: create the RDS database, `pg_restore` the dump,
store secrets, push the image to ECR, create an App Runner service from it on
port 8080 with the environment/secrets of section 3, and add the custom domain.
