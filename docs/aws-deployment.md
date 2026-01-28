# AWS Deployment Guide

Step-by-step guide to deploy the Social Platform Backend to AWS.

## Architecture Overview

**Recommended Setup (MVP):**

- **EC2** - Run Docker containers
- **RDS PostgreSQL** - Managed database
- **Security Groups** - Network security
- **Elastic IP** - Static IP address (optional)

**Alternative (More Scalable):**

- **ECS/Fargate** - Container orchestration
- **RDS PostgreSQL** - Managed database
- **Application Load Balancer** - Load distribution

---

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Docker installed locally (for building images)
- Domain name (optional, for custom domain)

---

## Option 1: EC2 + RDS (Recommended for MVP)

### Step 1: Create RDS PostgreSQL Database

1. Go to AWS Console → RDS → Create database
2. Choose **PostgreSQL**
3. Configuration:
   - **Template**: Free tier (or Production for real use)
   - **DB instance identifier**: `social-platform-db`
   - **Master username**: `postgres` (or your choice)
   - **Master password**: Generate strong password (save it!)
   - **DB instance class**: `db.t3.micro` (free tier) or `db.t3.small`
   - **Storage**: 20 GB (free tier) or as needed
   - **VPC**: Default VPC (or create new)
   - **Public access**: Yes (for EC2 connection)
   - **Security group**: Create new (we'll configure later)
4. Click **Create database**
5. **Wait for database to be available** (5-10 minutes)
6. Note the **Endpoint** (e.g., `social-platform-db.xxxxx.us-east-1.rds.amazonaws.com`)

### Step 2: Configure RDS Security Group

1. Go to RDS → Your database → Connectivity & security
2. Click on Security group
3. **Inbound rules** → Edit inbound rules → Add rule:
   - **Type**: PostgreSQL
   - **Source**: Custom → Your EC2 security group (we'll create this)
   - **Port**: 5432
   - Save rules

### Step 3: Create EC2 Instance

1. Go to AWS Console → EC2 → Launch instance
2. Configuration:
   - **Name**: `social-platform-backend`
   - **AMI**: Amazon Linux 2023 (or Ubuntu 22.04 LTS)
   - **Instance type**: `t3.micro` (free tier) or `t3.small`
   - **Key pair**: Create new or use existing (download .pem file!)
   - **Network settings**:
     - VPC: Default (or your VPC)
     - Auto-assign public IP: Enable
     - Security group: Create new
       - **Name**: `social-platform-backend-sg`
       - **Inbound rules**:
         - SSH (22) from My IP
         - HTTP (80) from Anywhere (0.0.0.0/0)
         - HTTPS (443) from Anywhere (0.0.0.0/0)
         - Custom TCP (4000) from Anywhere (for API, or restrict to your IP)
   - **Storage**: **20 GB or more** (8 GB often leads to "no space left" during Docker builds)
3. Click **Launch instance**

### Step 4: Connect to EC2 and Setup

**Connect via SSH:**

```bash
# Make key file executable
chmod 400 your-key.pem

# Connect to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
# For Ubuntu, use: ubuntu@YOUR_EC2_PUBLIC_IP
```

**Install Docker on EC2:**

```bash
# For Amazon Linux 2023
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Log out and back in for group changes
exit
# Then reconnect via SSH

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### Step 5: Deploy Application

**Option A: Deploy from GitHub (Recommended)**

```bash
# Install Git
sudo yum install git -y  # Amazon Linux
# or
sudo apt-get install git -y  # Ubuntu

# Clone repository
git clone https://github.com/your-username/social-platform-backend.git
cd social-platform-backend

# Create production .env file
nano .env.production
# Add your environment variables (see docs/env.production.template)
```

**Option B: Build and Push Docker Image**

1. Build image locally:

```bash
docker build -t social-platform-backend .
```

2. Tag and push to Amazon ECR (or Docker Hub):

```bash
# For Docker Hub
docker tag social-platform-backend your-username/social-platform-backend:latest
docker push your-username/social-platform-backend:latest
```

3. Pull on EC2:

```bash
docker pull your-username/social-platform-backend:latest
```

### Step 6: Configure Environment Variables

Create `.env.production` on EC2:

```bash
nano .env.production
```

Add:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@YOUR_RDS_ENDPOINT:5432/social_platform
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=30m
```

### Step 7: Update Security Group for RDS

1. Go to EC2 → Security Groups
2. Find your EC2 security group
3. Note the **Security Group ID**
4. Go to RDS → Your database → Security group
5. Edit inbound rules → Add:
   - **Type**: PostgreSQL
   - **Source**: Custom → Your EC2 security group ID
   - **Port**: 5432

### Step 8: Run Migrations and Deploy

**Option A: Use deployment script (Recommended)**

```bash
# On EC2
cd social-platform-backend

# Make script executable (if not already)
chmod +x scripts/deploy-aws.sh

# Run deployment
./scripts/deploy-aws.sh
```

**Option B: Manual deployment**

```bash
# On EC2
cd social-platform-backend

# Build image
docker compose -f docker-compose.aws.yml build

# Run migrations
docker compose -f docker-compose.aws.yml run --rm backend yarn prisma migrate deploy

# Start application
docker compose -f docker-compose.aws.yml up -d

# Check logs
docker compose -f docker-compose.aws.yml logs -f backend

# Check if running
curl http://localhost:4000/health
```

### Step 10: Configure Domain (Optional)

1. Get Elastic IP and assign to EC2 instance
2. Point your domain A record to Elastic IP
3. Update CORS in your backend to allow your domain

---

## Option 2: ECS/Fargate (More Scalable)

For production at scale, consider:

- **ECS with Fargate** - Serverless containers
- **Application Load Balancer** - Distribute traffic
- **RDS** - Managed database
- **CloudWatch** - Logging and monitoring

This requires more setup but provides better scalability.

---

## Automatic Deployment with GitHub Actions

Deploy to EC2 on every push to `main`.

### 1. Add GitHub secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret                | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| `EC2_HOST`            | EC2 public IP (e.g. `3.138.179.130`)                        |
| `EC2_SSH_PRIVATE_KEY` | Full contents of your `.pem` file (from `cat your-key.pem`) |

### 2. EC2 and repo

- EC2 has the repo in `~/social-platform-backend` and `origin` points at your GitHub repo.
- `.env.production` exists on EC2 (it is not in the repo).
- **Private repo:** use an SSH remote and a deploy key on EC2 so `git fetch` works without a password.

### 3. Behaviour

On **push to `main`**, the workflow will:

1. SSH into EC2
2. `cd ~/social-platform-backend`
3. `git fetch origin` and `git reset --hard origin/main`
4. Run `./scripts/deploy-aws.sh`

Workflow file: `.github/workflows/deploy-aws.yml`

---

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Health endpoint responds: `http://YOUR_EC2_IP:4000/health`
- [ ] API endpoints accessible
- [ ] CORS configured for frontend domain
- [ ] Environment variables set correctly
- [ ] Security groups configured properly
- [ ] Logs accessible (CloudWatch or local)
- [ ] Domain configured (if using)

---

## Monitoring & Maintenance

**View Logs:**

```bash
# On EC2
docker compose -f docker-compose.aws.yml logs -f backend
```

**Update Application:**

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.aws.yml up -d --build

# Or use deployment script
./scripts/deploy-aws.sh
```

**Database Backups:**

- RDS provides automated backups
- Configure backup retention in RDS settings

---

## Cost Estimation (MVP)

- **EC2 t3.micro**: Free tier eligible (750 hours/month)
- **RDS db.t3.micro**: Free tier eligible (750 hours/month)
- **Data transfer**: First 100 GB free
- **Total**: ~$0-15/month (depending on usage)

---

## Troubleshooting

**"kex_exchange_identification: read: Connection reset by peer" or "Connection reset by ... port 22":**

- The SSH connection to EC2 is being reset during the initial handshake (before the session starts). Often transient. The workflow now retries the deploy up to 3 times with a 45s delay.
- **If it persists:** Check EC2 instance status (running, healthy), security group (SSH/22 allowed from **GitHub Actions IPs** — use [GitHub meta API](https://api.github.com/meta) `hooks` or `actions` IPs, or temporarily 0.0.0.0/0 for debugging), and that sshd is running (`sudo systemctl status sshd`). Rate limiting (`MaxStartups` in sshd_config) or a flaky network can also cause this.

**"client_loop: send disconnect: Broken pipe" or SSH drops during deploy:**

- The SSH session from GitHub Actions to EC2 closed mid-build (often during `yarn install`). The workflow now uses `ServerAliveInterval` / `ServerAliveCountMax` to keep the connection alive.
- **If it still happens:** Run the deploy manually on EC2 inside `tmux` or `screen` so it survives disconnects:
  ```bash
  ssh -i your-key.pem ec2-user@YOUR_EC2_IP
  tmux new -s deploy
  cd ~/social-platform-backend && git pull && ./scripts/deploy-aws.sh
  # Detach: Ctrl+B, then D. Reattach later: tmux attach -t deploy
  ```
- **Long-term:** Build the Docker image in CI (e.g. push to ECR), then on EC2 only `docker pull` and restart. That shortens SSH usage and avoids build-time disk use on EC2.

**"ENOSPC: no space left on device" or "file appears to be corrupt" during Docker build:**

- The EC2 instance has run out of disk space. The deploy script now prunes unused Docker build cache and images before each build.
- **Manual fix:** SSH to EC2 and run:
  ```bash
  docker builder prune -af
  docker image prune -af
  ```
  Then re-run the deploy. Avoid `docker system prune --volumes` if you use Docker volumes for other services.
- **Long-term:** Use at least **20 GB** root volume for EC2 (see Step 3). If already created, resize the EBS volume in the EC2 console, then extend the filesystem (e.g. `sudo growpart /dev/xvda 1 && sudo xfs_growfs /` on Amazon Linux).

**Can't connect to database:**

- Check security group rules
- Verify DATABASE_URL in .env
- Check RDS is publicly accessible

**Application won't start:**

- Check logs: `docker compose logs backend`
- Verify environment variables
- Check port 4000 is open in security group

**High costs:**

- Use free tier resources
- Stop EC2 when not in use
- Monitor AWS Cost Explorer

---

## Next Steps

1. Set up CI/CD to auto-deploy on push
2. Configure CloudWatch for monitoring
3. Set up SSL certificate (HTTPS)
4. Configure auto-scaling (if needed)
5. Set up backup strategy
