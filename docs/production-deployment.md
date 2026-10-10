# KAMPUS.VC — PRODUCTION DEPLOYMENT & OPERATIONS GUIDE
**Phase 11: Production Readiness, Security Hardening, Reliability & Operations**

---

## 1. System Architecture & Topology

Kampus.VC is an AI-powered creator-brand marketplace and collaborative workspace built with a decoupled monorepo architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│   (React 18 + Vite + TailwindCSS + Google GIS + Razorpay)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Reverse Proxy / CDN                    │
│                 (Nginx / Cloudflare / Caddy)                │
└──────────────┬───────────────────────────────┬──────────────┘
               │ /api/*                        │ /* (Static SPA)
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Node.js Express API     │ │    Static Web Hosting      │
│  (Helmet, CORS, Rate-Limit,  │ │  (Vercel / Netlify / S3 /  │
│   Auth, Payments, AI Studio) │ │       Cloudflare Pages)    │
└──────────────┬───────────────┘ └────────────────────────────┘
               │
    ┌──────────┼──────────────────────┐
    ▼          ▼                      ▼
┌────────┐ ┌───────────────┐ ┌─────────────────┐
│ MongoDB│ │  Cloudinary   │ │ Razorpay Gateway│
│ Atlas  │ │ Object Storage│ │ (Orders/Webhook)│
└────────┘ └───────────────┘ └─────────────────┘
```

---

## 2. Environment Configuration Matrix

### Server-Only Secrets (`backend/.env` / Production Secret Manager)
> [!CAUTION]
> These variables MUST NEVER be bundled into frontend assets or exposed publicly.

| Variable Name | Required | Default / Description |
| :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `4000` (or injected cloud port) |
| `FRONTEND_ORIGIN` | Yes | Canonical production web URL (e.g. `https://kampus.vc`) |
| `MONGODB_URI` | Yes | Production MongoDB Atlas Replica Set connection string |
| `SESSION_SECRET` | Yes | Cryptographically random secret (min. 32 characters) |
| `SESSION_COOKIE_NAME` | No | `kampus_session` |
| `SESSION_TTL_HOURS` | No | `72` |
| `COOKIE_SECURE` | Yes | `true` (enforces HTTPS-only cookies in production) |
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud Console OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud Console OAuth 2.0 Client Secret |
| `PAYMENT_PROVIDER` | Yes | `razorpay` |
| `RAZORPAY_ENVIRONMENT` | Yes | `test` or `live` |
| `RAZORPAY_KEY_ID` | Yes | Razorpay Key ID (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay Key Secret |
| `MEDIA_STORAGE_PROVIDER` | Yes | `cloudinary` (or `s3` / `local`) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret |
| `AI_PROVIDER` | No | `gemini` / `disabled` |
| `AI_API_KEY` | No | Google Gemini API Key |

### Frontend Public Variables (`frontend/.env`)
> [!NOTE]
> Only variables prefixed with `VITE_` are bundled into client-side code.

| Variable Name | Required | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Public backend API URL (e.g. `https://api.kampus.vc/api` or `/api`) |
| `VITE_APP_NAME` | No | `Kampus.VC` |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Public Google Client ID for Google Identity Services |
| `VITE_RAZORPAY_KEY_ID` | Yes | Public Razorpay Key ID for checkout popup |
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes | Public Cloud Name for asset delivery |

---

## 3. Production Build & Deployment Procedures

### Step 1: Pre-Deployment Build Verification
```bash
# In the root repository
npm run build
```
This executes `tsc && vite build` in the frontend and `tsc` in the backend to ensure zero compilation or type errors.

### Step 2: Running the Production Backend Service
Using **PM2**, **Docker**, or **Systemd**:
```bash
cd backend
NODE_ENV=production node dist/server.js
```

### Step 3: Frontend Static Asset Serving
Serve the contents of `frontend/dist` through a CDN or Nginx with SPA routing fallback to `index.html`.

**Nginx Configuration Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name kampus.vc;

    root /var/www/kampus-vc/frontend/dist;
    index index.html;

    # Static SPA routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API traffic
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }
}
```

---

## 4. Health & Readiness Monitoring

Kampus.VC provides two monitoring endpoints:

### Liveness Probe (`GET /api/health`)
- Returns `200 OK` if the process is responsive.
- Includes correlation `requestId`, uptime, environment, and memory consumption.

### Readiness Probe (`GET /api/health/ready`)
- Returns `200 OK` when critical dependencies (MongoDB, Storage Provider) are connected and ready to accept live traffic.
- Returns `503 Service Unavailable` if MongoDB is down, signaling load balancers to withhold traffic.

---

## 5. Database Backup, Restore & Migration Runbook

### MongoDB Atlas Automated Backups
1. Enable **Continuous Cloud Backups (PITR)** in MongoDB Atlas.
2. Standard retention: 7 days of point-in-time recovery + daily snapshots.

### Manual Backup (CLI)
```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/kampus-vc" --out=/backups/$(date +%F)/
```

### Manual Restore (CLI)
```bash
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/kampus-vc" --drop /backups/2026-10-10/kampus-vc/
```

### Schema & Index Management
All indexes (including unique composite constraints on proposals, payments, and `googleId`) are enforced programmatically in Mongoose models upon connection initialization.

---

## 6. Operational Troubleshooting Guide

| Symptom | Diagnostic Step | Resolution |
| :--- | :--- | :--- |
| **Google Sign-In Error (401)** | Check server log correlation ID for `INVALID_GOOGLE_TOKEN`. | Verify Authorized JavaScript origins in Google Cloud Console matches current domain. |
| **Cloudinary Upload Fails** | Check `fields.signature` and `timestamp`. | Verify `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in backend `.env`. |
| **Razorpay Payment Verification Failed** | Check signature mismatch in `paymentController.ts`. | Ensure `RAZORPAY_KEY_SECRET` matches the key used to generate the order. |
| **Webhook 400 Signature Mismatch** | Verify raw body parser order in `app.ts`. | Confirm `req.rawBody` is captured before JSON body mutation. |
| **503 on `/api/health/ready`** | Inspect `checks.database` in response. | Verify MongoDB connection string and IP whitelist in MongoDB Atlas. |
