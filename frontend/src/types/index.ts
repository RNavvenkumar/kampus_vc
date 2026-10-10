export type UserRole = 'creator' | 'brand' | 'admin';
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'pending';
  emailVerified: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  lastLoginAt?: string;
  avatar?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeDna {
  mediums: string[];
  styles: string[];
  tools: string[];
  strengths: string[];
  colorPalette?: string[];
}

export interface PortfolioItem {
  id: string;
  title: string;
  slug?: string;
  description: string;
  category: string;
  tags: string[];
  creativeTools: string[];
  mediaType: 'image' | 'video' | 'project';
  mediaUrl: string;
  thumbnailUrl?: string;
  assetId?: string;
  thumbnailAssetId?: string;
  projectUrl?: string;
  clientName?: string;
  completionDate?: string;
  isFeatured: boolean;
  displayOrder: number;
  visibility: 'public' | 'unlisted' | 'private';
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  deliverables: string[];
  revisions: number;
  price: number;
  currency: string;
  turnaroundDays: number;
  packageTier: 'starter' | 'standard' | 'premium';
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatorAvailability {
  availability: 'available' | 'limited' | 'busy';
  availabilityNote?: string;
  availableFromDate?: string | null;
  updatedAt?: string;
}

export interface CreatorProfile {
  id: string;
  userId?: string;
  displayName: string;
  username?: string;
  handle?: string;
  headline?: string;
  tagline?: string;
  biography?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    github?: string;
    artstation?: string;
    behance?: string;
    linkedin?: string;
  };
  specialties: string[];
  creativeTools: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  creativeDna?: CreativeDna;
  hourlyRate?: number;
  rateStartingAt?: number;
  currency?: string;
  availability: 'available' | 'limited' | 'busy';
  availabilityNote?: string;
  availableFromDate?: string;
  portfolioItems: PortfolioItem[];
  services: ServiceItem[];
  profileVisibility: 'public' | 'unlisted' | 'private';
  profileCompletion: number;
  verifiedStatus?: 'verified' | 'unverified' | 'featured';
  isDemonstration?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandProfile {
  id: string;
  userId: string;
  companyName: string;
  companySlug?: string;
  industry: string;
  companySize: string;
  website?: string;
  description: string;
  logoUrl?: string;
  location?: string;
  contactName: string;
  contactRole?: string;
  verificationStatus?: 'verified' | 'unverified';
  profileCompletion: number;
  createdAt?: string;
  updatedAt?: string;
}

export type BriefStatus = 'draft' | 'published' | 'paused' | 'archived' | 'awarded';

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'shortlisted'
  | 'revision_requested'
  | 'accepted'
  | 'declined'
  | 'withdrawn';

export interface ProposalMilestone {
  title: string;
  description?: string;
  amount?: number;
  durationWeeks?: number;
  order: number;
}

export interface AcceptedAgreementSnapshot {
  agreedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: string;
  deliverables: string[];
  milestones: ProposalMilestone[];
  revisionAllowance: number;
  pitchTitle?: string;
  pitchMessage: string;
  creatorId: string;
  brandId: string;
  briefId: string;
  acceptedAt: string;
  proposalVersion: number;
}

export interface CampaignProposal {
  id: string;
  creatorId: any;
  briefId: any;
  brandId: any;
  proposalReference: string;
  pitchTitle?: string;
  pitchMessage: string;
  referencedPortfolioItemIds: string[];
  referencedServiceId?: string;
  proposedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: string;
  deliverables: string[];
  milestones: ProposalMilestone[];
  revisionAllowance: number;
  status: ProposalStatus;
  revisionMessage?: string;
  submittedAt?: string;
  decisionAt?: string;
  revisionNumber: number;
  acceptedAgreementSnapshot?: AcceptedAgreementSnapshot;
  createdAt: string;
  updatedAt: string;
  brief?: CampaignBrief;
  creator?: User;
  creatorProfile?: Partial<CreatorProfile>;
  referencedPortfolio?: PortfolioItem[];
  referencedService?: ServiceItem;
  compatibility?: {
    matchPercentage: number;
    matchingSpecialties: string[];
    budgetFit: boolean;
    notes: string[];
  };
}

export type ProjectStatus = 'ready_for_kickoff' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_for_review'
  | 'revision_requested'
  | 'approved';

export interface ProjectMilestone {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  amount?: number;
  durationWeeks?: number;
  order: number;
  deliverables?: string[];
  dueDate?: string;
  status: MilestoneStatus;
  startedAt?: string;
  approvedAt?: string;
  latestSubmission?: {
    id?: string;
    version: number;
    status: 'submitted' | 'revision_requested' | 'approved';
    reviewFeedback?: string;
    submittedAt: string;
    reviewedAt?: string;
  } | null;
}

export type SubmissionStatus = 'submitted' | 'revision_requested' | 'approved';

export interface SubmissionAttachment {
  assetId: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  category: 'image' | 'video';
  accessUrl?: string;
}

export interface DeliverableSubmission {
  id: string;
  projectId: string;
  milestoneId: string;
  version: number;
  creatorId: any;
  submissionNotes: string;
  attachments: SubmissionAttachment[];
  externalLinks: string[];
  status: SubmissionStatus;
  reviewFeedback?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  submittedAt: string;
  createdAt: string;
}

export interface MessageAttachment {
  assetId: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  category: 'image' | 'video';
  accessUrl?: string;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  senderId: any;
  senderRole: 'creator' | 'brand';
  content: string;
  attachments: MessageAttachment[];
  replyToMessageId?: any;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface ProjectActivityItem {
  id: string;
  projectId: string;
  actorId: any;
  actorRole: 'creator' | 'brand' | 'system';
  eventType: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ProjectWorkspaceFile {
  id: string;
  assetId: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  category: 'image' | 'video';
  dimensions?: { width?: number; height?: number };
  uploader?: any;
  accessUrl: string;
  createdAt: string;
}

export interface Project {
  id: string;
  projectReference: string;
  briefId: any;
  proposalId: any;
  creatorId: any;
  brandId: any;
  title: string;
  agreedDescription: string;
  agreedDeliverables: string[];
  agreedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: string;
  milestones: ProjectMilestone[];
  revisionAllowance: number;
  status: ProjectStatus;
  agreementSnapshot: AcceptedAgreementSnapshot;
  createdAt: string;
  updatedAt: string;
  brief?: CampaignBrief;
  creator?: User;
  brand?: User;
  isCreator?: boolean;
  isBrand?: boolean;
  pendingSubmissionsCount?: number;
  messageCount?: number;
}

export type NotificationType =
  | 'proposal_submitted'
  | 'proposal_shortlisted'
  | 'revision_requested'
  | 'proposal_resubmitted'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'campaign_awarded_other'
  | 'project_created'
  | 'project_message'
  | 'deliverable_submitted'
  | 'deliverable_revision_requested'
  | 'deliverable_approved'
  | 'milestone_status_changed'
  | 'project_completed'
  | 'project_status_changed';

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  proposalId?: string;
  briefId?: string;
  projectId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
export type BudgetType = 'fixed' | 'range';
export type EngagementType = 'milestone' | 'retainer' | 'one_off';
export type LocationPreference = 'remote' | 'hybrid' | 'onsite';
export type ExperienceRequirement = 'any' | 'intermediate' | 'advanced' | 'expert';

export interface CampaignBrief {
  id: string;
  brandId: string;
  companyName: string;
  companySlug?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  requiredSpecialties: string[];
  creativeTools: string[];
  deliverables: string[];
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  durationWeeks: number;
  targetStartDate?: string;
  deadline?: string;
  engagementType: EngagementType;
  locationPreference: LocationPreference;
  experienceLevel: ExperienceRequirement;
  referenceUrls: string[];
  status: BriefStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    companyName: string;
    industry?: string;
    companySize?: string;
    website?: string;
    logoUrl?: string;
    verificationStatus?: string;
  };
}

export interface BriefStats {
  total: number;
  draft: number;
  published: number;
  paused: number;
  archived: number;
}

export interface BackendHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  platform: string;
  services: {
    server: {
      status: string;
      nodeVersion: string;
      memoryUsage: number;
    };
    database: {
      status: 'connected' | 'connecting' | 'disconnected' | 'error' | 'disabled';
      host?: string;
      name?: string;
      error?: string;
    };
  };
}

// Phase 5: AI Creative Brief Studio & Generation Types
export interface AIProviderStatus {
  isConfigured: boolean;
  provider: string;
  textModel: string;
  visionModel: string;
  dailyLimit: number;
}

export interface AIUsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
  latencyMs?: number;
}

export interface GeneratedDeliverable {
  name: string;
  quantity: number;
  format: string;
  dimensionsOrRatio?: string;
  requiredElements: string[];
  acceptanceCriteria: string[];
}

export interface GeneratedBrief {
  schemaVersion: string;
  title: string;
  summary: string;
  objective: string;
  targetAudience: string;
  coreMessage: string;
  creativeApproach: string;
  requiredSpecialties: string[];
  suggestedTools: string[];
  deliverables: GeneratedDeliverable[];
  acceptanceCriteria: string[];
  constraints: string[];
  exclusions: string[];
  budgetSuggestion?: {
    minBudget?: number;
    maxBudget?: number;
    currency: string;
    reasoning: string;
  } | null;
  timelineSuggestion?: {
    estimatedWeeks?: number;
    keyPhases: string[];
    reasoning: string;
  } | null;
  missingInformation: string[];
  clarificationQuestions: string[];
}

export interface ColorSwatch {
  name: string;
  hex: string;
  weight?: string;
}

export interface CreativeDirection {
  directionName: string;
  creativeConcept: string;
  moodAndTone: string[];
  visualStyle: string;
  colorPalette: ColorSwatch[];
  lightingAndComposition: string;
  typographyGuidance: string;
  motionOrCameraDirection: string;
  recommendedDeliverables: string[];
  strengthsAndTradeoffs: {
    strengths: string[];
    tradeoffs: string[];
  };
  productionConsiderations: string[];
  accessibilityConsiderations?: string;
}

export interface MoodboardAnalysis {
  dominantColors: ColorSwatch[];
  approximatePalette: ColorSwatch[];
  lightingCharacteristics: string;
  compositionAndFraming: string;
  visualTone: string;
  textureAndMaterialCues: string[];
  typographyObservations: string;
  recurringPatterns: string[];
  likelyThemes: string[];
  productionConsiderations: string[];
  questionsOrAmbiguities: string[];
}

export interface SynthesizedDeliverable {
  name: string;
  quantity: number;
  format: string;
  dimensionsOrRatio?: string;
  requiredContent: string;
  requiredElements: string[];
  acceptanceCriteria: string[];
  revisionExpectations?: string;
  dependencies: string[];
  productionConsiderations?: string;
  milestoneGrouping?: string;
}

export interface SuggestedMilestone {
  phaseName: string;
  estimatedDurationWeeks: number;
  deliverableNames: string[];
  keyMilestoneDeliverable: string;
}

export interface RequirementSynthesis {
  deliverables: SynthesizedDeliverable[];
  suggestedMilestones: SuggestedMilestone[];
  clarificationQuestions: string[];
}

export interface DraftImprovement {
  originalField: string;
  suggestedImprovement: string;
  rationale: string;
  changesSummary: string;
  consistencyCheck: {
    isConsistent: boolean;
    issuesFound: string[];
  };
}

export interface DraftImprovementRecord {
  timestamp: string;
  field: string;
  originalText: string;
  improvedText: string;
  applied: boolean;
}

export interface MoodboardReferenceItem {
  url: string;
  caption?: string;
  addedAt?: string;
}

export interface CreativeBriefDraft {
  id: string;
  brandId: string;
  campaignBriefId?: string;
  title: string;
  userPrompt: string;
  promptContext?: {
    category?: string;
    knownBudgetMin?: number;
    knownBudgetMax?: number;
    currency?: string;
    timelineWeeks?: number;
    locationPreference?: string;
  };
  structuredBrief: GeneratedBrief;
  creativeDirections: CreativeDirection[];
  selectedDirectionIndex?: number;
  moodboardReferences: MoodboardReferenceItem[];
  moodboardAnalysis?: MoodboardAnalysis;
  synthesizedRequirements?: RequirementSynthesis;
  improvementsHistory: DraftImprovementRecord[];
  version: number;
  generationStatus: 'draft' | 'generating' | 'ready' | 'failed';
  aiMetadata?: {
    provider?: string;
    model?: string;
    totalTokens?: number;
    generatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 6: Creator Discovery, Search & Explainable Matching Types
// ==========================================

export interface CreatorSearchQuery {
  q?: string;
  category?: string;
  specialties?: string[] | string;
  creativeTools?: string[] | string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  availability?: 'available' | 'limited' | 'busy' | 'All';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'All';
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'completion' | 'experience';
  page?: number;
  limit?: number;
}

export interface SafePublicCreator {
  id: string;
  displayName: string;
  username: string;
  headline: string;
  biography: string;
  avatarUrl?: string;
  coverUrl?: string;
  specialties: string[];
  creativeTools: string[];
  experienceLevel: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  hourlyRate?: number;
  currency: string;
  availability: string;
  availabilityNote?: string;
  availableFromDate?: string;
  profileCompletion: number;
  portfolioItems: PortfolioItem[];
  services: ServiceItem[];
  portfolioCount: number;
  servicesCount: number;
  startingPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorSearchResult {
  creators: SafePublicCreator[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filtersApplied: {
    q?: string;
    category?: string;
    specialties: string[];
    creativeTools: string[];
    priceRange?: { min?: number; max?: number; currency?: string };
    availability?: string;
    experienceLevel?: string;
    sortBy: string;
  };
}

export interface CitedPortfolioEvidence {
  id: string;
  title: string;
  thumbnailUrl?: string;
  mediaUrl: string;
  mediaType: string;
  category: string;
  matchedTags: string[];
}

export interface MatchBreakdown {
  specialties: {
    score: number;
    maxScore: number;
    matched: string[];
    missing: string[];
    explanation: string;
  };
  tools: {
    score: number;
    maxScore: number;
    matched: string[];
    missing: string[];
    explanation: string;
  };
  portfolioEvidence: {
    score: number;
    maxScore: number;
    citedItems: CitedPortfolioEvidence[];
    matchCount: number;
    explanation: string;
  };
  serviceCompatibility: {
    score: number;
    maxScore: number;
    matchingServiceCount: number;
    explanation: string;
  };
  budget: {
    status: 'compatible' | 'stretch' | 'incompatible' | 'unknown';
    score: number;
    maxScore: number;
    currencyMatch: boolean;
    creatorRate?: number;
    creatorCurrency: string;
    briefBudgetMin: number;
    briefBudgetMax: number;
    briefCurrency: string;
    explanation: string;
  };
  availability: {
    status: 'available' | 'limited' | 'busy' | 'unknown';
    score: number;
    maxScore: number;
    explanation: string;
  };
}

export interface CreatorCampaignMatch {
  creator: SafePublicCreator;
  overallScore: number;
  matchGrade: 'Exceptional Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
  breakdown: MatchBreakdown;
  strengths: string[];
  gaps: string[];
}

export interface CampaignMatchesResult {
  brief: {
    id: string;
    title: string;
    category: string;
    requiredSpecialties: string[];
    creativeTools: string[];
    budgetMin: number;
    budgetMax: number;
    currency: string;
    status: string;
    durationWeeks: number;
  };
  totalMatches: number;
  matches: CreatorCampaignMatch[];
}

export interface CreatorOpportunityItem {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companySlug?: string;
  category: string;
  summary: string;
  description: string;
  requiredSpecialties: string[];
  creativeTools: string[];
  deliverables: string[];
  budgetType: 'fixed' | 'range';
  budgetMin: number;
  budgetMax: number;
  currency: string;
  durationWeeks: number;
  locationPreference: string;
  publishedAt: string;
  matchScore: number;
  matchGrade: string;
  matchedSpecialties: string[];
  matchedTools: string[];
  reasons: string[];
  proposalStatus?: 'draft' | 'submitted' | 'shortlisted' | 'revision_requested' | 'accepted' | 'declined' | 'withdrawn' | 'none';
  proposalId?: string;
}

export interface CreatorOpportunitiesResult {
  opportunities: CreatorOpportunityItem[];
  total: number;
  creatorSummary: {
    displayName: string;
    specialties: string[];
    creativeTools: string[];
  };
}

export interface ParsedSearchIntent {
  interpretedQuery: string;
  category?: string;
  specialties: string[];
  creativeTools: string[];
  minPrice?: number;
  maxPrice?: number;
  currency: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availability?: 'available' | 'limited' | 'busy';
  extractedKeywords: string[];
}

// ==========================
// Phase 7: Media & Object Storage
// ==========================
export type MediaCategory = 'image' | 'video';
export type MediaStatus = 'initiated' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'rejected';
export type MediaVisibility = 'public' | 'unlisted' | 'private';

export interface MediaAsset {
  id: string;
  userId: string;
  storageProvider: 'local' | 's3';
  objectKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  category: MediaCategory;
  fileSizeBytes: number;
  dimensions?: {
    width?: number;
    height?: number;
  };
  durationSeconds?: number;
  status: MediaStatus;
  visibility: MediaVisibility;
  failureReason?: string;
  checksumSha256?: string;
  accessUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateUploadResponse {
  uploadId: string;
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  directUploadToken?: string;
  expiresInSeconds: number;
  category: MediaCategory;
}

// ==========================
// Phase 9: Payments, Refunds & Escrow
// ==========================
export type PaymentStatus =
  | 'created'
  | 'order_created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type PaymentPurpose = 'full_project' | 'milestone_payment' | 'deposit' | 'custom';

export interface PaymentRecord {
  id: string;
  paymentReference: string;
  projectId: string;
  milestoneId?: string;
  brandId: string;
  creatorId: string;
  amountMinor: number;
  currency: string;
  paymentPurpose: PaymentPurpose;
  milestoneOrder?: number;
  milestoneTitle?: string;
  gateway: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  status: PaymentStatus;
  capturedAmountMinor: number;
  refundedAmountMinor: number;
  remainingRefundableAmountMinor: number;
  capturedAt?: string;
  failedAt?: string;
  failureReason?: string;
  receiptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type RefundStatus = 'pending' | 'processed' | 'failed';

export interface RefundRecord {
  id: string;
  refundReference: string;
  paymentId: string;
  projectId: string;
  brandId: string;
  amountMinor: number;
  currency: string;
  reason: string;
  gatewayRefundId?: string;
  status: RefundStatus;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  entryReference: string;
  projectId: string;
  paymentId?: string;
  refundId?: string;
  entryType: string;
  account: string;
  debitMinor: number;
  creditMinor: number;
  currency: string;
  description: string;
  sequence: number;
  createdAt: string;
}

export interface ProjectFinancials {
  currency: string;
  totalContractMinor: number;
  totalContractMajor: number;
  totalCapturedMinor: number;
  totalCapturedMajor: number;
  totalRefundedMinor: number;
  totalRefundedMajor: number;
  heldInEscrowMinor: number;
  heldInEscrowMajor: number;
  remainingPayableMinor: number;
  remainingPayableMajor: number;
}

export interface ProjectFinancialsResponse {
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  ledgerSummary: {
    entries: FinancialLedgerEntry[];
    totalDebitMinor: number;
    totalCreditMinor: number;
    isInBalance: boolean;
    heldInEscrowMinor: number;
    accountBalances: Record<string, { debitMinor: number; creditMinor: number; netBalanceMinor: number }>;
  };
  financials: ProjectFinancials;
}

export interface CreateOrderResponse {
  payment: PaymentRecord;
  orderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
}



