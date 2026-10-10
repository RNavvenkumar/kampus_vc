# Kampus.VC — Technical Architecture

## 1. System Overview

Kampus.VC is an AI-assisted marketplace and creative collaboration platform designed for digital artists, AI creators, video editors, 3D animators, and brands/clients.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser / Web App                    │
│            React + Vite + TypeScript + Tailwind             │
│   (AuthContext, ProtectedRoute, OnboardingGuard, UI Layer)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP with HTTP-Only Cookies / REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Kampus.VC Backend Gateway                     │
│               Node.js + Express + TypeScript                │
├─────────────────────────────────────────────────────────────┤
│  Middleware: Helmet, CORS, CookieParser, RateLimit, Auth    │
├──────────────┬──────────────┬───────────────┬───────────────┤
│ Auth & Session│ CreatorStudio │ BrandBriefs  │ Public Discovery│
│ Controllers  │ Controllers  │ Controllers   │ Controllers   │
├──────────────┴──────────────┴───────────────┴───────────────┤
│ Proposals & Review Controllers | Project & Notification Svc │
├──────────────┬──────────────┬───────────────┬───────────────┤
│SessionService│ProfileService│ BriefStateMachine│ AwardEngine │
└──────┬───────┴──────┬───────┴───────┬───────┴───────┬───────┘
       │              │               │               │
       ▼              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB (Mongoose ODM)                   │
│ Collections: Users, Sessions, CreatorProfiles, BrandProfiles,│
│              CampaignBriefs, CampaignProposals, Projects,   │
│              Notifications                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Session Architecture

- **Session Strategy**: Cryptographically random 256-bit opaque tokens stored in MongoDB with SHA-256 hashed identifiers (`sessionTokenHash`).
- **Cookie Security**:
  - `httpOnly: true` (Prevents XSS token exfiltration; no tokens in localStorage).
  - `secure: true` in production / configurable via `COOKIE_SECURE`.
  - `sameSite: 'lax'` (CSRF defense).
  - `maxAge: 72 hours` with automated MongoDB TTL index eviction (`expiresAt`).
- **Password Hashing**: `bcryptjs` with 12 salt rounds + complexity validation.
- **Brute-Force Defense**: `express-rate-limit` on login, registration, and password change endpoints.
- **Session Revocation**: Password changes invalidate all other concurrent sessions for the user.

---

## 3. Data Models & Database Indexes

### 1. User
- `name`, `email` (lowercase, unique index), `passwordHash`, `role` ('creator' | 'brand' | 'admin'), `accountStatus` ('active' | 'suspended' | 'pending'), `onboardingStatus` ('pending' | 'in_progress' | 'completed'), `onboardingStep` (number 1-5).

### 2. Session
- `userId` (ref User), `sessionTokenHash` (unique index), `expiresAt` (TTL index), `isValid`, `ipAddress`, `userAgent`, `lastActiveAt`.

### 3. CreatorProfile
- `userId` (ref User, unique), `displayName`, `username` (unique sparse), `headline`, `biography`, `specialties`, `creativeTools`, `experienceLevel`, `hourlyRate`, `availability` ('available' | 'limited' | 'busy'), `availabilityNote`, `availableFromDate`, `profileCompletion`.
- **Embedded `portfolioItems`**:
  - `id`, `title`, `slug`, `description`, `category`, `tags`, `creativeTools`, `mediaType` ('image' | 'video' | 'project'), `mediaUrl`, `thumbnailUrl`, `projectUrl`, `clientName`, `completionDate`, `isFeatured`, `displayOrder`, `visibility` ('public' | 'unlisted' | 'private').
- **Embedded `services`**:
  - `id`, `title`, `description`, `category`, `deliverables`, `revisions`, `price`, `currency`, `turnaroundDays`, `packageTier` ('starter' | 'standard' | 'premium'), `status` ('active' | 'inactive').
- **Indexes**:
  - `specialties: 1`, `creativeTools: 1`, `availability: 1`, `profileVisibility: 1`, `'portfolioItems.visibility': 1`, `'services.status': 1`.

### 4. BrandProfile
- `userId` (ref User, unique), `companyName`, `companySlug`, `industry`, `companySize`, `website`, `description`, `contactName`, `contactRole`, `profileCompletion`.

### 5. CampaignBrief
- `brandId` (ref User), `companyName`, `companySlug`, `title`, `slug`, `summary`, `description`, `category`, `requiredSpecialties`, `creativeTools`, `deliverables`, `budgetType` ('fixed' | 'range'), `budgetMin`, `budgetMax`, `currency`, `durationWeeks`, `targetStartDate`, `deadline`, `engagementType` ('milestone' | 'retainer' | 'one_off'), `locationPreference` ('remote' | 'hybrid' | 'onsite'), `experienceLevel`, `referenceUrls`, `status` ('draft' | 'published' | 'paused' | 'archived' | 'awarded'), `publishedAt`, `awardedProposalId`, `awardedCreatorId`, `awardedAt`.
- **Indexes**:
  - `{ brandId: 1, createdAt: -1 }` (Brand brief dashboard lookup).
  - `{ status: 1, publishedAt: -1 }` (Public discovery index).
  - `{ category: 1 }` (Category search).
  - `{ slug: 1 }` (SEO route resolution).
  - `{ requiredSpecialties: 1 }` (Specialty filtering).

### 6. CampaignProposal (Phase 4)
- `creatorId` (ref User), `briefId` (ref CampaignBrief), `brandId` (ref User, derived from brief), `proposalReference` (unique), `pitchTitle`, `pitchMessage`, `referencedPortfolioItemIds` (string[]), `referencedServiceId` (string), `proposedPrice`, `currency`, `deliveryDurationWeeks`, `targetStartDate`, `deliverables` (string[]), `milestones` (sub-schema: title, description, amount, durationWeeks, order), `revisionAllowance`, `status` ('draft' | 'submitted' | 'shortlisted' | 'revision_requested' | 'accepted' | 'declined' | 'withdrawn'), `revisionMessage`, `submittedAt`, `decisionAt`, `revisionNumber`, `acceptedAgreementSnapshot` (IAcceptedAgreementSnapshot).
- **Indexes**:
  - `{ creatorId: 1, briefId: 1 }` (Unique compound index enforcing one proposal per creator per campaign).
  - `{ briefId: 1, status: 1 }` (Brand review list index).
  - `{ brandId: 1, status: 1, createdAt: -1 }` (Brand review center lookup).
  - `{ creatorId: 1, status: 1, createdAt: -1 }` (Creator proposals lookup).

### 7. Project (Phase 4)
- `projectReference` (unique), `briefId` (ref CampaignBrief), `proposalId` (ref CampaignProposal, unique), `creatorId` (ref User), `brandId` (ref User), `title`, `agreedDescription`, `agreedDeliverables` (string[]), `agreedPrice`, `currency`, `deliveryDurationWeeks`, `targetStartDate`, `milestones` (milestone plan array), `revisionAllowance`, `status` ('ready_for_kickoff' | 'in_progress' | 'completed' | 'cancelled'), `agreementSnapshot` (immutable freeze).
- **Indexes**:
  - `{ creatorId: 1, createdAt: -1 }`
  - `{ brandId: 1, createdAt: -1 }`
  - `{ briefId: 1 }`

### 8. Notification (Phase 4)
- `recipientId` (ref User), `type` ('proposal_submitted' | 'proposal_shortlisted' | 'revision_requested' | 'proposal_resubmitted' | 'proposal_accepted' | 'proposal_declined' | 'campaign_awarded_other' | 'project_created'), `title`, `message`, `proposalId`, `briefId`, `projectId`, `isRead`, `idempotencyKey` (sparse index).
- **Indexes**:
### 9. CreativeBriefDraft (Phase 5)
- `brandId` (ref User), `title`, `userPrompt`, `category`, `status` ('draft' | 'synthesized' | 'converted'), `structuredBrief` (ISchemaGeneratedBrief), `creativeDirections` (ICreativeDirection[]), `selectedDirectionIndex`, `moodboardUrls` (string[]), `moodboardAnalysis` (IMoodboardAnalysis), `synthesizedRequirements` (IRequirementSynthesis), `history` (change log entries), `version` (number), `convertedCampaignBriefId` (ref CampaignBrief), `convertedAt`.
- **Indexes**:
  - `{ brandId: 1, createdAt: -1 }` (Brand drafts list).
  - `{ status: 1 }`

---

## 4. Proposal Lifecycle & Award Concurrency Engine

### Proposal State Machine
```
draft ───────────────► submitted
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
       shortlisted   revision_req    declined
            │             │
            │             ▼
            │         submitted (Rev #2+)
            │             │
            └──────► accepted (Single Winner)
```

### Atomic Single-Winner Award Workflow
To guarantee concurrency safety even without distributed replica set transactions:
1. Brand selects winning proposal.
2. Atomically claims `CampaignBrief` using conditional query:
   ```ts
   CampaignBrief.findOneAndUpdate(
     { _id: briefId, brandId, status: { $in: ['published', 'paused'] }, awardedProposalId: { $exists: false } },
     { $set: { status: 'awarded', awardedProposalId: proposal._id, awardedCreatorId: proposal.creatorId, awardedAt: new Date() } },
     { new: true }
   );
   ```
3. If null, the award was already claimed concurrently by another request; returns `409 Conflict (CAMPAIGN_ALREADY_AWARDED)`.
4. Snapshots agreed terms into immutable `acceptedAgreementSnapshot`.
5. Transitions winning proposal to `accepted`.
6. Generates `Project` workspace in `ready_for_kickoff` status.
7. Automatically transitions all remaining active proposals for the brief to `declined`.
8. Emits persistent notifications to winning creator, brand, and competing creators.

---

## 5. AI Creative Studio Architecture (Phase 5)

```
┌─────────────────────────────────────────────────────────────┐
│             Brand AI Creative Studio Frontend               │
│  Tabs: 1. Vision & Brief  2. Creative Directions (Palettes) │
│        3. Moodboard Intel 4. Synthesis  5. Field Improver   │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST Endpoints
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend AIService Singleton                 │
│         - Daily rate limiting & user quota enforcement      │
│         - Versioned Zod structured output validation        │
│         - Strict SSRF Guard (RFC1918 / Cloud Metadata Block) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Provider Interface (IAIProvider)
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│     GeminiProvider      │         │      MockAIProvider     │
│ - Google Gemini 2.0 API │         │ - Deterministic testing │
│ - JSON Schema Mode      │         │ - Configurable delays   │
│ - Abort Timeout Guard   │         │ - Error simulations     │
└─────────────────────────┘         └─────────────────────────┘
```

### Security & SSRF Protection
- **Server-Side API Key Storage**: API keys are strictly stored on the backend; zero key leakage to the frontend.
- **SSRF Guard (`validatePublicHttpsUrl`)**:
  - Rejects non-HTTPS schemes.
  - Resolves domain to IPv4/IPv6 addresses via DNS before request dispatch.
  - Blocks loopback (`127.0.0.0/8`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`), link-local/carrier-grade NAT, and cloud metadata endpoints (`169.254.169.254`).
- **Graceful Degradation**: When unconfigured or offline, provider returns explicit `isConfigured: false` without throwing unhandled exceptions or presenting synthetic success.

---

## 8. Phase 6 — Intelligent Discovery & Explainable Matching Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Intelligent Discovery & Matching                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Natural Language Search Query] ──► [AI / Heuristic Intent Parser]         │
│                                              │                              │
│                                              ▼                              │
│  [Structured Multi-Filter Pipeline] ◄── [Parsed Filters: Tool/Cat/Budget]   │
│                 │                                                           │
│                 ▼                                                           │
│  [Safe Public Creator Projection Engine] ──► Privacy Filter (No PII / WIP)  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                    Explainable Matching Formula (0–100)                     │
│                                                                             │
│  • Primary Specialties Match (35 pts)    • Creative Tools Match (25 pts)    │
│  • Verified Portfolio Evidence (20 pts)  • Budget & Currency Fit (10 pts)   │
│  • Availability Status (10 pts)                                             │
│                                                                             │
│  Output: Overall Score + Transparent Factor Breakdown + Evidence Citations  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deterministic Explainability & Privacy Invariants
1. **Explainable Scoring**:
   - Algorithmic, deterministic multi-factor breakdown (not a black-box LLM hallucination).
   - Direct citations linking matched tools and specialties to published portfolio pieces.
   - Transparent gap analysis highlighting missing skills or tool mismatches.
2. **Privacy Guarantees**:
   - Strictly suppresses private portfolio drafts (`isPublic: false`) and draft services from discovery and search indexes.
   - Zero exposure of internal PII (`email`, `passwordHash`, `sessionTokens`).
3. **ReDoS Resilience**:
   - Sanitizes text queries against regex denial of service patterns (`escapeRegex`) before issuing MongoDB queries.

---

## 9. Phase 7 — Secure Media Uploads & Object Storage Architecture

### 1. Storage Architecture Overview

Kampus.VC decouples media storage behind the `IStorageProvider` abstraction layer, keeping application servers stateless and enabling direct-to-storage uploads via short-lived signed tokens.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Secure Media Upload Lifecycle                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Initiate Upload                                                         │
│     Client ──► POST /api/media/uploads ──► Backend generates upload token   │
│     (Checks authentication, MIME whitelist, file size budget)               │
│     Backend creates MediaAsset (status: 'initiated', 15m expiration)        │
│                                                                             │
│  2. Direct Upload Transfer                                                  │
│     Client ──► PUT (presigned S3 URL or HMAC local endpoint)                │
│     (Shows real-time byte upload progress 0% → 100% in UI)                  │
│                                                                             │
│  3. Completion & Server-Side Verification                                   │
│     Client ──► POST /api/media/uploads/:uploadId/complete                   │
│     Backend performs:                                                       │
│       • Object existence & size verification                                │
│       • Header & magic byte inspection (JPEG, PNG, GIF, WebP, MP4, WebM)   │
│       • Explicit SVG rejection (prevents stored XSS / XXE)                  │
│       • Safe image dimension extraction (PNG/JPEG/GIF header parsing)       │
│       • Asset status transition: 'initiated' ──► 'ready'                    │
│                                                                             │
│  4. Portfolio Integration & Asset Linking                                   │
│     Client creates/updates PortfolioItem referencing assetId                │
│     Backend verifies ownership & synchronizes visibility (public/unlisted)  │
│                                                                             │
│  5. Access & Streaming                                                      │
│     Client ──► GET /api/media/assets/:assetId/access                        │
│     Backend verifies permission and issues temporary signed access URL      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Multi-Provider Abstraction (`IStorageProvider`)

- **Local Storage Provider (`LocalStorageProvider`)**:
  - Development and self-hosted environments.
  - Generates HMAC-SHA256 authenticated URLs for secure direct streaming (`/api/media/local-storage/:key?token=...&expires=...`).
  - Safe atomic file writes with directory isolation.
- **S3 / S3-Compatible Provider (`S3StorageProvider`)**:
  - Production deployments (AWS S3, Cloudflare R2, MinIO).
  - Uses AWS SDK v3 client with signed presigned URLs for PUT (upload) and GET (private access).
  - Configurable custom endpoints, path-style addressing, and regional buckets.

### 3. Rigorous Security Controls

1. **Path Traversal Defense**:
   - Object keys are generated server-side using cryptographically secure random UUIDs (`media/{userId}/{uuid}_{filename}`).
   - Local storage provider strictly rejects any key containing leading slashes, backslashes, absolute drive paths, or `..` directory navigation sequences.
   - All paths are resolved and verified within the configured uploads root directory (`isWithinRoot`).
2. **Magic Byte / File Signature Inspection (`MediaValidationService`)**:
   - Upload verification inspects the actual initial bytes of the uploaded file, independent of client-declared MIME type or file extension:
     - **JPEG**: `FF D8 FF`
     - **PNG**: `89 50 4E 47 0D 0A 1A 0A`
     - **GIF**: `GIF87a` / `GIF89a`
     - **WebP**: `RIFF....WEBP`
     - **MP4**: `....ftyp` (isom, mp41, mp42, etc.)
     - **WebM**: `1A 45 DF A3` (EBML header)
     - **QuickTime MOV**: `....ftypqt  ` or `....moov` / `....mdat`
   - **Explicit SVG Rejection**: Rejects any file with SVG XML headers (`<svg`, `<?xml`) or `image/svg+xml` MIME type to completely eliminate stored XSS and XML external entity (XXE) attacks.
   - **Executable & Script Rejection**: Rejects HTML, JavaScript, shell scripts, and executable signatures.
3. **Safe Dimension Extraction**:
   - Parses image dimensions directly from binary headers (PNG IHDR chunks, JPEG SOF markers, GIF screen descriptors) in pure TypeScript without executing external native binaries (`ImageMagick`, `ffmpeg`), avoiding remote code execution (RCE) vulnerabilities.
4. **Separation of Concerns vs Phase 5 SSRF Guard**:
   - Phase 5 `validatePublicHttpsUrl` protects server-side outbound HTTP crawling of remote public image URLs.
   - Phase 7 handles authenticated, direct creator uploads into private object storage with strict token authentication and header validation.
5. **Ownership & Access Control**:
   - Assets are strictly bound to their creator (`ownerId`).
   - Private assets require active session authentication matching the owner.
   - Public assets linked to active portfolio pieces can be accessed publicly via authorized delivery URLs.
6. **Cascade Protection & Asset Integrity**:
   - Deletion endpoint (`DELETE /api/media/assets/:assetId`) checks whether the asset is currently referenced by any active creator portfolio items or services.
   - If referenced, deletion returns `409 Conflict (ASSET_IN_USE)` unless `?force=true` is explicitly provided.
7. **Automated Background Cleanup (`MediaCleanupService`)**:
   - Periodic cleanup task purges abandoned uploads in `initiated` or `failed` state older than 24 hours, removing orphaned files from both storage and MongoDB.

---

## 10. Phase 8 — Project Collaboration, Secure Messaging & Deliverable Review Architecture

### 1. Workspace State Machine & Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Project Collaboration Lifecycle                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ready_for_kickoff] ──► (Kickoff Triggered) ──► [in_progress]              │
│                                                         │                   │
│                                                         ▼                   │
│  ┌──────────────────────── Milestone Workflow ────────────────────────┐     │
│  │                                                                    │     │
│  │  [not_started] ──► (Start Work) ──► [in_progress]                  │     │
│  │                                          │                         │     │
│  │                                          ▼                         │     │
│  │                             [submitted_for_review] (v1)            │     │
│  │                                    /             \                 │     │
│  │                     (Request Rev) /               \ (Approve)      │     │
│  │                                  ▼                 ▼               │     │
│  │                        [revision_requested]    [approved] ✓        │     │
│  │                                  │                                 │     │
│  │                      (Resubmit Deliverable v2)                     │     │
│  │                                  │                                 │     │
│  │                                  ▼                                 │     │
│  │                        [submitted_for_review]                      │     │
│  │                                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                         │                   │
│                                                         ▼                   │
│  [All Milestones Approved] ──► (Complete Project) ──► [completed] 🎉        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Participant Isolation & Strict Authorization Invariants

1. **Workspace Boundary**:
   - Only `project.creatorId` and `project.brandId` are authorized to query, submit, review, or message within `/api/projects/:projectId/*`.
   - Third-party creators, third-party brands, and unauthenticated callers receive indistinguishable `404 Not Found` or `403 Forbidden` responses.
   - Private project deliverables and internal messages are completely shielded from public discovery, search indexes, and unauthenticated endpoints.
2. **Immutable Agreement Snapshot**:
   - `project.agreementSnapshot` remains frozen and immutable from the moment of proposal acceptance.
   - Price, currency, core deliverables, and duration cannot be altered unilaterally through ordinary collaboration endpoints.
3. **Completion Safety Constraint**:
   - Overall project transition from `in_progress` to `completed` is strictly gated on every milestone being in `approved` status. Attempting completion with pending or unapproved deliverables returns `409 Conflict (UNFINISHED_DELIVERABLES)`.
4. **Media Authorization for Project Deliverables**:
   - Deliverable attachments and chat attachments link `MediaAsset` records to the project (`linkedEntities.push({ entityType: 'project', entityId })`).
   - Project participants (creator AND brand) are authorized to retrieve signed streaming/download URLs for project-linked private assets, while third parties remain strictly forbidden.
5. **Persistent Messaging & Chronological Audit**:
   - Chat messages and audit activity events are permanently recorded in MongoDB with deterministic sorting and actor role attribution.

---

## 11. Phase 9 — Payment Integration, Escrow, Refunds & Financial Ledger Architecture

### 1. Payment Lifecycle & State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Payment Lifecycle State Machine                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [created] ──► (Create Gateway Order) ──► [order_created]                   │
│                                                   │                         │
│                                                   ▼                         │
│                                               [pending]                     │
│                                              /         \                    │
│                        (Verify Signature)   /           \ (Payment Error)   │
│                                            ▼             ▼                  │
│                                       [captured]      [failed]              │
│                                        /      \                             │
│                     (Partial Refund)  /        \ (Full Refund)              │
│                                      ▼          ▼                           │
│                           [partially_refunded] [refunded]                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Provider Abstraction & Razorpay Integration

- **`IPaymentProvider`**: Interface contract decoupling business logic from underlying payment providers (`createOrder`, `verifyCheckoutSignature`, `verifyWebhookSignature`, `fetchPayment`, `createRefund`).
- **`RazorpayProvider`**: Official Razorpay integration utilizing REST APIs with HTTP Basic Auth and cryptographic HMAC-SHA256 signature verification.
- **`MockPaymentProvider`**: Deterministic test double for local automated testing without external network dependencies.
- **Signature Security**:
  - Checkout Callback: `crypto.createHmac('sha256', key_secret).update(order_id + '|' + payment_id).digest('hex')` compared with timing-safe equality.
  - Webhook Ingestion: `crypto.createHmac('sha256', webhook_secret).update(rawBody).digest('hex')` verified against `X-Razorpay-Signature` header.

### 3. Financial Precision & Minor Units

- All financial calculations, balances, and records are stored as **exact integer minor units** (e.g. `$1,500.00 USD` → `150000` cents, `₹5,000.00 INR` → `500000` paise).
- Floating-point arithmetic is strictly prevented across both backend persistence and frontend calculations using `toMinorUnits` and `toMajorUnits` with decimal multipliers.
- Supported Currencies: `USD`, `INR`, `EUR`, `GBP`, `CAD`, `AUD`, `SGD`, `AED`.

### 4. Double-Entry Immutable Ledger

- **`FinancialLedgerEntry`**: Immutable append-only audit trail recording debits and credits across financial accounts:
  - `brand_funds`: Source and return account for brand payments and refunds.
  - `escrow_hold`: Locked funds held until milestone deliverables are approved.
  - `creator_earnings`: Funds released to creator accounts upon milestone acceptance.
  - `platform_revenue`: Marketplace platform take-rate.
- **Double-Entry Invariant**: Every captured payment creates a balanced pair: `Debit: brand_funds`, `Credit: escrow_hold`. Every refund creates a compensating pair: `Debit: escrow_hold`, `Credit: brand_funds`. `Sum(Debit) === Sum(Credit)` invariant is enforced and tested.
- **Immutability Hooks**: Mongoose middleware prevents mutation (`updateOne`, `findOneAndUpdate`) of existing ledger entries.

### 5. Webhook Replay Protection & Idempotency

- `PaymentWebhookEvent` records incoming event IDs (`eventId`). Duplicate deliveries of the same event return `200 OK (already_processed)` and prevent duplicate ledger entries or double-credit anomalies.


