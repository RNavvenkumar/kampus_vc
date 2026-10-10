# Kampus.VC

> **Kampus.VC** is an AI-powered creator marketplace and creative collaboration platform connecting AI artists, motion designers, 3D animators, filmmakers, and digital creators with brands, agencies, and businesses.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on Node v24 LTS)
- **npm**: v9+ (tested on npm v11)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/kampus-vc`) or MongoDB Atlas URI (Note: the automated test suite includes embedded `mongodb-memory-server` and runs self-contained without external database setup).

### 1. Installation
Install all dependencies across the monorepo with a single command:
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Running Locally

```bash
# Terminal 1: Backend API (port 4000)
npm run dev:backend

# Terminal 2: Frontend App (port 5173)
npm run dev:frontend
```

#### Open the Application:
- **Frontend Web App:** [http://localhost:5173](http://localhost:5173)
- **Creator Discovery & Semantic Search:** [http://localhost:5173/explore](http://localhost:5173/explore)
- **Creator Opportunity Discovery:** [http://localhost:5173/creator/opportunities](http://localhost:5173/creator/opportunities)
- **AI Creative Studio:** [http://localhost:5173/brand/creative-studio](http://localhost:5173/brand/creative-studio)
- **Public Campaign Directory:** [http://localhost:5173/briefs](http://localhost:5173/briefs)
- **Creator Proposals:** [http://localhost:5173/creator/proposals](http://localhost:5173/creator/proposals)
- **Brand Proposal Review Center:** [http://localhost:5173/brand/proposals](http://localhost:5173/brand/proposals)
- **Awarded Projects:** [http://localhost:5173/projects](http://localhost:5173/projects)
- **Backend Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🚀 Phase 6 Features Implemented: Intelligent Discovery & Explainable Matching

### 1. Intelligent Creator Discovery & Multi-Filter Engine (`/api/creators/search`)
- **Multi-Factor Filtering**: Category, creative tools (Blender, Unreal Engine, Midjourney, etc.), specialties, min/max price range, currency (USD, EUR, GBP, etc.), availability status, and experience level.
- **Sorting Options**: Best Match score, Price (Low to High / High to Low), Newest, and Experience Level.
- **Privacy Enforcement**: Strictly hides private portfolio items (`isPublic: false`) and draft services from search results; prevents PII leakage (emails, password hashes).
- **ReDoS Safety**: Safe regular expression escaping on all natural text search inputs.

### 2. Natural Language AI Search Intent Parser (`/api/creators/parse-search-intent`)
- Translates free-form brand prompts (e.g., *"Looking for an Unreal Engine 3D artist under $5000 with immediate availability"*) into structured filter parameters.
- Combines Gemini structured generation with an instant, deterministic regex heuristic fallback.

### 3. Explainable Creator–Campaign Matching Engine (`/api/brand/briefs/:briefId/matches`)
- **Deterministic 5-Factor Scoring (0–100 pts)**:
  - Primary Specialties Fit (up to 35 pts)
  - Creative Tools Match (up to 25 pts)
  - Verified Portfolio Evidence Citations (up to 20 pts)
  - Budget & Currency Alignment (up to 10 pts)
  - Availability Status (up to 10 pts)
- **Transparent Explainability**: Returns overall match percentage, breakdown per factor, specific portfolio piece citations, matching strengths, and candidate gap analysis.
- **Access Control**: Enforces brand ownership over campaign briefs.

### 4. Creator-Facing Campaign Opportunity Discovery (`/api/creator/opportunities`)
- Personalized campaign discovery feed ranking published briefs by creator compatibility score.
- Annotates campaigns with creator pitch status (`hasPitched`, `proposalStatus`, `proposalId`) and direct pitch call-to-action.
- Dedicated single-campaign compatibility checker endpoint (`/api/creator/opportunities/:briefId/compatibility`).

### 5. Modern Frontend Experiences
- **Brand Creator Discovery Gallery (`/explore`, `/brand/creators`)**: Interactive search bar with AI natural language intent prompt trigger, live filter drawer, and creator profile preview modal.
- **Brand Campaign Matches View (`/brand/briefs/:briefId/matches`)**: Visual match gauge, factor breakdown progress bars, portfolio citation links, and invite/pitch review CTAs.
- **Creator Opportunities Hub (`/creator/opportunities`)**: Compatibility score badges, factor summaries, and one-click pitch navigation.

---

## 🔒 Phase 7 Features Implemented: Secure Media Uploads & Object Storage

### 1. Production Storage Provider Abstraction (`IStorageProvider`)
- **Pluggable Architecture**: Seamless switching between `local` (filesystem with cryptographic HMAC URLs) and `s3` (AWS S3, Cloudflare R2, MinIO with SigV4 presigned URLs).
- **Direct-to-Storage Uploads**: Short-lived (15 min) pre-authenticated upload URLs with real-time browser progress reporting (`0%` → `100%`).
- **Path Traversal Fortress**: Server-side UUID key assignment rejecting leading slashes, path traversal sequences (`..`), and absolute drive paths.

### 2. Multi-Tier Media Security & Verification
- **Magic Byte Signature Inspection**: Server-side validation of raw file signatures (JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime MOV) independent of client MIME headers.
- **SVG & Script Blocking**: Rejects SVGs and script payloads to eliminate stored Cross-Site Scripting (XSS) and XML External Entity (XXE) vulnerabilities.
- **Safe Dimension Extraction**: Header-only binary parsing for PNG, JPEG, and GIF dimensions without invoking heavy or vulnerable native processes.

### 3. Portfolio Asset Management & Lifecycle
- **Ownership & Access Controls**: Strict asset ownership isolation; private assets require owner session verification, public items stream via signed time-limited access tokens.
- **Portfolio Synchronization**: Automatic visibility synchronization (`public` / `unlisted` / `private`) and foreign asset hijacking prevention.
- **Cascade Deletion Safeguards**: Protects active portfolio pieces from accidental asset removal (`409 Conflict: ASSET_IN_USE` unless forced).
- **Media Cleanup Engine**: Automatic background sweeping of abandoned uploads.

### 4. Interactive Frontend Media Suite
- **Drag-and-Drop Media Dropzone**: Dark-first UI component (`MediaUploadDropzone`) featuring live upload percentage progress bars, file size & type badge indicators, cancellation, and thumbnail/video previews.
- **Portfolio Item Integration**: Modal switcher in `PortfolioEditorModal` allowing creators to choose between direct verified file uploads or external project URLs.

---

## 🤝 Phase 8 Features Implemented: Project Collaboration, Milestone Tracking & Deliverable Review

### 1. Private Project Workspace & Participant Isolation
- **Role-Based Workspace Boundary**: Only authorized creators and brands of the specific awarded project can access `/api/projects/:projectId/*`. Third parties and unauthenticated callers receive indistinguishable 404/403 responses.
- **5-Tab Dark-First Collaboration UI**:
  - **Overview & Agreement**: Contract terms, immutable agreement snapshot, agreed deliverables checklist, participant profiles, and project kickoff/completion actions.
  - **Milestones & Deliverables**: Interactive pipeline with real milestone states (`not_started`, `in_progress`, `submitted_for_review`, `revision_requested`, `approved`), version submission drawer, and brand review dialog.
  - **Workspace Files**: Visual gallery of all project renders and attachments with direct signed streaming/download access.
  - **Collaboration Chat**: Real-time polling chat stream between creator and brand with file attachments and markdown rendering.
  - **Activity Log**: Chronological audit trail of all project events (kickoffs, submissions, reviews, messages).

### 2. Milestone Lifecycle & Deliverable Review Workflow
- **Deliverable Submission (`POST /api/projects/:projectId/milestones/:milestoneId/submissions`)**:
  - Creator submits versioned work (v1, v2, v3...) with walkthrough notes, external project links (Figma, GitHub, Loom), and Phase 7 verified media assets.
  - Verifies creator asset ownership and links media assets to the project.
  - Transitions milestone to `submitted_for_review` and triggers notifications to brand.
- **Brand Review Actions (`POST /api/projects/:projectId/submissions/:submissionId/review`)**:
  - **Revision Requests**: Requires a detailed feedback explanation (min 5 characters) and transitions milestone to `revision_requested`.
  - **Deliverable Approvals**: Approves specific submission versions and advances milestone to `approved`.
- **Project Completion Safeguards**:
  - Gated on 100% milestone approval; blocks early completion (`409 Conflict: UNFINISHED_DELIVERABLES`).
  - Agreement snapshot remains 100% immutable and protected against unilateral scope edits.

### 3. Persistent Project-Scoped Messaging
- Dedicated `ProjectMessage` model with sender role badges, attachments, reply references, and sanitization against HTML/XSS injection.

---

## 💳 Phase 9 Features Implemented: Real Payment Integration, Escrow, Refunds & Financial Ledger

### 1. Payment Provider Abstraction & Razorpay Integration
- **Gateway Abstraction (`IPaymentProvider`)**: Pluggable interface supporting real Razorpay REST API calls and offline deterministic `MockPaymentProvider` for continuous test isolation.
- **Cryptographic Signature Validation**:
  - Checkout verification: HMAC-SHA256 of `order_id|payment_id` with timing-safe comparison.
  - Webhook verification: HMAC-SHA256 of raw request body validated against `X-Razorpay-Signature`.
- **Minor Units Financial Exactness**: All monetary sums stored and calculated as exact integers (e.g. 150000 minor units for $1,500.00 USD) across 8 global currencies (`USD`, `INR`, `EUR`, `GBP`, `CAD`, `AUD`, `SGD`, `AED`).

### 2. Milestone Payment Order & Escrow Lifecycle
- **Brand-Only Order Creation (`POST /api/projects/:projectId/payments/orders`)**:
  - Authoritative contractual pricing sourced from `Project.agreementSnapshot` or `Project.milestones`.
  - Prevents duplicate milestone funding and verifies project participant authorization.
  - Idempotency key protection for zero duplicate transactions on network retries.
- **Checkout Verification (`POST /api/payments/verify`)**:
  - Transitions payment to `captured`, advances project status if in kickoff, records balanced ledger entries, and notifies creators.

### 3. Webhook Ingestion & Replay Defense (`POST /api/payments/webhook`)
- Raw body signature verification.
- Idempotency deduplication via `PaymentWebhookEvent.eventId` preventing double-capture or replay attacks.
- Asynchronous handling for `payment.captured`, `payment.failed`, and `refund.processed`.

### 4. Full & Partial Refunds (`POST /api/payments/:paymentId/refunds`)
- Validates requested refund amount against `remainingRefundableAmountMinor`.
- Issues gateway refund and writes compensating double-entry ledger records.

### 5. Double-Entry Immutable Financial Ledger (`FinancialLedgerEntry`)
- Append-only immutable accounting entries tracking `brand_funds`, `escrow_hold`, `creator_earnings`, and `platform_revenue`.
- Validates double-entry invariant: `Sum(Debit) === Sum(Credit)`.
- Reconciles gateway capture status against database state (`POST /api/payments/reconcile`).

### 6. Interactive Frontend Financial Suite
- **Escrow & Financials Tab**: Real-time cards for Total Contract, Held in Escrow, Deposited Funds, and Remaining Payable.
- **Razorpay Hosted Checkout Modal**: Live script injection (`checkout.js`) with sandbox simulation fallback.
- **Milestone-Level Funding Badges**: Visual "Fund Escrow" buttons and "Funded in Escrow" verified status badges.
- **Auditable Financial Ledger**: Live verified ledger transaction log.

---

## 🧪 Testing & Validation

```bash
# Run Vitest integration test suite (108 tests across 16 test files)
npm run test

# Run production build validation (TypeScript + Vite)
npm run build
```

**Test Results:**
- 16 test files, 108 integration tests passing (100% pass rate).
- Production TypeScript and Vite builds: 0 errors across frontend and backend workspaces.

#   k a m p u s _ v c  
 