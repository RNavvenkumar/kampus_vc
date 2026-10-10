import axios, { AxiosError } from 'axios';
import {
  BackendHealthResponse,
  CreatorProfile,
  BrandProfile,
  User,
  PortfolioItem,
  ServiceItem,
  CreatorAvailability,
  CampaignBrief,
  BriefStats,
  CampaignProposal,
  Project,
  NotificationItem,
  AIProviderStatus,
  AIUsageMetrics,
  GeneratedBrief,
  CreativeDirection,
  MoodboardAnalysis,
  RequirementSynthesis,
  DraftImprovement,
  CreativeBriefDraft,
  CreatorSearchQuery,
  CreatorSearchResult,
  CampaignMatchesResult,
  CreatorOpportunitiesResult,
  CreatorCampaignMatch,
  ParsedSearchIntent,
  MediaAsset,
  InitiateUploadResponse,
  ProjectMilestone,
  DeliverableSubmission,
  ProjectMessage,
  ProjectActivityItem,
  ProjectWorkspaceFile,
  PaymentRecord,
  RefundRecord,
  ProjectFinancialsResponse,
  CreateOrderResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enables HTTP-only session cookies
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kampus_session_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

export function extractErrorMessage(err: unknown, defaultMsg = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMsg;
}

// ----------------------------------------------------
// Health API
// ----------------------------------------------------
export async function getBackendHealth(): Promise<{
  connected: boolean;
  data: BackendHealthResponse | null;
  error?: string;
}> {
  try {
    const response = await apiClient.get<BackendHealthResponse>('/health');
    return {
      connected: true,
      data: response.data,
    };
  } catch (err: unknown) {
    const error = err as AxiosError;
    return {
      connected: false,
      data: null,
      error: error.message || 'Unable to connect to backend server',
    };
  }
}

// ----------------------------------------------------
// Auth API
// ----------------------------------------------------
export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'creator' | 'brand';
}): Promise<{ user: User; sessionToken?: string }> {
  const response = await apiClient.post<{ success: boolean; data: { user: User; sessionToken: string } }>(
    '/auth/register',
    payload
  );
  if (response.data.data?.sessionToken) {
    localStorage.setItem('kampus_session_token', response.data.data.sessionToken);
  }
  return response.data.data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<{ user: User; sessionToken?: string }> {
  const response = await apiClient.post<{ success: boolean; data: { user: User; sessionToken: string } }>(
    '/auth/login',
    payload
  );
  if (response.data.data?.sessionToken) {
    localStorage.setItem('kampus_session_token', response.data.data.sessionToken);
  }
  return response.data.data;
}

export async function googleAuthUser(payload: {
  credential: string;
  role?: 'creator' | 'brand';
}): Promise<{ user: User; sessionToken?: string }> {
  const response = await apiClient.post<{ success: boolean; data: { user: User; sessionToken: string } }>(
    '/auth/google',
    payload
  );
  if (response.data.data?.sessionToken) {
    localStorage.setItem('kampus_session_token', response.data.data.sessionToken);
  }
  return response.data.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('kampus_session_token');
  }
}

export async function getCurrentUser(): Promise<{
  user: User;
  profile: CreatorProfile | BrandProfile | null;
} | null> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: { user: User; profile: CreatorProfile | BrandProfile | null };
    }>('/auth/me');
    return response.data.data;
  } catch {
    return null;
  }
}

export async function changeUserPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<void> {
  await apiClient.post('/auth/change-password', payload);
}

// ----------------------------------------------------
// Creator Profile & Onboarding API
// ----------------------------------------------------
export async function getCreatorProfileMe(): Promise<CreatorProfile> {
  const response = await apiClient.get<{ success: boolean; data: CreatorProfile }>('/creator/profile/me');
  return response.data.data;
}

export async function updateCreatorProfileMe(data: Partial<CreatorProfile>): Promise<CreatorProfile> {
  const response = await apiClient.patch<{ success: boolean; data: CreatorProfile }>('/creator/profile/me', data);
  return response.data.data;
}

export async function saveCreatorOnboardingStep(
  step: number,
  data: Partial<CreatorProfile>
): Promise<{ profile: CreatorProfile; onboardingStep: number; onboardingStatus: string }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { profile: CreatorProfile; onboardingStep: number; onboardingStatus: string };
  }>('/creator/onboarding/step', { step, data });
  return response.data.data;
}

export async function completeCreatorOnboarding(): Promise<{ user: User; profile: CreatorProfile }> {
  const response = await apiClient.post<{ success: boolean; data: { user: User; profile: CreatorProfile } }>(
    '/creator/onboarding/complete',
    {}
  );
  return response.data.data;
}

// ----------------------------------------------------
// Creator Portfolio API (Phase 3)
// ----------------------------------------------------
export async function getMyPortfolio(): Promise<{ items: PortfolioItem[]; total: number }> {
  const response = await apiClient.get<{ success: boolean; data: { items: PortfolioItem[]; total: number } }>(
    '/creator/portfolio'
  );
  return response.data.data;
}

export async function createPortfolioItem(data: Partial<PortfolioItem>): Promise<PortfolioItem> {
  const response = await apiClient.post<{ success: boolean; data: PortfolioItem }>('/creator/portfolio', data);
  return response.data.data;
}

export async function getPortfolioItemById(itemId: string): Promise<PortfolioItem> {
  const response = await apiClient.get<{ success: boolean; data: PortfolioItem }>(`/creator/portfolio/${itemId}`);
  return response.data.data;
}

export async function updatePortfolioItem(itemId: string, data: Partial<PortfolioItem>): Promise<PortfolioItem> {
  const response = await apiClient.patch<{ success: boolean; data: PortfolioItem }>(
    `/creator/portfolio/${itemId}`,
    data
  );
  return response.data.data;
}

export async function deletePortfolioItem(itemId: string): Promise<void> {
  await apiClient.delete(`/creator/portfolio/${itemId}`);
}

export async function reorderPortfolio(itemIds: string[]): Promise<void> {
  await apiClient.patch('/creator/portfolio/reorder', { itemIds });
}

export async function toggleFeaturedItem(itemId: string): Promise<PortfolioItem> {
  const response = await apiClient.patch<{ success: boolean; data: PortfolioItem }>(
    `/creator/portfolio/${itemId}/feature`
  );
  return response.data.data;
}

// ----------------------------------------------------
// Creator Service Catalog & Availability (Phase 3)
// ----------------------------------------------------
export async function getMyServices(): Promise<{ services: ServiceItem[]; total: number }> {
  const response = await apiClient.get<{ success: boolean; data: { services: ServiceItem[]; total: number } }>(
    '/creator/services'
  );
  return response.data.data;
}

export async function createService(data: Partial<ServiceItem>): Promise<ServiceItem> {
  const response = await apiClient.post<{ success: boolean; data: ServiceItem }>('/creator/services', data);
  return response.data.data;
}

export async function getServiceById(serviceId: string): Promise<ServiceItem> {
  const response = await apiClient.get<{ success: boolean; data: ServiceItem }>(`/creator/services/${serviceId}`);
  return response.data.data;
}

export async function updateService(serviceId: string, data: Partial<ServiceItem>): Promise<ServiceItem> {
  const response = await apiClient.patch<{ success: boolean; data: ServiceItem }>(
    `/creator/services/${serviceId}`,
    data
  );
  return response.data.data;
}

export async function deleteService(serviceId: string): Promise<void> {
  await apiClient.delete(`/creator/services/${serviceId}`);
}

export async function toggleServiceStatus(serviceId: string): Promise<ServiceItem> {
  const response = await apiClient.patch<{ success: boolean; data: ServiceItem }>(
    `/creator/services/${serviceId}/status`
  );
  return response.data.data;
}

export async function getCreatorAvailability(): Promise<CreatorAvailability> {
  const response = await apiClient.get<{ success: boolean; data: CreatorAvailability }>('/creator/availability');
  return response.data.data;
}

export async function updateCreatorAvailability(data: {
  availability: 'available' | 'limited' | 'busy';
  availabilityNote?: string;
  availableFromDate?: string | null;
}): Promise<CreatorAvailability> {
  const response = await apiClient.patch<{ success: boolean; data: CreatorAvailability }>(
    '/creator/availability',
    data
  );
  return response.data.data;
}

// ----------------------------------------------------
// Brand Profile & Onboarding API
// ----------------------------------------------------
export async function getBrandProfileMe(): Promise<BrandProfile> {
  const response = await apiClient.get<{ success: boolean; data: BrandProfile }>('/brand/profile/me');
  return response.data.data;
}

export async function updateBrandProfileMe(data: Partial<BrandProfile>): Promise<BrandProfile> {
  const response = await apiClient.patch<{ success: boolean; data: BrandProfile }>('/brand/profile/me', data);
  return response.data.data;
}

export async function saveBrandOnboardingStep(
  step: number,
  data: Partial<BrandProfile>
): Promise<{ profile: BrandProfile; onboardingStep: number; onboardingStatus: string }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { profile: BrandProfile; onboardingStep: number; onboardingStatus: string };
  }>('/brand/onboarding/step', { step, data });
  return response.data.data;
}

export async function completeBrandOnboarding(): Promise<{ user: User; profile: BrandProfile }> {
  const response = await apiClient.post<{ success: boolean; data: { user: User; profile: BrandProfile } }>(
    '/brand/onboarding/complete',
    {}
  );
  return response.data.data;
}

// ----------------------------------------------------
// Brand Campaign Briefs API (Phase 3)
// ----------------------------------------------------
export async function getMyBrandBriefs(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  briefs: CampaignBrief[];
  pagination: { page: number; limit: number; total: number; pages: number };
  stats: BriefStats;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      briefs: CampaignBrief[];
      pagination: { page: number; limit: number; total: number; pages: number };
      stats: BriefStats;
    };
  }>('/brand/briefs', { params });
  return response.data.data;
}

export async function createBrandBrief(data: Partial<CampaignBrief>): Promise<CampaignBrief> {
  const response = await apiClient.post<{ success: boolean; data: CampaignBrief }>('/brand/briefs', data);
  return response.data.data;
}

export async function getBrandBriefById(briefId: string): Promise<CampaignBrief> {
  const response = await apiClient.get<{ success: boolean; data: CampaignBrief }>(`/brand/briefs/${briefId}`);
  return response.data.data;
}

export async function updateBrandBrief(briefId: string, data: Partial<CampaignBrief>): Promise<CampaignBrief> {
  const response = await apiClient.patch<{ success: boolean; data: CampaignBrief }>(
    `/brand/briefs/${briefId}`,
    data
  );
  return response.data.data;
}

export async function publishBrandBrief(briefId: string): Promise<CampaignBrief> {
  const response = await apiClient.post<{ success: boolean; data: CampaignBrief }>(
    `/brand/briefs/${briefId}/publish`
  );
  return response.data.data;
}

export async function pauseBrandBrief(briefId: string): Promise<CampaignBrief> {
  const response = await apiClient.post<{ success: boolean; data: CampaignBrief }>(
    `/brand/briefs/${briefId}/pause`
  );
  return response.data.data;
}

export async function resumeBrandBrief(briefId: string): Promise<CampaignBrief> {
  const response = await apiClient.post<{ success: boolean; data: CampaignBrief }>(
    `/brand/briefs/${briefId}/resume`
  );
  return response.data.data;
}

export async function archiveBrandBrief(briefId: string): Promise<CampaignBrief> {
  const response = await apiClient.post<{ success: boolean; data: CampaignBrief }>(
    `/brand/briefs/${briefId}/archive`
  );
  return response.data.data;
}

export async function deleteBrandBrief(briefId: string): Promise<void> {
  await apiClient.delete(`/brand/briefs/${briefId}`);
}

// ----------------------------------------------------
// Public Discovery API (Phase 3)
// ----------------------------------------------------
export async function getPublicBriefs(params?: {
  q?: string;
  category?: string;
  specialty?: string;
  engagementType?: string;
  locationPreference?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{
  briefs: CampaignBrief[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      briefs: CampaignBrief[];
      pagination: { page: number; limit: number; total: number; pages: number };
    };
  }>('/briefs', { params });
  return response.data.data;
}

export async function getPublicBriefByIdOrSlug(briefIdOrSlug: string): Promise<CampaignBrief> {
  const response = await apiClient.get<{ success: boolean; data: CampaignBrief }>(`/briefs/${briefIdOrSlug}`);
  return response.data.data;
}

export async function getPublicCreators(params?: {
  q?: string;
  specialty?: string;
  tool?: string;
  availability?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{
  creators: CreatorProfile[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      creators: CreatorProfile[];
      pagination: { page: number; limit: number; total: number; pages: number };
    };
  }>('/creators', { params });
  return response.data.data;
}

export async function getPublicCreatorByUsernameOrId(usernameOrId: string): Promise<CreatorProfile> {
  const response = await apiClient.get<{ success: boolean; data: CreatorProfile }>(`/creators/${usernameOrId}`);
  return response.data.data;
}

// Curated demonstration creator profiles
export const DEMO_CREATORS: CreatorProfile[] = [
  {
    id: 'demo-1',
    userId: 'user-1',
    displayName: 'Elena Vance',
    username: 'elenavance_ai',
    headline: 'Generative AI Director & Cinematic World Builder',
    biography: 'Pioneering surreal sci-fi environments and high-fashion AI visuals for luxury brands, album covers, and film concept art.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    specialties: ['AI Concept Art', 'World Building', 'Cinematic Keyframes', 'Midjourney v6'],
    creativeTools: ['Midjourney', 'Stable Diffusion XL', 'Photoshop', 'ComfyUI'],
    creativeDna: {
      mediums: ['Generative AI', '2.5D Motion', 'Digital Matte Painting'],
      styles: ['Cyber-Noir', 'Photorealistic Surrealism', 'High-Contrast Editorial'],
      tools: ['Midjourney', 'Stable Diffusion XL', 'Photoshop', 'ComfyUI'],
      strengths: ['Lighting Composition', 'Prompt Engineering', 'Complex Texturing'],
      colorPalette: ['#0A1128', '#00E8C6', '#FF3366']
    },
    rateStartingAt: 1200,
    currency: 'USD',
    availability: 'available',
    portfolioItems: [
      {
        id: 'p-1',
        title: 'Neo-Tokyo Solitude',
        description: 'Atmospheric AI architectural study exploring future vertical megastructures in rainy dusk light.',
        category: 'Generative Art',
        tags: ['Cyberpunk', 'Atmospheric', 'Architectural'],
        creativeTools: ['Midjourney v6', 'Photoshop'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        isFeatured: true,
        displayOrder: 0,
        visibility: 'public'
      },
      {
        id: 'p-2',
        title: 'Bioluminescent Flora',
        description: 'Microscopic organic textures synthesized with neural style transfer for cosmetics campaign.',
        category: 'Texture Design',
        tags: ['Organic', 'Bioluminescent', 'Macro'],
        creativeTools: ['ComfyUI', 'SDXL'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        isFeatured: false,
        displayOrder: 1,
        visibility: 'public'
      }
    ],
    services: [
      {
        id: 's-1',
        title: 'Keyframe Concept Art Package',
        description: 'Complete set of 4 4K resolution cinematic concept keyframes with visual direction notes.',
        category: 'Concept Art',
        deliverables: ['4x 4K Master Visuals', 'Lighting Breakdown Sheet', 'PSD Working Files'],
        revisions: 2,
        price: 1200,
        currency: 'USD',
        turnaroundDays: 5,
        packageTier: 'standard',
        status: 'active'
      }
    ],
    profileVisibility: 'public',
    profileCompletion: 95,
    verifiedStatus: 'featured',
    isDemonstration: true
  },
  {
    id: 'demo-2',
    userId: 'user-2',
    displayName: 'Marcus Sterling',
    username: 'sterling3d',
    headline: '3D Motion Designer & Houdini Particle Specialist',
    biography: 'Crafting kinetic product trailers, abstract procedural simulations, and fluid title sequences for tech unicorns.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    specialties: ['3D Motion', 'Procedural Simulation', 'Product Visuals', 'Title Sequences'],
    creativeTools: ['Cinema 4D', 'Redshift', 'Houdini', 'After Effects'],
    creativeDna: {
      mediums: ['3D Animation', 'Motion Graphics', 'Houdini VFX'],
      styles: ['Minimalist Kinetic', 'Industrial High-Tech', 'Fluid Abstract'],
      tools: ['Cinema 4D', 'Redshift', 'Houdini', 'After Effects'],
      strengths: ['Physics Simulation', 'Lighting & Caustics', 'Pacing & Rhythm'],
      colorPalette: ['#121214', '#58D5FF', '#F3BD59']
    },
    rateStartingAt: 1800,
    currency: 'USD',
    availability: 'limited',
    portfolioItems: [
      {
        id: 'p-3',
        title: 'Chrono Prism Hardware Launch',
        description: 'Exploded view mechanical animation for flagship smartwatch unveiling.',
        category: '3D Animation',
        tags: ['Hard Surface', 'Industrial', 'Motion'],
        creativeTools: ['Cinema 4D', 'Redshift'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1633493106115-467268875501?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1633493106115-467268875501?w=600&auto=format&fit=crop&q=80',
        isFeatured: true,
        displayOrder: 0,
        visibility: 'public'
      }
    ],
    services: [
      {
        id: 's-2',
        title: '3D Product Teaser (15s)',
        description: 'High-end 15-second kinetic product render with dynamic lighting and camera moves.',
        category: '3D Motion',
        deliverables: ['15s 4K Video', 'ProRes 422 HQ Master', 'Social Aspect Cutdowns (9:16, 1:1)'],
        revisions: 3,
        price: 2400,
        currency: 'USD',
        turnaroundDays: 7,
        packageTier: 'premium',
        status: 'active'
      }
    ],
    profileVisibility: 'public',
    profileCompletion: 90,
    verifiedStatus: 'verified',
    isDemonstration: true
  },
  {
    id: 'demo-3',
    userId: 'user-3',
    displayName: 'Aria Chen',
    username: 'ariachen_vision',
    headline: 'Visual Identity & AI Brand Strategist',
    biography: 'Bridging generative visual systems with bespoke typography and comprehensive brand design languages.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    specialties: ['Brand Identity', 'Generative Design', 'Design Systems', 'Packaging'],
    creativeTools: ['Figma', 'Illustrator', 'Magnific AI', 'Glyphs'],
    creativeDna: {
      mediums: ['Vector Systems', 'Generative Branding', 'Editorial Layout'],
      styles: ['Swiss Modernism', 'Neo-Brutalist Elegance', 'Monochrome Contrast'],
      tools: ['Figma', 'Illustrator', 'Magnific AI', 'Glyphs'],
      strengths: ['Grid Architecture', 'Brand Consistency', 'Typographic Hierarchy'],
      colorPalette: ['#090B10', '#FFFFFF', '#FF4757']
    },
    rateStartingAt: 2200,
    currency: 'USD',
    availability: 'available',
    portfolioItems: [
      {
        id: 'p-4',
        title: 'Kinetix Brand Overhaul',
        description: 'Complete visual identity system for next-generation quantum computing platform.',
        category: 'Visual Identity',
        tags: ['Branding', 'Typography', 'Identity'],
        creativeTools: ['Figma', 'Illustrator'],
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=600&auto=format&fit=crop&q=80',
        isFeatured: true,
        displayOrder: 0,
        visibility: 'public'
      }
    ],
    services: [
      {
        id: 's-3',
        title: 'Complete Brand Identity Sprint',
        description: 'Logo suite, typography hierarchy, primary colour system, and brand guidelines deck.',
        category: 'Branding',
        deliverables: ['Vector Logo Assets', 'Typography Guidelines', 'Figma Design Tokens Guide', 'Brand Book PDF'],
        revisions: 2,
        price: 2200,
        currency: 'USD',
        turnaroundDays: 10,
        packageTier: 'standard',
        status: 'active'
      }
    ],
    profileVisibility: 'public',
    profileCompletion: 85,
    verifiedStatus: 'featured',
    isDemonstration: true
  },
  {
    id: 'demo-4',
    userId: 'user-4',
    displayName: 'Devon Thorne',
    username: 'devonthorne_film',
    headline: 'Short-Form Narrative Director & AI Video Specialist',
    biography: 'Directing AI-enhanced commercials, synthetic video loops, and dynamic video teasers with Runway Gen-3 and Sora workflows.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    specialties: ['AI Video Generation', 'Color Grading', 'Commercial Teasers', 'Sound Design'],
    creativeTools: ['Runway Gen-3', 'Premiere Pro', 'DaVinci Resolve', 'ElevenLabs'],
    creativeDna: {
      mediums: ['Generative Video', 'Live-Action Composite', 'Audio-Visual Sync'],
      styles: ['Cinematic Film Grain', 'Moody High-Key', 'Rhythmic Montage'],
      tools: ['Runway Gen-3', 'Premiere Pro', 'DaVinci Resolve', 'ElevenLabs'],
      strengths: ['Story Pacing', 'Color Science', 'Audio-Visual Harmony'],
      colorPalette: ['#1C1917', '#E0A96D', '#28BDF0']
    },
    rateStartingAt: 2500,
    currency: 'USD',
    availability: 'busy',
    portfolioItems: [
      {
        id: 'p-5',
        title: 'Echoes of the Deep Void',
        description: '60-second speculative trailer produced with synthetic actors and AI landscape generation.',
        category: 'Generative Video',
        tags: ['Narrative', 'Sci-Fi', 'Film'],
        creativeTools: ['Runway Gen-3', 'DaVinci Resolve'],
        mediaType: 'video',
        mediaUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        isFeatured: true,
        displayOrder: 0,
        visibility: 'public'
      }
    ],
    services: [
      {
        id: 's-4',
        title: 'AI Commercial Trailer Production',
        description: 'End-to-end prompt engineering, Runway Gen-3 video generation, color grading, and SFX integration.',
        category: 'Video Production',
        deliverables: ['30s 4K Final Cut', 'Sound Design Mix', 'Clean Version without Text'],
        revisions: 2,
        price: 3200,
        currency: 'USD',
        turnaroundDays: 8,
        packageTier: 'premium',
        status: 'active'
      }
    ],
    profileVisibility: 'public',
    profileCompletion: 90,
    verifiedStatus: 'verified',
    isDemonstration: true
  }
];

// ----------------------------------------------------
// Creator Proposals API (Phase 4)
// ----------------------------------------------------
export interface CreateProposalPayload {
  briefId: string;
  pitchTitle?: string;
  pitchMessage: string;
  referencedPortfolioItemIds?: string[];
  referencedServiceId?: string;
  proposedPrice: number;
  currency?: string;
  deliveryDurationWeeks: number;
  targetStartDate?: string;
  deliverables: string[];
  milestones?: Array<{
    title: string;
    description?: string;
    amount?: number;
    durationWeeks?: number;
    order: number;
  }>;
  revisionAllowance?: number;
  isDraft?: boolean;
}

export async function createProposal(data: CreateProposalPayload): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>('/creator/proposals', data);
  return response.data.data;
}

export async function getMyProposals(params?: {
  status?: string;
  briefId?: string;
  page?: number;
  limit?: number;
}): Promise<{ proposals: CampaignProposal[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const response = await apiClient.get<{ success: boolean; data: CampaignProposal[]; meta: any }>('/creator/proposals', { params });
  return {
    proposals: response.data.data,
    meta: response.data.meta
  };
}

export async function getProposalById(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.get<{ success: boolean; data: CampaignProposal }>(`/creator/proposals/${proposalId}`);
  return response.data.data;
}

export async function updateProposal(proposalId: string, data: Partial<CreateProposalPayload>): Promise<CampaignProposal> {
  const response = await apiClient.patch<{ success: boolean; data: CampaignProposal }>(`/creator/proposals/${proposalId}`, data);
  return response.data.data;
}

export async function submitProposal(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>(`/creator/proposals/${proposalId}/submit`);
  return response.data.data;
}

export async function withdrawProposal(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>(`/creator/proposals/${proposalId}/withdraw`);
  return response.data.data;
}

// ----------------------------------------------------
// Brand Proposal Review Center API (Phase 4)
// ----------------------------------------------------
export async function getBrandProposals(params?: {
  briefId?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ proposals: CampaignProposal[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const response = await apiClient.get<{ success: boolean; data: CampaignProposal[]; meta: any }>('/brand/proposals', { params });
  return {
    proposals: response.data.data,
    meta: response.data.meta
  };
}

export async function getBrandProposalById(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.get<{ success: boolean; data: CampaignProposal }>(`/brand/proposals/${proposalId}`);
  return response.data.data;
}

export async function shortlistProposal(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>(`/brand/proposals/${proposalId}/shortlist`);
  return response.data.data;
}

export async function requestRevision(proposalId: string, message: string): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>(`/brand/proposals/${proposalId}/request-revision`, { message });
  return response.data.data;
}

export async function acceptProposal(proposalId: string): Promise<{ proposal: CampaignProposal; project: Project; brief: CampaignBrief }> {
  const response = await apiClient.post<{ success: boolean; data: { proposal: CampaignProposal; project: Project; brief: CampaignBrief } }>(`/brand/proposals/${proposalId}/accept`);
  return response.data.data;
}

export async function declineProposal(proposalId: string): Promise<CampaignProposal> {
  const response = await apiClient.post<{ success: boolean; data: CampaignProposal }>(`/brand/proposals/${proposalId}/decline`);
  return response.data.data;
}

// ----------------------------------------------------
// Awarded Projects API (Phase 4)
// ----------------------------------------------------
export async function getMyProjects(): Promise<Project[]> {
  const response = await apiClient.get<{ success: boolean; data: Project[] }>('/projects');
  return response.data.data;
}

export async function getProjectById(projectId: string): Promise<Project> {
  const response = await apiClient.get<{ success: boolean; data: Project }>(`/projects/${projectId}`);
  return response.data.data;
}

export async function updateProjectStatus(projectId: string, status: string): Promise<Project> {
  const response = await apiClient.patch<{ success: boolean; data: Project }>(`/projects/${projectId}/status`, { status });
  return response.data.data;
}

export async function getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const response = await apiClient.get<{ success: boolean; data: ProjectMilestone[] }>(`/projects/${projectId}/milestones`);
  return response.data.data;
}

export async function updateMilestoneStatus(projectId: string, milestoneId: string, status: string): Promise<ProjectMilestone> {
  const response = await apiClient.patch<{ success: boolean; data: ProjectMilestone }>(`/projects/${projectId}/milestones/${milestoneId}/status`, { status });
  return response.data.data;
}

export async function submitDeliverable(
  projectId: string,
  milestoneId: string,
  data: { submissionNotes: string; assetIds?: string[]; externalLinks?: string[] }
): Promise<DeliverableSubmission> {
  const response = await apiClient.post<{ success: boolean; data: DeliverableSubmission }>(
    `/projects/${projectId}/milestones/${milestoneId}/submissions`,
    data
  );
  return response.data.data;
}

export async function getMilestoneSubmissions(projectId: string, milestoneId?: string): Promise<DeliverableSubmission[]> {
  const endpoint = milestoneId && milestoneId !== 'all'
    ? `/projects/${projectId}/milestones/${milestoneId}/submissions`
    : `/projects/${projectId}/submissions`;
  const response = await apiClient.get<{ success: boolean; data: DeliverableSubmission[] }>(endpoint);
  return response.data.data;
}

export async function reviewSubmission(
  projectId: string,
  submissionId: string,
  data: { action: 'approve' | 'request_revision'; feedback?: string }
): Promise<{ submission: DeliverableSubmission; milestoneStatus: string }> {
  const response = await apiClient.post<{ success: boolean; data: { submission: DeliverableSubmission; milestoneStatus: string } }>(
    `/projects/${projectId}/submissions/${submissionId}/review`,
    data
  );
  return response.data.data;
}

export async function getProjectMessages(projectId: string, limit?: number): Promise<ProjectMessage[]> {
  const response = await apiClient.get<{ success: boolean; data: ProjectMessage[] }>(`/projects/${projectId}/messages`, {
    params: { limit }
  });
  return response.data.data;
}

export async function sendProjectMessage(
  projectId: string,
  data: { content?: string; assetIds?: string[]; replyToMessageId?: string }
): Promise<ProjectMessage> {
  const response = await apiClient.post<{ success: boolean; data: ProjectMessage }>(`/projects/${projectId}/messages`, data);
  return response.data.data;
}

export async function getProjectActivity(projectId: string): Promise<ProjectActivityItem[]> {
  const response = await apiClient.get<{ success: boolean; data: ProjectActivityItem[] }>(`/projects/${projectId}/activity`);
  return response.data.data;
}

export async function getProjectFiles(projectId: string): Promise<ProjectWorkspaceFile[]> {
  const response = await apiClient.get<{ success: boolean; data: ProjectWorkspaceFile[] }>(`/projects/${projectId}/files`);
  return response.data.data;
}

// ----------------------------------------------------
// Notifications API (Phase 4)
// ----------------------------------------------------
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<{ notifications: NotificationItem[]; meta: { total: number; unreadCount: number; page: number; totalPages: number } }> {
  const response = await apiClient.get<{ success: boolean; data: NotificationItem[]; meta: any }>('/notifications', { params });
  return {
    notifications: response.data.data,
    meta: response.data.meta
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
  return response.data.data.count;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationItem> {
  const response = await apiClient.patch<{ success: boolean; data: NotificationItem }>(`/notifications/${notificationId}/read`);
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read');
}

// ----------------------------------------------------
// AI Creative Brief Studio API (Phase 5)
// ----------------------------------------------------
export async function getAIStatus(): Promise<AIProviderStatus> {
  const response = await apiClient.get<{ success: boolean; data: AIProviderStatus }>('/brand/ai/status');
  return response.data.data;
}

export async function generateAIBrief(params: {
  userPrompt: string;
  category?: string;
  knownBudgetMin?: number;
  knownBudgetMax?: number;
  currency?: string;
  timelineWeeks?: number;
  locationPreference?: string;
  existingBriefId?: string;
}): Promise<{ brief: GeneratedBrief; usage?: AIUsageMetrics }> {
  const response = await apiClient.post<{ success: boolean; data: GeneratedBrief; usage?: AIUsageMetrics }>(
    '/brand/ai/generate-brief',
    params
  );
  return {
    brief: response.data.data,
    usage: response.data.usage
  };
}

export async function generateAIDirections(params: {
  briefTitle: string;
  objective: string;
  creativeApproach?: string;
  targetAudience?: string;
  count?: number;
}): Promise<{ directions: CreativeDirection[]; usage?: AIUsageMetrics }> {
  const response = await apiClient.post<{ success: boolean; data: CreativeDirection[]; usage?: AIUsageMetrics }>(
    '/brand/ai/generate-directions',
    params
  );
  return {
    directions: response.data.data,
    usage: response.data.usage
  };
}

export async function analyzeAIMoodboard(params: {
  imageUrls: string[];
  contextNotes?: string;
}): Promise<{ analysis: MoodboardAnalysis; usage?: AIUsageMetrics }> {
  const response = await apiClient.post<{ success: boolean; data: MoodboardAnalysis; usage?: AIUsageMetrics }>(
    '/brand/ai/analyze-moodboard',
    params
  );
  return {
    analysis: response.data.data,
    usage: response.data.usage
  };
}

export async function synthesizeAIRequirements(params: {
  briefTitle: string;
  summary?: string;
  creativeApproach?: string;
  deliverableHints?: string[];
}): Promise<{ synthesis: RequirementSynthesis; usage?: AIUsageMetrics }> {
  const response = await apiClient.post<{ success: boolean; data: RequirementSynthesis; usage?: AIUsageMetrics }>(
    '/brand/ai/synthesize-requirements',
    params
  );
  return {
    synthesis: response.data.data,
    usage: response.data.usage
  };
}

export async function improveAIDraft(params: {
  fieldName: string;
  currentContent: string;
  improvementGoal: string;
  campaignContext?: Record<string, any>;
}): Promise<{ improvement: DraftImprovement; usage?: AIUsageMetrics }> {
  const response = await apiClient.post<{ success: boolean; data: DraftImprovement; usage?: AIUsageMetrics }>(
    '/brand/ai/improve-draft',
    params
  );
  return {
    improvement: response.data.data,
    usage: response.data.usage
  };
}

// ----------------------------------------------------
// Persistent Creative Drafts API (Phase 5)
// ----------------------------------------------------
export async function getCreativeDrafts(params?: {
  page?: number;
  limit?: number;
}): Promise<{ drafts: CreativeBriefDraft[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await apiClient.get<{
    success: boolean;
    data: CreativeBriefDraft[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>('/brand/creative-drafts', { params });
  return {
    drafts: response.data.data,
    pagination: response.data.pagination
  };
}

export async function getCreativeDraftById(draftId: string): Promise<CreativeBriefDraft> {
  const response = await apiClient.get<{ success: boolean; data: CreativeBriefDraft }>(`/brand/creative-drafts/${draftId}`);
  return response.data.data;
}

export async function saveCreativeDraft(payload: Partial<CreativeBriefDraft>): Promise<CreativeBriefDraft> {
  const response = await apiClient.post<{ success: boolean; data: CreativeBriefDraft }>('/brand/creative-drafts', payload);
  return response.data.data;
}

export async function updateCreativeDraft(draftId: string, payload: Partial<CreativeBriefDraft>): Promise<CreativeBriefDraft> {
  const response = await apiClient.patch<{ success: boolean; data: CreativeBriefDraft }>(`/brand/creative-drafts/${draftId}`, payload);
  return response.data.data;
}

export async function deleteCreativeDraft(draftId: string): Promise<void> {
  await apiClient.delete(`/brand/creative-drafts/${draftId}`);
}

export async function convertCreativeDraftToCampaignBrief(draftId: string): Promise<{ campaignBriefId: string; slug: string; title: string; status: string }> {
  const response = await apiClient.post<{ success: boolean; data: { campaignBriefId: string; slug: string; title: string; status: string } }>(
    `/brand/creative-drafts/${draftId}/create-brief`
  );
  return response.data.data;
}

// ----------------------------------------------------
// Phase 6: Creator Discovery, Intent Search & Explainable Matching
// ----------------------------------------------------

export async function searchCreators(params?: CreatorSearchQuery): Promise<CreatorSearchResult> {
  const response = await apiClient.get<{ success: boolean; data: CreatorSearchResult }>('/creators/search', { params });
  return response.data.data;
}

export async function parseSearchIntent(query: string): Promise<ParsedSearchIntent> {
  const response = await apiClient.post<{ success: boolean; data: ParsedSearchIntent }>('/creators/parse-search-intent', { query });
  return response.data.data;
}

export async function getCampaignMatches(
  briefId: string,
  params?: { limit?: number; minScore?: number }
): Promise<CampaignMatchesResult> {
  const response = await apiClient.get<{ success: boolean; data: CampaignMatchesResult }>(
    `/brand/briefs/${briefId}/matches`,
    { params }
  );
  return response.data.data;
}

export async function getCreatorOpportunities(params?: {
  category?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: string;
  limit?: number;
}): Promise<CreatorOpportunitiesResult> {
  const response = await apiClient.get<{ success: boolean; data: CreatorOpportunitiesResult }>(
    '/creator/opportunities',
    { params }
  );
  return response.data.data;
}

export async function getCreatorCampaignCompatibility(briefId: string): Promise<{
  brief: {
    id: string;
    title: string;
    category: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    durationWeeks: number;
  };
  evaluation: CreatorCampaignMatch;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      brief: {
        id: string;
        title: string;
        category: string;
        budgetMin: number;
        budgetMax: number;
        currency: string;
        durationWeeks: number;
      };
      evaluation: CreatorCampaignMatch;
    };
  }>(`/creator/opportunities/${briefId}/compatibility`);
  return response.data.data;
}

// ==========================
// Phase 7: Media & Object Storage API Methods
// ==========================

export async function initiateMediaUpload(data: {
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  category?: 'image' | 'video';
  intendedUse?: string;
}): Promise<InitiateUploadResponse> {
  const response = await apiClient.post<{ message: string; data: InitiateUploadResponse }>(
    '/media/uploads',
    data
  );
  return response.data.data;
}

export async function uploadFileToStorage(
  uploadUrl: string,
  file: File,
  headers: Record<string, string> = {},
  onProgress?: (percent: number) => void,
  method: 'PUT' | 'POST' = 'PUT',
  fields?: Record<string, string>
): Promise<void> {
  // If uploadUrl is relative, prepend API_BASE_URL (for local development storage)
  let resolvedUrl = uploadUrl;
  if (uploadUrl.startsWith('/api')) {
    resolvedUrl = uploadUrl;
  } else if (!uploadUrl.startsWith('http')) {
    resolvedUrl = `${API_BASE_URL}${uploadUrl.startsWith('/') ? '' : '/'}${uploadUrl}`;
  }

  if (method === 'POST' && fields) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, val]) => {
      formData.append(key, val);
    });
    formData.append('file', file);

    await axios.post(resolvedUrl, formData, {
      headers: {
        ...headers
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  } else {
    await axios.put(resolvedUrl, file, {
      headers: {
        'Content-Type': file.type,
        ...headers
      },
      withCredentials: true,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  }
}

export async function completeMediaUpload(uploadId: string): Promise<{ asset: MediaAsset; accessUrl: string }> {
  const response = await apiClient.post<{
    message: string;
    data: { asset: MediaAsset; accessUrl: string };
  }>(`/media/uploads/${uploadId}/complete`);
  return response.data.data;
}

export async function getMediaAsset(assetId: string): Promise<{ asset: MediaAsset; accessUrl: string }> {
  const response = await apiClient.get<{ data: { asset: MediaAsset; accessUrl: string } }>(
    `/media/assets/${assetId}`
  );
  return response.data.data;
}

export async function getMediaAssetAccessUrl(assetId: string): Promise<{ assetId: string; accessUrl: string; mimeType: string; category: string }> {
  const response = await apiClient.get<{ data: { assetId: string; accessUrl: string; mimeType: string; category: string } }>(
    `/media/assets/${assetId}/access`
  );
  return response.data.data;
}

export async function deleteMediaAsset(assetId: string, force = false): Promise<void> {
  await apiClient.delete(`/media/assets/${assetId}`, {
    params: { force: force ? 'true' : 'false' }
  });
}

export async function getMyMediaAssets(params?: {
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ assets: MediaAsset[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const response = await apiClient.get<{
    data: { assets: MediaAsset[]; pagination: { page: number; limit: number; total: number; pages: number } };
  }>('/media/my-assets', { params });
  return response.data.data;
}

// ----------------------------------------------------
// Phase 9: Payments, Escrow, Refunds & Financials API
// ----------------------------------------------------
export async function createPaymentOrder(
  projectId: string,
  milestoneId?: string,
  idempotencyKey?: string
): Promise<CreateOrderResponse> {
  const response = await apiClient.post<CreateOrderResponse>(
    `/projects/${projectId}/payments/orders`,
    { milestoneId, idempotencyKey }
  );
  return response.data;
}

export async function verifyPayment(payload: {
  paymentId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}): Promise<{ message: string; payment: PaymentRecord; ledgerSummary: any }> {
  const response = await apiClient.post<{ message: string; payment: PaymentRecord; ledgerSummary: any }>(
    '/payments/verify',
    payload
  );
  return response.data;
}

export async function getProjectFinancials(projectId: string): Promise<ProjectFinancialsResponse> {
  const response = await apiClient.get<ProjectFinancialsResponse>(`/projects/${projectId}/payments`);
  return response.data;
}

export async function createRefund(
  paymentId: string,
  payload: { amountMinor?: number; reason: string }
): Promise<{ message: string; refund: RefundRecord; payment: PaymentRecord }> {
  const response = await apiClient.post<{ message: string; refund: RefundRecord; payment: PaymentRecord }>(
    `/payments/${paymentId}/refunds`,
    payload
  );
  return response.data;
}

export async function getPaymentRefunds(paymentId: string): Promise<{ refunds: RefundRecord[] }> {
  const response = await apiClient.get<{ refunds: RefundRecord[] }>(`/payments/${paymentId}/refunds`);
  return response.data;
}

export async function reconcilePayment(paymentId: string): Promise<{
  message: string;
  payment: PaymentRecord;
  ledgerSummary: any;
}> {
  const response = await apiClient.post<{
    message: string;
    payment: PaymentRecord;
    ledgerSummary: any;
  }>('/payments/reconcile', { paymentId });
  return response.data;
}



