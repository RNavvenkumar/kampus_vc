import { env } from '../config/env.js';
import { IAIProvider, AIUsageMetrics } from '../ai/providerInterface.js';
import { GeminiProvider } from '../ai/geminiProvider.js';
import { MockAIProvider } from '../ai/mockProvider.js';
import {
  generatedBriefSchema,
  GeneratedBrief,
  creativeDirectionsResponseSchema,
  CreativeDirection,
  moodboardAnalysisSchema,
  MoodboardAnalysis,
  requirementSynthesisSchema,
  RequirementSynthesis,
  draftImprovementSchema,
  DraftImprovement,
  generateBriefInputSchema,
  generateDirectionsInputSchema,
  analyzeMoodboardInputSchema,
  synthesizeRequirementsInputSchema,
  improveDraftInputSchema
} from '../ai/schemas.js';
import { validatePublicHttpsUrl } from '../utils/ssrfGuard.js';

interface UserUsageRecord {
  count: number;
  resetAt: number;
}

export class AIService {
  private provider: IAIProvider | null = null;
  private userUsageMap = new Map<string, UserUsageRecord>();
  private readonly dailyLimit: number;

  constructor() {
    this.dailyLimit = env.AI_DAILY_USER_LIMIT || 50;
    this.initializeProvider();
  }

  private initializeProvider() {
    if (env.AI_PROVIDER === 'mock' || env.NODE_ENV === 'test') {
      this.provider = new MockAIProvider();
    } else if (env.AI_PROVIDER === 'gemini' && env.AI_API_KEY) {
      this.provider = new GeminiProvider({
        apiKey: env.AI_API_KEY,
        textModel: env.AI_TEXT_MODEL,
        visionModel: env.AI_VISION_MODEL,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
        maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS
      });
    } else if (env.AI_API_KEY) {
      // Auto-enable Gemini if key is provided
      this.provider = new GeminiProvider({
        apiKey: env.AI_API_KEY,
        textModel: env.AI_TEXT_MODEL,
        visionModel: env.AI_VISION_MODEL,
        timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
        maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS
      });
    } else {
      // Seamless fallback provider so AI Studio is fully functional out-of-the-box
      this.provider = new MockAIProvider();
    }
  }

  private getEffectiveProvider(): IAIProvider {
    if (this.provider && this.provider.isAvailable()) {
      return this.provider;
    }
    return new MockAIProvider();
  }

  // Allow setting a mock provider explicitly in tests
  public setProvider(provider: IAIProvider | null) {
    this.provider = provider;
  }

  public isConfigured(): boolean {
    return this.provider !== null && this.provider.isAvailable();
  }

  public getProvider(): IAIProvider | null {
    return this.provider;
  }

  public getProviderStatus() {
    return {
      isConfigured: this.isConfigured(),
      provider: this.provider?.name || 'none',
      textModel: this.provider?.textModel || 'none',
      visionModel: this.provider?.visionModel || 'none',
      dailyLimit: this.dailyLimit
    };
  }

  private checkAndIncrementUserQuota(userId: string) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let record = this.userUsageMap.get(userId);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + oneDayMs };
      this.userUsageMap.set(userId, record);
      return;
    }

    if (record.count >= this.dailyLimit) {
      throw new Error(`AI_QUOTA_EXCEEDED: You have reached your daily limit of ${this.dailyLimit} AI generation requests. Please try again tomorrow.`);
    }

    record.count += 1;
  }

  // 1. Generate Structured Campaign Brief
  async generateBrief(
    userId: string,
    rawInput: unknown
  ): Promise<{ brief: GeneratedBrief; usage: AIUsageMetrics }> {
    const input = generateBriefInputSchema.parse(rawInput);
    const provider = this.getEffectiveProvider();
    this.checkAndIncrementUserQuota(userId);

    const systemPrompt = `You are a world-class creative strategist and campaign producer for Kampus.VC.
Transform the brand's raw campaign vision into a rigorous, production-grade creative brief.
RULES:
1. Output MUST be valid JSON strictly matching the provided schema.
2. DO NOT hallucinate fake confirmed budgets or unrealistic deadlines if not provided. If unknown, use null or explicit estimates in suggestions.
3. Be specific regarding deliverable quantities, technical formats (e.g. 4K ProRes, 9:16 vertical MP4), and acceptance criteria.
4. If crucial info is missing, populate missingInformation and clarificationQuestions.`;

    const userPrompt = `Campaign Description:
"${input.userPrompt}"

Category: ${input.category || 'General Creative'}
Known Budget: ${input.knownBudgetMin && input.knownBudgetMax ? `${input.currency || 'USD'} ${input.knownBudgetMin} - ${input.knownBudgetMax}` : 'Not specified'}
Timeline: ${input.timelineWeeks ? `${input.timelineWeeks} weeks` : 'Not specified'}
Location Preference: ${input.locationPreference || 'remote'}

Generate a complete, structured JSON creative brief following the schema.`;

    const result = await provider.generateStructured(
      userPrompt,
      generatedBriefSchema,
      systemPrompt
    );

    return {
      brief: result.data,
      usage: result.usage
    };
  }

  // 2. Generate Alternative Creative Directions
  async generateDirections(
    userId: string,
    rawInput: unknown
  ): Promise<{ directions: CreativeDirection[]; usage: AIUsageMetrics }> {
    const input = generateDirectionsInputSchema.parse(rawInput);
    const provider = this.getEffectiveProvider();
    this.checkAndIncrementUserQuota(userId);

    const count = input.count || 3;
    const systemPrompt = `You are a visionary Creative Director.
Generate ${count} distinctly different, compelling creative directions for the campaign brief.
RULES:
1. Each direction must have a unique aesthetic, color palette (with valid hex codes like #58D5FF), mood, camera/motion style, and rationale.
2. Directions MUST be meaningfully distinct (e.g., Cyberpunk vs Editorial Minimalism vs Organic Handcrafted), not merely reworded.
3. Output MUST be valid JSON with a "directions" array matching the schema.`;

    const userPrompt = `Campaign Title: "${input.briefTitle}"
Objective: "${input.objective}"
Target Audience: "${input.targetAudience || 'General Audience'}"
Creative Approach Idea: "${input.creativeApproach || 'Open to director interpretation'}"

Generate exactly ${count} distinct creative directions with specific hex color palettes, lighting rules, motion guidance, and tradeoffs.`;

    const result = await provider.generateStructured(
      userPrompt,
      creativeDirectionsResponseSchema,
      systemPrompt
    );

    return {
      directions: result.data.directions,
      usage: result.usage
    };
  }

  // 3. Moodboard Intelligence
  async analyzeMoodboard(
    userId: string,
    rawInput: unknown
  ): Promise<{ analysis: MoodboardAnalysis; usage: AIUsageMetrics }> {
    const input = analyzeMoodboardInputSchema.parse(rawInput);
    const provider = this.getEffectiveProvider();

    // Validate each URL with strict SSRF guard
    for (const url of input.imageUrls) {
      const check = validatePublicHttpsUrl(url);
      if (!check.valid) {
        throw new Error(`SSRF_SECURITY_VIOLATION: Image URL "${url}" is invalid. ${check.error}`);
      }
    }

    this.checkAndIncrementUserQuota(userId);

    const systemPrompt = `You are an expert visual director and colorist.
Analyze the provided moodboard reference image URLs.
Extract dominant hex color swatches, lighting dynamics, composition patterns, visual tone, material cues, and production considerations.
RULES:
1. Distinguish clear visual cues from subjective interpretations.
2. Color hex codes MUST be valid 6-digit or 3-digit hex strings (e.g. #58D5FF).
3. Output valid JSON matching the moodboard schema.`;

    const userPrompt = `Context Notes: ${input.contextNotes || 'Moodboard references for new campaign'}`;

    const result = await provider.analyzeImages(
      input.imageUrls,
      userPrompt,
      moodboardAnalysisSchema,
      systemPrompt
    );

    return {
      analysis: result.data,
      usage: result.usage
    };
  }

  // 4. Requirement Synthesis
  async synthesizeRequirements(
    userId: string,
    rawInput: unknown
  ): Promise<{ synthesis: RequirementSynthesis; usage: AIUsageMetrics }> {
    const input = synthesizeRequirementsInputSchema.parse(rawInput);
    const provider = this.getEffectiveProvider();
    this.checkAndIncrementUserQuota(userId);

    const systemPrompt = `You are a senior technical creative producer.
Translate high-level creative ideas into granular, actionable production deliverables, technical specifications, acceptance criteria, and milestone groupings.
Output valid JSON matching the requirementSynthesis schema.`;

    const userPrompt = `Brief Title: "${input.briefTitle}"
Summary: "${input.summary || ''}"
Creative Approach: "${input.creativeApproach || ''}"
Deliverable Hints: ${input.deliverableHints.join(', ') || 'Standard multi-platform package'}

Generate structured deliverables and production milestone breakdown.`;

    const result = await provider.generateStructured(
      userPrompt,
      requirementSynthesisSchema,
      systemPrompt
    );

    return {
      synthesis: result.data,
      usage: result.usage
    };
  }

  // 5. AI Draft Field Improvement
  async improveDraft(
    userId: string,
    rawInput: unknown
  ): Promise<{ improvement: DraftImprovement; usage: AIUsageMetrics }> {
    const input = improveDraftInputSchema.parse(rawInput);
    const provider = this.getEffectiveProvider();
    this.checkAndIncrementUserQuota(userId);

    const systemPrompt = `You are an elite creative editor.
Refine the provided campaign draft field according to the specified improvement goal.
Preserve all explicit user constraints, numbers, and brand facts.
Output valid JSON matching the draftImprovement schema with originalField, suggestedImprovement, rationale, changesSummary, and consistencyCheck.`;

    const userPrompt = `Field: "${input.fieldName}"
Goal: "${input.improvementGoal}"
Current Content:
"${input.currentContent}"

Campaign Context: ${JSON.stringify(input.campaignContext || {})}

Provide the refined text with explicit rationale and consistency verification.`;

    const result = await provider.generateStructured(
      userPrompt,
      draftImprovementSchema,
      systemPrompt
    );

    return {
      improvement: result.data,
      usage: result.usage
    };
  }
}

export const aiService = new AIService();
