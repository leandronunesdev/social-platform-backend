# Multi-Environment Setup (Staging + Production)

This guide walks you through setting up **develop → staging** and **main → production** deployments.

| Branch   | Environment | API URL                                      |
| -------- | ----------- | -------------------------------------------- |
| `develop` | Staging     | https://api.dev.socialmediaplatform.online/ |
| `main`    | Production  | https://api.socialmediaplatform.online/     |

---

## 1. AWS Infrastructure

### 1.1 Create Staging EC2 Instance

1. **EC2 Dashboard** → **Launch instance**
2. Use the same AMI and instance type as production (e.g. Amazon Linux 2023, t3.micro/small)
3. Create or reuse a security group with:
   - **Inbound:** 22 (SSH), 80 (HTTP), 443 (HTTPS) from appropriate sources
4. Create a new key pair for staging (or reuse production key if acceptable)
5. **Allocate Elastic IP** → Associate with the new staging instance

### 1.2 Database (RDS)

**Recommended:** Create a separate RDS instance or database for staging to isolate data.

- **Option A:** New RDS instance (e.g. `social-platform-staging-db`)
- **Option B:** Same RDS instance, different database (e.g. `social_platform_staging`)

### 1.3 Install Software on Staging EC2

SSH into the staging EC2 and run:

```bash
# Install Docker (Amazon Linux 2023)
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Nginx and Certbot (for HTTPS)
sudo dnf install -y nginx certbot python3-certbot-nginx

# Clone the repo (use develop branch)
cd ~
git clone https://github.com/YOUR_ORG/social-platform-backend.git
cd social-platform-backend
git checkout develop
```

---

## 2. DNS (GoDaddy)

In **GoDaddy** → **My Products** → **socialmediaplatform.online** → **DNS**:

| Type | Name      | Value                 | TTL | Notes              |
| ---- | --------- | --------------------- | --- | ------------------ |
| A    | `api.dev` | Staging EC2 Elastic IP | 600 | Staging API        |
| A    | `api`     | Production EC2 Elastic IP | 600 | Production API (existing) |

---

## 3. SSL Certificate for Staging

SSH into **staging** EC2:

```bash
# Ensure DNS for api.dev.socialmediaplatform.online points to this instance first!
sudo certbot certonly --nginx -d api.dev.socialmediaplatform.online
```

Create Nginx config:

```bash
sudo nano /etc/nginx/conf.d/social-platform-api-staging.conf
```

```nginx
server {
    listen 80;
    server_name api.dev.socialmediaplatform.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.dev.socialmediaplatform.online;

    ssl_certificate     /etc/letsencrypt/live/api.dev.socialmediaplatform.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.dev.socialmediaplatform.online/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

---

## 4. Environment File on Staging EC2

On the **staging** EC2, create `.env.staging`:

```bash
cd ~/social-platform-backend
cp docs/env.staging.template .env.staging
nano .env.staging
```

Fill in:

- `DATABASE_URL` – staging RDS/database connection string
- `JWT_SECRET` – **different from production**
- `CORS_ORIGIN` – allowed frontend origins (include dev frontend if any)
- `API_BASE_URL` – `https://api.dev.socialmediaplatform.online`

---

## 5. GitHub Secrets

In **GitHub** → **Repository** → **Settings** → **Secrets and variables** → **Actions**:

### Add Staging Secrets

| Secret Name                | Value                                  |
| -------------------------- | -------------------------------------- |
| `EC2_HOST_STAGING`         | Staging EC2 hostname or IP             |
| `EC2_SSH_PRIVATE_KEY_STAGING` | Full contents of staging SSH `.pem` file |

### Existing Production Secrets

| Secret Name          | Value                             |
| -------------------- | --------------------------------- |
| `EC2_HOST`           | Production EC2 hostname or IP     |
| `EC2_SSH_PRIVATE_KEY`| Full contents of production `.pem`|

---

## 6. GitHub Environments (Optional)

The workflow uses `staging` and `production` environments. GitHub creates them automatically on first run. You can add protection rules:

1. **Settings** → **Environments** → **New environment**
2. Create `staging` and `production`
3. Optionally:
   - **Required reviewers** for `production`
   - **Environment secrets** instead of repository secrets

---

## 7. Verification

### Staging

1. Push to `develop` → workflow deploys to staging EC2
2. Open: https://api.dev.socialmediaplatform.online/health  
   - Expected: `{"status":"ok"}`

### Production

1. Merge to `main` (or push to `main`) → workflow deploys to production EC2
2. Open: https://api.socialmediaplatform.online/health  
   - Expected: `{"status":"ok"}`

---

## 8. Deployment Flow Summary

```
develop branch  →  push  →  deploy-staging job  →  Staging EC2 (origin/develop)
main branch     →  push  →  deploy-production job →  Production EC2 (origin/main)
```

---

## 9. Manual Deploy

If needed, deploy manually on EC2:

```bash
# Staging
cd ~/social-platform-backend
git fetch origin
git reset --hard origin/develop
./scripts/deploy-aws.sh staging

# Production
git reset --hard origin/main
./scripts/deploy-aws.sh production
```

---

## 10. Troubleshooting

| Issue                            | Check                                                                 |
| -------------------------------- | --------------------------------------------------------------------- |
| Staging workflow fails           | `EC2_HOST_STAGING`, `EC2_SSH_PRIVATE_KEY_STAGING` set in GitHub       |
| `.env.staging not found`         | Create `.env.staging` on staging EC2 from `docs/env.staging.template` |
| api.dev DNS not resolving        | GoDaddy A record `api.dev` → staging Elastic IP                       |
| SSL error on api.dev             | Run Certbot for `api.dev.socialmediaplatform.online` on staging EC2   |
| Wrong branch deployed            | Workflow uses `origin/develop` for staging, `origin/main` for prod    |
