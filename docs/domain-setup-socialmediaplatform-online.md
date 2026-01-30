# Domain Implementation Plan: socialmediaplatform.online

Use your GoDaddy domain **socialmediaplatform.online** for both backend (API) and frontend (web app) with HTTPS.

---

## 1. Subdomain Strategy

| Subdomain                             | Purpose                | Points To                                |
| ------------------------------------- | ---------------------- | ---------------------------------------- |
| **api.socialmediaplatform.online**    | Backend REST API (EC2) | Your EC2 instance (via Elastic IP)       |
| **www.socialmediaplatform.online**    | Frontend (Next.js)     | Vercel / Netlify / S3+CloudFront         |
| **socialmediaplatform.online** (apex) | Main site              | Redirect to `www` or serve same as `www` |

**Why subdomains?**

- Clear separation: API vs app
- Different SSL certs and hosts
- Frontend can be on Vercel/Netlify (free SSL); backend on EC2 with its own SSL

---

## 2. Prerequisites Checklist

- [ ] Domain **socialmediaplatform.online** in GoDaddy (you have this)
- [ ] Backend on AWS EC2 with Docker (you have this)
- [ ] **Elastic IP** assigned to EC2 (so DNS A record doesn’t break on restart)
- [ ] Frontend repo (Next.js) — decide where to host: **Vercel** (recommended), Netlify, or AWS

---

## 3. Phase 1: EC2 Static IP (Elastic IP)

Do this first so the API hostname never changes.

1. **AWS Console** → **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. **Actions** → **Associate Elastic IP address** → select your backend EC2 instance
3. Note the **Elastic IP** (e.g. `3.138.179.130`) — you’ll use it in GoDaddy DNS

If you skip this, the EC2 public IP can change on stop/start and your API DNS will break.

---

## 4. Phase 2: GoDaddy DNS Records

In **GoDaddy** → **My Products** → **socialmediaplatform.online** → **DNS** (or **Manage DNS**).

### Records to add/update

| Type               | Name  | Value                          | TTL | Notes                  |
| ------------------ | ----- | ------------------------------ | --- | ---------------------- |
| **A**              | `api` | `<your-ec2-elastic-ip>`        | 600 | Backend API            |
| **CNAME**          | `www` | `<vercel-or-netlify-hostname>` | 600 | Frontend (see Phase 5) |
| **A** or **CNAME** | `@`   | Same as `www` or redirect      | 600 | Apex — see below       |

**Apex (root) domain options:**

- **Option A (recommended):** Redirect `socialmediaplatform.online` → `https://www.socialmediaplatform.online` (GoDaddy often has “Forwarding” for this).
- **Option B:** Point `@` to the same place as `www` (e.g. Vercel/Netlify gives you instructions for apex).

**Example after Phase 5 (Vercel):**

- `api` → A → `3.138.179.130` (your Elastic IP)
- `www` → CNAME → `cname.vercel-dns.com` (or what Vercel shows)
- `@` → Redirect to `https://www.socialmediaplatform.online`

Save DNS and wait 5–60 minutes for propagation (you can check with `dig api.socialmediaplatform.online` or [dnschecker.org](https://dnschecker.org)).

---

## 5. Phase 3: HTTPS for Backend (api.socialmediaplatform.online)

Right now the app listens on port 4000. To serve **HTTPS on 443** and keep a single domain, use **Nginx as a reverse proxy** on EC2 and **Let’s Encrypt** for a free certificate.

### 3.1 Install Nginx and Certbot on EC2

SSH into EC2, then:

**Amazon Linux 2023:**

```bash
sudo dnf install -y nginx
sudo dnf install -y certbot python3-certbot-nginx
# or if not available:
# sudo dnf install -y certbot
# sudo certbot certonly --standalone -d api.socialmediaplatform.online
```

**Ubuntu:**

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3.2 Get SSL certificate

First ensure **only** Nginx will use port 80 (temporarily stop your app on 80 if anything is there). Then:

```bash
sudo certbot certonly --nginx -d api.socialmediaplatform.online
```

Follow prompts (email, agree to terms). Certificates will be under something like `/etc/letsencrypt/live/api.socialmediaplatform.online/`.

### 3.3 Nginx config for API

Create:

```bash
sudo nano /etc/nginx/conf.d/social-platform-api.conf
```

Paste (replace paths if Certbot gave different ones):

```nginx
server {
    listen 80;
    server_name api.socialmediaplatform.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.socialmediaplatform.online;

    ssl_certificate     /etc/letsencrypt/live/api.socialmediaplatform.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.socialmediaplatform.online/privkey.pem;

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

Enable and reload:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

### 3.4 EC2 Security Group

- **Inbound:** allow **80** (HTTP) and **443** (HTTPS) from `0.0.0.0/0` (or restrict later).
- You can remove public access to **4000** if you want traffic only via Nginx (80/443).

### 3.5 Auto-renew certificate (optional but recommended)

```bash
sudo certbot renew --dry-run
```

Add a cron job if not present:

```bash
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
```

After this, **https://api.socialmediaplatform.online/health** should work.

---

## 6. Phase 4: Backend App Configuration

On EC2, in `~/social-platform-backend`, update `.env.production`:

```env
# CORS: allow your frontend origin
CORS_ORIGIN=https://www.socialmediaplatform.online

# Swagger "Try it out" base URL
API_BASE_URL=https://api.socialmediaplatform.online
```

If you use a single-page app on the apex as well:

```env
CORS_ORIGIN=https://www.socialmediaplatform.online,https://socialmediaplatform.online
```

Redeploy so the app picks up the new env:

```bash
./scripts/deploy-aws.sh
```

---

## 7. Phase 5: Frontend Hosting and DNS

### Option A: Vercel (recommended for Next.js)

1. Push your frontend repo to GitHub (if not already).
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the frontend repo.
3. In **Settings** → **Environment Variables** add:
   - `NEXT_PUBLIC_API_URL` = `https://api.socialmediaplatform.online`
4. In **Settings** → **Domains** add:
   - `www.socialmediaplatform.online`
   - `socialmediaplatform.online` (apex — Vercel will show how to set it in GoDaddy, often CNAME or A records).
5. In **GoDaddy DNS** add the records Vercel tells you (e.g. CNAME `www` → `cname.vercel-dns.com`).

Vercel will issue HTTPS for your domain automatically.

### Option B: Netlify

1. Connect repo at [netlify.com](https://netlify.com).
2. Set `NEXT_PUBLIC_API_URL` = `https://api.socialmediaplatform.online`.
3. Add custom domain `www.socialmediaplatform.online` (and apex if desired).
4. In GoDaddy, add the CNAME/A records Netlify provides.

### Option C: AWS (S3 + CloudFront + optional Amplify)

- Use CloudFront in front of S3 (or Next.js export), request an ACM certificate in **us-east-1** for `www.socialmediaplatform.online` and `socialmediaplatform.online`, then point GoDaddy to CloudFront (CNAME or A with ALIAS if supported).

---

## 8. Phase 6: Frontend Environment Variable

In your **frontend** project (Vercel/Netlify env or `.env.production`):

```env
NEXT_PUBLIC_API_URL=https://api.socialmediaplatform.online
```

Redeploy the frontend after setting this so all API calls use the new URL.

---

## 9. Implementation Order Summary

| Step | Task                                                                                        | Owner |
| ---- | ------------------------------------------------------------------------------------------- | ----- |
| 1    | Allocate and associate **Elastic IP** to EC2                                                | You   |
| 2    | In **GoDaddy**, add **A** record: `api` → Elastic IP                                        | You   |
| 3    | On EC2: install **Nginx** + **Certbot**, get cert for `api.socialmediaplatform.online`      | You   |
| 4    | On EC2: add Nginx reverse proxy config, open 80/443 in security group                       | You   |
| 5    | Update backend **.env.production** (CORS_ORIGIN, API_BASE_URL), redeploy                    | You   |
| 6    | Deploy frontend to **Vercel** (or Netlify), set `NEXT_PUBLIC_API_URL`                       | You   |
| 7    | In GoDaddy, add **CNAME** for `www` (and apex) to Vercel/Netlify                            | You   |
| 8    | Test: https://api.socialmediaplatform.online/health, https://www.socialmediaplatform.online | You   |

---

## 10. Verification Checklist

- [ ] `https://api.socialmediaplatform.online/health` returns `{"status":"ok"}`
- [ ] `https://api.socialmediaplatform.online/api-docs` loads Swagger UI
- [ ] `https://www.socialmediaplatform.online` loads the Next.js app
- [ ] From the app, login/register/profile use the API (no CORS errors)
- [ ] Browser shows padlock (valid HTTPS) for both api and www

---

## 11. Optional: Apex Redirect in GoDaddy

To redirect **socialmediaplatform.online** → **https://www.socialmediaplatform.online**:

- In GoDaddy: **Domain** → **Forwarding** → Add forwarding: `socialmediaplatform.online` → `https://www.socialmediaplatform.online` (301 permanent).

---

## 12. Troubleshooting

| Issue                                        | Check                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| api.socialmediaplatform.online not resolving | DNS propagation (wait up to 1 hour), A record points to Elastic IP                                                  |
| Certificate errors on API                    | Nginx config paths, Certbot ran for `api.socialmediaplatform.online`                                                |
| CORS errors from frontend                    | Backend `CORS_ORIGIN` includes exact frontend origin (e.g. `https://www.socialmediaplatform.online`)                |
| 502 Bad Gateway from Nginx                   | Backend container is running: `docker compose -f docker-compose.aws.yml ps` and `curl http://127.0.0.1:4000/health` |

---

**Domain:** socialmediaplatform.online
**Backend:** https://api.socialmediaplatform.online
**Frontend:** https://www.socialmediaplatform.online

Once DNS and SSL are in place, update any links or docs (e.g. README, implementation-review) to use these URLs.
