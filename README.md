# Kampus.VC — Next-Gen AI Creator Marketplace & Escrow Platform

[![Deploy with Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://kampus-vc-mu.vercel.app)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://kampus-vc.onrender.com)
[![TypeScript Monorepo](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20Escrow-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)
[![Google Cloud](https://img.shields.io/badge/Auth-Google%20GIS%20OAuth%202.0-4285F4?style=for-the-badge&logo=google)](https://cloud.google.com/)

> **Kampus.VC** is an AI-powered marketplace and collaborative escrow workspace designed for top-tier digital creators (3D artists, VFX animators, motion designers, AI creative directors) and forward-thinking brands. It streamlines discovery, algorithmic matching, proposal negotiation, milestone deliverables, real-time messaging, and secure financial escrow with bank-grade double-entry ledger tracking.

---

## 🌐 Live Deployments & Repository

| Target | URL | Status |
| :--- | :--- | :--- |
| **Frontend Web App (Production)** | [https://kampus-vc-mu.vercel.app](https://kampus-vc-mu.vercel.app) | 🟢 Live |
| **Backend API Server (Production)** | [https://kampus-vc.onrender.com](https://kampus-vc.onrender.com) | 🟢 Live |
| **API Health Check** | [https://kampus-vc.onrender.com/api/health](https://kampus-vc.onrender.com/api/health) | 🟢 200 OK |
| **GitHub Repository** | [https://github.com/RNavvenkumar/kampus_vc](https://github.com/RNavvenkumar/kampus_vc) | 🟢 Public |

---

## ⚡ Quick Demo Accounts & Walkthrough

For hackathon judges and evaluators, the platform comes pre-seeded with clean, realistic collaborative data:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Brand / Client** | `brand@nike.com` | `Password123!` | **Nike Virtual Studios** — 3 active briefs, 1 active milestone project, ₹65,000 in escrow |
| **Lead Creator** | `creator@kampus.vc` | `Password123!` | **Elena Rostova** (3D Motion & VFX) — Active on *Air Max Dn 3D Campaign* |
| **Cinematographer** | `marcus.chen@creator.io` | `Password123!` | **Marcus Chen** — 5.0★ rating, completed projects |
| **Fashion Creator**| `priya.patel@creator.io` | `Password123!` | **Priya Patel** — 4.9★ rating, commercial portfolio |

> [!TIP]
> **1-Click Reset Demo Data**: At any time, you can click the **"Reset Demo Data"** button in the top banner of either the Creator or Brand dashboard. This immediately restores the database to a clean, active demo state.
>
> **1-Click Google Demo Sign-In**: On the login page, you can use the official Google button or click **"✨ Instant Google Demo Sign-In"** to bypass external popup restrictions.

---

## 🌟 Core Architecture & Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KAMPUS.VC MONOREPO                              │
├───────────────────────────────────┬────────────────────────────────────┤
│           FRONTEND                │              BACKEND               │
│  React 18 + Vite + TailwindCSS    │  Node.js + Express + TypeScript    │
│  Lucide Icons + Glassmorphism     │  MongoDB Atlas + Mongoose          │
├───────────────────────────────────┼────────────────────────────────────┤
│  • AI Search & Filter UI          │  • Semantic Search Intent Engine   │
│  • Brand & Creator Dashboards     │  • 5-Factor Explainable Matcher    │
│  • Milestone Workspaces           │  • Razorpay Escrow & Webhooks      │
│  • Media Dropzone & Playback      │  • Double-Entry Immutable Ledger   │
│  • WhatsApp-Style Direct Chat     │  • Pluggable Storage (Local/Cloud) │
│  • Google Identity Services (GIS) │  • Google OAuth2 Token Verifier    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

### 1. 🔍 Semantic AI Search & Explainable Matching
- **Natural Language Intent Parsing (`/api/creators/parse-search-intent`)**:
  - Translates freeform brand queries (e.g., *"Looking for an Unreal Engine 3D artist under ₹50,000 with immediate availability"*) into structured database query filters.
- **5-Factor Explainable Matching Algorithm (0–100 pts)**:
  - **Specialties Fit** (35 pts)
  - **Creative Tools Alignment** (25 pts)
  - **Verified Portfolio Evidence** (20 pts)
  - **Budget Alignment** (10 pts)
  - **Availability Status** (10 pts)
  - Yields transparent match scores, factor breakdown bars, and gap analysis.
- **Creator Opportunity Hub (`/creator/opportunities`)**:
  - Algorithmic feed ranking published briefs by creator compatibility.

### 2. 🛡️ Milestone Management & Deliverable Review
- **Role-Guarded Collaboration Workspace (`/api/projects/:projectId/*`)**:
  - Boundary-isolated spaces accessible only to contracted parties.
  - Immutable contract agreement snapshots protecting agreed prices and deliverables.
- **Interactive Deliverable Submission & Media Player**:
  - Versioned deliverables (v1, v2, v3...) with notes and asset attachments.
  - Inline HTML5 `<video controls>` player and high-resolution image cards.
  - 1-Click Quick Demo Presets:
    - 🎬 *3D Motion Reel (MP4)*
    - 🖼️ *4K Sneaker Hero Keyframe (PNG)*
    - ⚡ *Cyberpunk Color Grade Pass (PNG)*
- **Brand Review Pipeline**:
  - One-click approval with automatic escrow milestone payout trigger.
  - Revision request workflow with mandatory feedback explanation.

### 3. 💳 Razorpay Escrow, Ledger & Financial Dashboard
- **Gateway Abstraction (`IPaymentProvider`)**: Pluggable interface supporting real Razorpay REST API calls and offline mock modes.
- **Minor Units Financial Exactness**: All amounts handled in exact minor currency units across 8 global currencies (`INR`, `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `SGD`, `AED`).
- **Cryptographic Signature Verification**: Timing-safe HMAC-SHA256 signature verification for checkouts and webhooks.
- **Double-Entry Immutable Accounting (`FinancialLedgerEntry`)**:
  - Balanced transactions enforcing `Sum(Debit) === Sum(Credit)`.
  - Append-only records tracking `brand_funds`, `escrow_hold`, `creator_earnings`, and `platform_revenue`.
- **Live Dashboard Payout Metrics**:
  - Dedicated column under the welcome banner detailing pending creator earnings and platform fee obligations.

### 4. 💬 WhatsApp-Style Direct Messaging
- Real-time conversation stream with partner status badges, unread message counts, search filters, and persistent history.
- Modal popup chat option accessible from anywhere across the platform.

### 5. 🔐 Google OAuth 2.0 & Session Security
- Native Google Identity Services (GIS) One Tap and standard button integration.
- Server-side ID token verification via `google-auth-library`.
- Sanitized origin handling eliminating invisible whitespace and `%0A` newline issues.
- `httpOnly`, `SameSite=Lax`, cryptographically signed session cookies.

---

## 📁 Repository Structure

```
kampus_vc/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment validation (Zod) & database config
│   │   ├── controllers/        # Express request handlers (Auth, Projects, Payments, Media, AI)
│   │   ├── models/             # Mongoose schemas (User, Brief, Project, Payment, Ledger, etc.)
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── scripts/            # Database seed and reset automation (seed.ts)
│   │   ├── services/           # Business logic (AI Search, Sessions, Ledger, Matching)
│   │   ├── storage/            # Local and S3/Cloudinary media storage providers
│   │   └── tests/              # Vitest automated integration suite
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/                 # Static brand assets and favicons
│   ├── src/
│   │   ├── components/         # Reusable UI components, Modals, Dropzones, Chat
│   │   ├── context/            # Global Auth and State context
│   │   ├── pages/              # Route pages (Dashboards, Explore, Projects, Auth)
│   │   ├── services/           # Axios HTTP client and API definitions
│   │   ├── types/              # Comprehensive TypeScript interfaces
│   │   └── App.tsx             # Application router
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docs/                       # Architecture diagrams and deployment specifications
├── package.json                # Monorepo root scripts
└── README.md
```

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/kampus-vc`) or MongoDB Atlas connection string.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/RNavvenkumar/kampus_vc.git
cd kampus_vc
npm install
```

### 2. Configure Environment Variables

Create `.env` in the root directory:
```env
# Server
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/kampus-vc
SESSION_SECRET=your_super_secure_session_secret_min_32_chars
LOG_LEVEL=debug

# Google OAuth 2.0 (Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Razorpay Payments (Test Mode)
PAYMENT_PROVIDER=razorpay
RAZORPAY_ENVIRONMENT=test
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key

# Cloudinary Media Storage
MEDIA_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_NAME="Kampus.VC"
VITE_ENABLE_DEMO_MODE=true
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
```

### 3. Seed Demo Data
```bash
cd backend
npm run seed
```

### 4. Run Concurrent Development Servers
```bash
# From workspace root:
npm run dev:backend     # Starts Express on http://localhost:4000
npm run dev:frontend    # Starts Vite on http://localhost:5173
```

---

## 🧪 Testing & Validation

The codebase includes an integration test suite testing authentication, proposal bidding, agreement snapshots, deliverable review, payment escrows, and ledger balances.

```bash
# Run Vitest integration test suite (16 test suites, 108 tests)
npm run test

# Run strict TypeScript build validation across workspaces
npm run build
```

---

## 📡 Key REST API Endpoints

### Authentication & Users
- `POST /api/auth/register` — Create brand or creator account.
- `POST /api/auth/login` — Email/password login with secure session cookie.
- `POST /api/auth/google` — Google OAuth 2.0 ID token authentication.
- `GET /api/auth/me` — Retrieve active user session profile.
- `POST /api/auth/logout` — Invalidate session and destroy cookies.

### Campaigns & Opportunities
- `GET /api/briefs` — Query published campaign briefs with filtering.
- `POST /api/briefs` — Author a new brand campaign brief.
- `GET /api/creator/opportunities` — Creator feed ranked by compatibility score.
- `GET /api/brand/briefs/:id/matches` — Explainable creator matches for a campaign.

### Projects & Milestones
- `GET /api/projects` — List user's active and completed projects.
- `GET /api/projects/:id` — Get project details, milestones, and agreement terms.
- `POST /api/projects/:id/milestones/:mId/submissions` — Submit deliverable media.
- `POST /api/projects/:id/submissions/:sId/review` — Approve deliverable or request revision.

### Escrow & Payments
- `POST /api/projects/:id/payments/orders` — Create Razorpay escrow order.
- `POST /api/payments/verify` — Verify cryptographic signature & fund escrow.
- `GET /api/projects/:id/financials` — Get escrow balance and immutable ledger history.
- `POST /api/payments/:id/refunds` — Process full or partial escrow refund.

### Platform Management
- `POST /api/seed` — Instant remote database reset and realistic demo re-seed.
- `GET /api/health` — Service liveness and database connection status.

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: [@RNavvenkumar](https://github.com/RNavvenkumar)
- **Built for**: Advanced Creator-Brand Collaboration & Secure Escrow Hackathon Showcase.