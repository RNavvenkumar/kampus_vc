# Kampus.VC — API Conventions & Standards

## 1. Base URL & Versioning
All backend endpoints are prefixed with `/api`.
Base URL: `http://localhost:4000/api`

---

## 2. Authentication & Session Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user + initial profile; sets session cookie |
| `POST` | `/api/auth/login` | Public | Authenticate user; sets session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Revoke session; clears cookie |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user & matching profile |
| `POST` | `/api/auth/change-password` | Authenticated | Verify current password, update hash, revoke concurrent sessions |

---

## 3. Creator Studio & Portfolio Endpoints

All endpoints require `requireAuth` and `requireRole('creator')`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/creator/portfolio` | Retrieve creator's portfolio items ordered by `displayOrder` |
| `POST` | `/api/creator/portfolio` | Create a new portfolio item (max 50 limit per creator) |
| `GET` | `/api/creator/portfolio/:itemId` | Retrieve single portfolio item owned by creator |
| `PATCH` | `/api/creator/portfolio/:itemId` | Update owned item fields with strict whitelist |
| `DELETE` | `/api/creator/portfolio/:itemId` | Remove item and re-index `displayOrder` |
| `PATCH` | `/api/creator/portfolio/reorder` | Update ordering; validates against foreign item IDs |
| `PATCH` | `/api/creator/portfolio/:itemId/feature` | Toggle `isFeatured` boolean |

---

## 4. Creator Service Catalog & Availability Endpoints

All endpoints require `requireAuth` and `requireRole('creator')`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/creator/services` | List all packaged offerings |
| `POST` | `/api/creator/services` | Create new fixed-price package (validates min $5 price, turnaround 1–365 days) |
| `GET` | `/api/creator/services/:serviceId` | Get single service package |
| `PATCH` | `/api/creator/services/:serviceId` | Update service attributes |
| `DELETE` | `/api/creator/services/:serviceId` | Delete service package |
| `PATCH` | `/api/creator/services/:serviceId/status` | Toggle status between `active` and `inactive` |
| `GET` | `/api/creator/availability` | Fetch current bandwidth status, note, and available-from date |
| `PATCH` | `/api/creator/availability` | Update availability status (`available`, `limited`, `busy`), note, and date |

---

## 5. Creator Proposals & Pitch Submissions (Phase 4)

All endpoints require `requireAuth` and `requireRole('creator')`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/creator/proposals` | Create draft or submit new proposal for a published brief (validates portfolio ownership, pricing, milestone sum) |
| `GET` | `/api/creator/proposals` | List proposals owned by authenticated creator (supports `status`, `briefId`, pagination) |
| `GET` | `/api/creator/proposals/:proposalId` | Fetch owned proposal with populated brief and referenced portfolio items |
| `PATCH` | `/api/creator/proposals/:proposalId` | Edit eligible draft or revision-requested proposal |
| `POST` | `/api/creator/proposals/:proposalId/submit` | Submit draft or resubmit revised proposal (increments revision number) |
| `POST` | `/api/creator/proposals/:proposalId/withdraw` | Withdraw eligible proposal (cannot withdraw once accepted) |

---

## 6. Brand Campaign Briefs Endpoints

All endpoints require `requireAuth` and `requireRole('brand')`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/brand/briefs` | List owned briefs with status filter, pagination, and status breakdown stats |
| `POST` | `/api/brand/briefs` | Create draft brief |
| `GET` | `/api/brand/briefs/:briefId` | Fetch owned brief |
| `PATCH` | `/api/brand/briefs/:briefId` | Update owned brief fields |
| `POST` | `/api/brand/briefs/:briefId/publish` | Validate essential fields and transition status to `published` |
| `POST` | `/api/brand/briefs/:briefId/pause` | Transition status from `published` to `paused` |
| `POST` | `/api/brand/briefs/:briefId/resume` | Transition status from `paused` to `published` |
| `POST` | `/api/brand/briefs/:briefId/archive` | Transition status to `archived` |
| `DELETE` | `/api/brand/briefs/:briefId` | Permanently delete owned brief |

---

## 7. Brand Proposal Review Center & Project Award (Phase 4)

All endpoints require `requireAuth` and `requireRole('brand')`. Draft proposals are strictly excluded from brand views.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/brand/proposals` | List proposals submitted to campaigns owned by the brand (supports `briefId`, `status`, `q`, pagination) |
| `GET` | `/api/brand/proposals/:proposalId` | Fetch proposal details, creator profile, referenced portfolio items, and explainable compatibility |
| `POST` | `/api/brand/proposals/:proposalId/shortlist` | Shortlist an eligible submitted proposal |
| `POST` | `/api/brand/proposals/:proposalId/request-revision` | Request scope/price adjustments with required feedback message (min 5 chars) |
| `POST` | `/api/brand/proposals/:proposalId/accept` | **Atomic Single-Winner Award**: Claims brief award, marks proposal accepted, records immutable agreement snapshot, creates Project record, and auto-declines competing proposals |
| `POST` | `/api/brand/proposals/:proposalId/decline` | Decline an eligible proposal |

---

## 8. Awarded Project Workspaces (Phase 4)

All endpoints require `requireAuth`. Both creators and brands can view their associated projects.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List awarded projects where authenticated user is either creator or brand |
| `GET` | `/api/projects/:projectId` | Fetch project details and immutable agreement snapshot |

---

## 9. In-App Notifications (Phase 4)

All endpoints require `requireAuth`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | List user's notifications (paginated, newest first) |
| `GET` | `/api/notifications/unread-count` | Retrieve count of unread notifications |
| `PATCH` | `/api/notifications/:notificationId/read` | Mark single notification as read |
| `POST` | `/api/notifications/mark-all-read` | Mark all notifications for authenticated user as read |

---

## 10. Public Marketplace Discovery Endpoints

Publicly accessible without authentication. Projections strip all internal and private fields.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/briefs` | Search and filter published campaigns (`status: 'published'`). Awarded briefs are automatically excluded. Parameters: `q`, `category`, `specialty`, `engagementType`, `sort`, `page`, `limit` |
| `GET` | `/api/briefs/:briefIdOrSlug` | Detailed view of a published campaign brief with brand attribution |
| `GET` | `/api/creators` | Discover public creators (`profileVisibility: 'public'`). Filters out private portfolio items and inactive services |
| `GET` | `/api/creators/:usernameOrId` | Public creator profile showcase showing bio, public portfolio, active services, and availability |

---

## 11. AI Creative Studio Endpoints (Phase 5)

All endpoints require `requireAuth` and `requireRole('brand')`. Protected with daily quota tracking and SSRF URL verification.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/brand/ai/status` | Retrieve AI service provider readiness, active models, and daily quota |
| `POST` | `/api/brand/ai/generate-brief` | Transform natural language prompt into structured brief with category, milestones, deliverables |
| `POST` | `/api/brand/ai/generate-directions` | Generate 3 distinct creative concepts with rationale, mood descriptors, lighting, audio notes, and 5-hex color palettes |
| `POST` | `/api/brand/ai/analyze-moodboard` | Analyze up to 6 visual reference URLs (SSRF protected) to extract aesthetics, dominant colors, recommended creators |
| `POST` | `/api/brand/ai/synthesize-requirements` | Synthesize milestone schedule, concrete deliverables, acceptance criteria, and suggested budget ranges |
| `POST` | `/api/brand/ai/improve-draft` | Polish and elevate specific brief fields with goals (`clarity`, `cinematic`, `technical`, `concise`) returning side-by-side diff rationale |

---

## 12. Persistent Creative Brief Drafts Endpoints (Phase 5)

All endpoints require `requireAuth` and `requireRole('brand')`. Drafts can be iteratively refined, versioned, and converted into campaign briefs.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/brand/creative-drafts` | List saved creative drafts for the authenticated brand (supports `status`, `category`, pagination) |
| `POST` | `/api/brand/creative-drafts` | Save a new creative brief draft with structured brief, directions, moodboard analysis, and requirements |
| `GET` | `/api/brand/creative-drafts/:draftId` | Fetch draft details, version history, and snapshot data |
| `PATCH` | `/api/brand/creative-drafts/:draftId` | Incrementally update draft fields (increments version and records change history) |
| `DELETE` | `/api/brand/creative-drafts/:draftId` | Delete an owned creative draft |
| `POST` | `/api/brand/creative-drafts/:draftId/create-brief` | **One-Click Campaign Conversion**: Converts approved creative draft into an unpublished `CampaignBrief` with `status: 'draft'`, linking `originDraftId` |

---

## 13. Intelligent Creator Discovery & Intent Parser Endpoints (Phase 6)

Public and protected endpoints for granular creator exploration, structured filtering, and AI search intent interpretation.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/creators/search` | Public | Search creators with text query (`q`), category, creative tools (comma-separated), specialties, min/max price, currency, availability, experience level, sorting (`score`, `price_asc`, `price_desc`, `newest`, `experience`), and pagination (`page`, `limit`). Safely projects public data and suppresses private portfolio items/inactive services. |
| `POST` | `/api/creators/parse-search-intent` | Public | Natural-language query parser converting prompt text into structured filter criteria (`category`, `specialties`, `creativeTools`, `minPrice`, `maxPrice`, `currency`, `experienceLevel`, `availability`, `interpretedQuery`) using Gemini AI with deterministic regex fallback. |

---

## 14. Explainable Creator–Campaign Matching Engine Endpoints (Phase 6)

Brand-only endpoints for algorithmic, deterministic candidate matching with transparent factor breakdowns and citations.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/brand/briefs/:briefId/matches` | `requireAuth`, `requireRole('brand')` | Multi-factor explainability scoring for all active creators against the specified campaign brief. Returns overall score (0–100), factor scores (Specialties 35pts, Tools 25pts, Verified Evidence 20pts, Budget 10pts, Availability 10pts), citations (portfolio titles, URLs), strengths, and gap analysis. Enforces brand ownership. |
| `GET` | `/api/briefs/:briefId/matches` | `requireAuth`, `requireRole('brand')` | Alias route for brand campaign matches. |

---

## 15. Creator Opportunity Discovery Endpoints (Phase 6)

Creator-only endpoints for discovering relevant published campaign opportunities ranked by compatibility score.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/creator/opportunities` | `requireAuth`, `requireRole('creator')` | Discovers published campaign briefs ranked by creator compatibility score with pitch status tracking (`hasPitched`, `proposalStatus`, `proposalId`), category filtering, and budget filtering. |
| `GET` | `/api/creator/opportunities/:briefId/compatibility` | `requireAuth`, `requireRole('creator')` | Evaluates creator's specific compatibility against a single published campaign brief before submitting a proposal. |

---

## 16. Media Uploads & Object Storage Endpoints (Phase 7)

Endpoints for secure direct-to-storage uploads, magic byte verification, private asset streaming, and media library management.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/media/uploads` | `requireAuth` | Initiate media upload session. Validates MIME type, file size limits (10MB image, 100MB video), and assigns an object key. Returns upload token, upload URL (presigned PUT or HMAC streaming endpoint), and `uploadId`. |
| `PUT` | `/api/media/local-storage/:key` | Public (HMAC query token) | Stream binary payload directly into local object storage. Validates signature and expiry before streaming. (Local provider only) |
| `POST` | `/api/media/uploads/:uploadId/complete` | `requireAuth` | Finalize upload session. Verifies file existence, inspects magic bytes (JPEG/PNG/GIF/WebP/MP4/WebM/MOV), rejects SVGs/executables, extracts dimensions, and transitions asset status to `ready`. |
| `GET` | `/api/media/assets/:assetId` | `optionalAuth` | Retrieve asset metadata (dimensions, mimeType, size, status, visibility). Accessible publicly if asset is public and ready; requires owner authentication if asset is private. |
| `GET` | `/api/media/assets/:assetId/access` | `optionalAuth` | Generate short-lived signed download / streaming URL for asset playback. Enforces owner authorization for non-public assets. |
| `GET` | `/api/media/local-storage/:key` | Public (HMAC query token) | Stream asset binary from local storage using time-limited HMAC signature. (Local provider only) |
| `DELETE` | `/api/media/assets/:assetId` | `requireAuth` | Delete asset from object storage and mark record as deleted. Verifies ownership. Returns `409 Conflict (ASSET_IN_USE)` if referenced by active portfolio items unless `?force=true` query param is supplied. |
| `GET` | `/api/media/my-assets` | `requireAuth` | List creator's uploaded media library items with filtering (`status`, `category`, `visibility`) and pagination (`page`, `limit`). |

---

## 18. Project Collaboration, Milestone Tracking & Messaging Endpoints (Phase 8)

Endpoints for authorized workspace management, milestone tracking, deliverable review, direct project messaging, and activity audit trails.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | `requireAuth` | List active projects for current user (as creator or brand) with populated participants and brief metadata. |
| `GET` | `/api/projects/:projectId` | `requireAuth` (Participant) | Fetch project workspace details, commercial terms, participant metadata, pending review counts, and message statistics. |
| `PATCH` | `/api/projects/:projectId/status` | `requireAuth` (Participant) | Update project status (`in_progress` kickoff or `completed` finalization). Enforces all milestones approved before completion. |
| `GET` | `/api/projects/:projectId/milestones` | `requireAuth` (Participant) | Fetch all project milestones with individual status and latest deliverable submission summary. |
| `PATCH` | `/api/projects/:projectId/milestones/:milestoneId/status` | `requireAuth` (Creator) | Creator begins work on milestone (`not_started` → `in_progress`). |
| `POST` | `/api/projects/:projectId/milestones/:milestoneId/submissions` | `requireAuth` (Creator) | Submit deliverable version with notes, external links, and verified Phase 7 media asset attachments. Auto-advances milestone to `submitted_for_review`. |
| `GET` | `/api/projects/:projectId/milestones/:milestoneId/submissions` | `requireAuth` (Participant) | Fetch submission version history for a milestone with signed download URLs for attachments. |
| `POST` | `/api/projects/:projectId/submissions/:submissionId/review` | `requireAuth` (Brand) | Brand approves deliverable (advances milestone to `approved`) or requests revisions with required feedback message (sets `revision_requested`). |
| `GET` | `/api/projects/:projectId/messages` | `requireAuth` (Participant) | Chronological collaboration chat message stream with attachment metadata and signed access URLs. |
| `POST` | `/api/projects/:projectId/messages` | `requireAuth` (Participant) | Post chat message with optional media attachments. |
| `GET` | `/api/projects/:projectId/activity` | `requireAuth` (Participant) | Reverse-chronological immutable project audit activity timeline. |
| `GET` | `/api/projects/:projectId/files` | `requireAuth` (Participant) | Aggregated gallery of all media files and attachments submitted in the project workspace. |

---

## 19. Payment Integration, Escrow, Refunds & Financial Ledger Endpoints (Phase 9)

Endpoints for authorized escrow payment order creation, cryptographic checkout verification, webhook event ingestion, refunds, and double-entry ledger summaries.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/projects/:projectId/payments/orders` | `requireAuth` (Brand) | Initiates an escrow payment order for a specific milestone or full contract amount. Verifies brand participant ownership, validates currency support, checks for prior payment, and creates gateway order. |
| `POST` | `/api/payments/verify` | `requireAuth` (Brand) | Verifies Razorpay checkout callback signature (`orderId|paymentId`), captures payment, transitions project status if applicable, records balanced double-entry ledger records, and emits notifications. |
| `POST` | `/api/payments/webhook` | Public (HMAC Verified) | Webhook ingestion endpoint. Validates raw body HMAC-SHA256 signature against `X-Razorpay-Signature`, checks event idempotency to prevent replay attacks, and processes `payment.captured`, `payment.failed`, and `refund.processed`. |
| `GET` | `/api/projects/:projectId/payments` | `requireAuth` (Participant) | Retrieves payment transactions, refund records, and double-entry ledger summary (debits, credits, escrow balance, remaining payable). |
| `POST` | `/api/payments/:paymentId/refunds` | `requireAuth` (Brand/Admin) | Initiates a full or partial refund on a captured payment. Validates remaining refundable balance, issues gateway refund, records compensating ledger entries, and updates payment state. |
| `GET` | `/api/payments/:paymentId/refunds` | `requireAuth` (Participant) | Lists all refund records associated with a specific payment. |
| `POST` | `/api/payments/reconcile` | `requireAuth` (Brand/Admin) | Operational reconciliation endpoint that checks gateway status against internal database and reconciles any state discrepancies safely. |

---

## 20. Error Codes & Envelopes

```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | DUPLICATE_PROPOSAL | INVALID_ASSET_REFERENCE | MILESTONE_SUM_MISMATCH | CURRENCY_MISMATCH | CAMPAIGN_NOT_ELIGIBLE | CAMPAIGN_ALREADY_AWARDED | INVALID_STATE_TRANSITION | AI_SERVICE_UNAVAILABLE | AI_RATE_LIMIT_EXCEEDED | SSRF_SECURITY_VIOLATION | INVALID_AI_RESPONSE | INVALID_CONVERSION_STATE | BRIEF_NOT_PUBLISHED | INVALID_FILE_SIGNATURE | FILE_TYPE_NOT_ALLOWED | SVG_NOT_ALLOWED | FILE_TOO_LARGE | FILE_CORRUPTED | UPLOAD_EXPIRED | ASSET_IN_USE | INVALID_STORAGE_TOKEN | UNFINISHED_DELIVERABLES | MILESTONE_NOT_FOUND | MILESTONE_ALREADY_APPROVED | SUBMISSION_NOT_FOUND | SUBMISSION_ALREADY_REVIEWED | FEEDBACK_REQUIRED | EMPTY_MESSAGE | INVALID_PROJECT_ID | PROJECT_NOT_FOUND | FORBIDDEN | PROJECT_CANCELLED | UNSUPPORTED_CURRENCY | INVALID_MILESTONE_ID | MILESTONE_ALREADY_PAID | MISSING_PAYMENT_VERIFICATION_FIELDS | INVALID_PAYMENT_ID | PAYMENT_NOT_FOUND | ORDER_MISMATCH | INVALID_SIGNATURE | REASON_REQUIRED | PAYMENT_NOT_REFUNDABLE | INVALID_REFUND_AMOUNT | REFUND_EXCEEDS_BALANCE | GATEWAY_REFUND_FAILED | NO_GATEWAY_REFERENCE",
    "message": "Human readable error description",
    "details": []
  }
}
```



