import { z } from 'zod';
import { IAIProvider, AIProviderResult, AIUsageMetrics } from './providerInterface.js';

export class MockAIProvider implements IAIProvider {
  readonly name = 'mock';
  readonly textModel = 'mock-text-v1';
  readonly visionModel = 'mock-vision-v1';

  private shouldFail = false;
  private failureReason = 'Simulated AI provider error';
  private shouldTimeout = false;
  private customMockData: any = null;

  isAvailable(): boolean {
    return true;
  }

  setMockFailure(fail: boolean, reason?: string) {
    this.shouldFail = fail;
    if (reason) this.failureReason = reason;
  }

  setMockTimeout(timeout: boolean) {
    this.shouldTimeout = timeout;
  }

  setCustomMockData(data: any) {
    this.customMockData = data;
  }

  reset() {
    this.shouldFail = false;
    this.failureReason = 'Simulated AI provider error';
    this.shouldTimeout = false;
    this.customMockData = null;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    _systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>> {
    if (this.shouldTimeout) {
      throw new Error(`AI_TIMEOUT: Generation request timed out after ${timeoutMs || 30000}ms.`);
    }

    if (this.shouldFail) {
      throw new Error(`AI_PROVIDER_ERROR: ${this.failureReason}`);
    }

    if (this.customMockData) {
      const parsed = schema.safeParse(this.customMockData);
      if (!parsed.success) {
        throw new Error(`AI_SCHEMA_VALIDATION_FAILED: ${parsed.error.message}`);
      }
      return {
        data: parsed.data,
        rawText: JSON.stringify(parsed.data),
        usage: { promptTokens: 120, completionTokens: 450, totalTokens: 570, model: this.textModel, provider: this.name, latencyMs: 25 }
      };
    }

    // Default mock data generation based on prompt contents
    let mockResult: any;

    if (prompt.includes('creative directions') || prompt.includes('Creative Directions')) {
      const directions = {
        directions: [
          {
            directionName: 'Kinetic Neon Cyberpunk',
            creativeConcept: 'High-contrast futuristic aesthetic with luminous cyan and magenta neon gradients, volumetric fog, and rapid glitch transitions.',
            moodAndTone: ['Futuristic', 'High-Energy', 'Edgy', 'Technological'],
            visualStyle: 'Cybernetic synthwave with holographic HUD elements',
            colorPalette: [
              { name: 'Neon Cyan', hex: '#58D5FF' },
              { name: 'Deep Carbon', hex: '#0B0F17' },
              { name: 'Laser Magenta', hex: '#E026FE' },
              { name: 'Electric Violet', hex: '#8B5CF6' }
            ],
            lightingAndComposition: 'Low-key studio lighting with harsh anamorphic cyan rim light and central dynamic perspective.',
            typographyGuidance: 'Monospaced geometric headers with ultra-clean modern body type',
            motionOrCameraDirection: 'Rapid 3D whip pans, speed ramps, and stylized optical zooms',
            recommendedDeliverables: ['30s 4K Kinetic 3D Video', 'Social Teaser Clips (9:16)', 'Animated Key Visuals'],
            strengthsAndTradeoffs: {
              strengths: ['Immediate viral visual impact', 'Strong resonance with Gen Z and tech audiences'],
              tradeoffs: ['Requires specialized 3D & VFX pipeline', 'Higher render complexity']
            },
            productionConsiderations: ['Use GPU-accelerated Unreal Engine 5 or Blender rendering', 'Ensure high-bitrate output for gradient fidelity']
          },
          {
            directionName: 'Architectural Editorial Minimalism',
            creativeConcept: 'Sculptural, calm, and ultra-refined visual narrative focusing on tactile materials, natural light, and brutalist geometric elegance.',
            moodAndTone: ['Sophisticated', 'Serene', 'Tactile', 'Premium'],
            visualStyle: 'Modernist gallery aesthetic with soft shadows and balanced proportions',
            colorPalette: [
              { name: 'Pure Charcoal', hex: '#12141A' },
              { name: 'Warm Alabaster', hex: '#F3EFE6' },
              { name: 'Subtle Sage', hex: '#94A3B8' },
              { name: 'Champagne Gold', hex: '#D4AF37' }
            ],
            lightingAndComposition: 'Diffused golden hour window illumination with rule-of-thirds negative space framing.',
            typographyGuidance: 'High-contrast editorial serif headers paired with subtle grotesque body font',
            motionOrCameraDirection: 'Slow steady motorized gimbal tracking shots and deliberate macro focus pulls',
            recommendedDeliverables: ['60s Cinematic Brand Film', 'High-Res Hero Still Catalog', 'Editorial Carousel Assets'],
            strengthsAndTradeoffs: {
              strengths: ['Timeless luxury perception', 'Broad executive and high-income appeal'],
              tradeoffs: ['Lower raw kinetic energy', 'Demands pristine set design and lighting craft']
            },
            productionConsiderations: ['Shoot on large-format digital sensors or high-res 8K AI texture synthesis']
          }
        ]
      };
      mockResult = directions;
    } else if (
      prompt.includes('synthesize deliverables') ||
      prompt.includes('requirements') ||
      prompt.includes('deliverables and production milestone')
    ) {
      const requirements = {
        deliverables: [
          {
            name: 'Hero 3D Cinematic Commercial',
            quantity: 1,
            format: 'ProRes 422 HQ 4K (3840x2160) & H.264 Master',
            dimensionsOrRatio: '16:9 Landscape',
            requiredContent: '30-second main campaign video showcasing product features and narrative.',
            requiredElements: ['Brand 3D logo sting', 'Animated typography lower thirds', 'Master audio mix with SFX'],
            acceptanceCriteria: ['Zero compression artifacts in dark areas', 'Synchronized subtitle tracks in SRT format'],
            dependencies: ['Final storyboard approval', 'Brand color token signoff'],
            milestoneGrouping: 'Phase 2: Final Production'
          },
          {
            name: 'Vertical Social Cutdowns',
            quantity: 3,
            format: 'MP4 (1080x1920) 60fps',
            dimensionsOrRatio: '9:16 Vertical',
            requiredContent: '15-second high-energy hooks optimized for TikTok and Instagram Reels.',
            requiredElements: ['High-impact first 3 seconds hook', 'Native vertical UI captions'],
            acceptanceCriteria: ['Safe-zone adherence for UI overlays', 'Punchy sound-design on transition cues'],
            dependencies: ['Hero Commercial footage locked'],
            milestoneGrouping: 'Phase 3: Social Localization'
          }
        ],
        suggestedMilestones: [
          {
            phaseName: 'Concept & Styleframes',
            estimatedDurationWeeks: 1,
            deliverableNames: ['Moodboard & Visual Direction Deck', '3D Styleframes'],
            keyMilestoneDeliverable: 'Approved Styleframe Package'
          },
          {
            phaseName: 'Production & Video Mastery',
            estimatedDurationWeeks: 2,
            deliverableNames: ['Hero 3D Cinematic Commercial'],
            keyMilestoneDeliverable: 'Rough Cut and Final Master Delivery'
          },
          {
            phaseName: 'Social Formats & Hand-off',
            estimatedDurationWeeks: 1,
            deliverableNames: ['Vertical Social Cutdowns'],
            keyMilestoneDeliverable: 'Complete Multi-Platform Asset Package'
          }
        ],
        clarificationQuestions: []
      };
      mockResult = requirements;
    } else if (prompt.includes('improve') || prompt.includes('rewrite') || prompt.includes('refine')) {
      const improvement = {
        originalField: 'summary',
        suggestedImprovement: 'Elevate your visual storytelling with an AI-directed 3D campaign that blends kinetic neon styling with hyper-realistic product rendering.',
        rationale: 'Enhanced executive clarity, highlighted specific production techniques, and tightened audience hook.',
        changesSummary: 'Refined prose, added specific technical mediums, and enhanced brand tone.',
        consistencyCheck: {
          isConsistent: true,
          issuesFound: []
        }
      };
      mockResult = improvement;
    } else {
      // Default: Structured brief
      const brief = {
        schemaVersion: '1.0',
        title: 'Next-Gen AI Visual Brand Campaign',
        summary: 'A cutting-edge multi-platform campaign combining 3D product simulation, kinetic motion graphics, and cinematic storytelling.',
        objective: 'Position the brand as the premier AI-first innovator in digital lifestyle and design.',
        targetAudience: 'Tech-forward creators, design leaders, and young urban professionals aged 22–38.',
        coreMessage: 'Creativity without limits: Powered by intelligence and precision.',
        creativeApproach: 'Blend high-fidelity generative visual textures with tactile 3D product renders and crisp cybernetic typography.',
        requiredSpecialties: ['3D Animation', 'Motion Graphics', 'AI Art Direction', 'Sound Design'],
        suggestedTools: ['Blender', 'Cinema 4D', 'Midjourney', 'After Effects', 'Unreal Engine 5'],
        deliverables: [
          {
            name: 'Hero 30s Brand Anthem',
            quantity: 1,
            format: '4K MP4 / ProRes',
            dimensionsOrRatio: '16:9 Landscape',
            requiredElements: ['High-energy pacing', 'Original SFX track', 'Logo end-card'],
            acceptanceCriteria: ['Passes brand compliance check', '4K resolution at 60fps']
          },
          {
            name: 'Vertical Social Cutdowns',
            quantity: 3,
            format: '1080x1920 MP4',
            dimensionsOrRatio: '9:16 Vertical',
            requiredElements: ['Fast hook', 'Animated captions'],
            acceptanceCriteria: ['Optimized for mobile platforms']
          }
        ],
        acceptanceCriteria: [
          'All assets delivered in lossless formats with source project files',
          'Full commercial usage rights and clearances provided',
          'Adheres to established brand color tokens'
        ],
        constraints: [
          'Must stay within established brand hex color guidelines',
          'Audio must use royalty-free or bespoke licensed stems'
        ],
        exclusions: ['No stock template footage or uncurated artifact-heavy generations'],
        budgetSuggestion: {
          minBudget: 25000,
          maxBudget: 60000,
          currency: 'INR',
          reasoning: 'Reflects professional 3D motion design, bespoke audio mixing, and multi-format delivery over 3–4 weeks.'
        },
        timelineSuggestion: {
          estimatedWeeks: 4,
          keyPhases: ['Discovery & Styleframes', '3D Scene Assembly & Motion', 'Audio Design & Final Color Grade'],
          reasoning: 'Standard production pipeline allowing 1 week for creative review and feedback iteration.'
        },
        missingInformation: [],
        clarificationQuestions: []
      };
      mockResult = brief;
    }

    const validation = schema.safeParse(mockResult);
    if (!validation.success) {
      throw new Error(`AI_SCHEMA_VALIDATION_FAILED: ${validation.error.message}`);
    }

    return {
      data: validation.data,
      rawText: JSON.stringify(validation.data),
      usage: { promptTokens: 150, completionTokens: 500, totalTokens: 650, model: this.textModel, provider: this.name, latencyMs: 30 }
    };
  }

  async generateText(
    _prompt: string,
    _systemInstruction?: string,
    timeoutMs?: number
  ): Promise<{ text: string; usage: AIUsageMetrics }> {
    if (this.shouldTimeout) {
      throw new Error(`AI_TIMEOUT: Generation request timed out after ${timeoutMs || 30000}ms.`);
    }

    if (this.shouldFail) {
      throw new Error(`AI_PROVIDER_ERROR: ${this.failureReason}`);
    }

    return {
      text: 'Mock generated text response for campaign creative guidance.',
      usage: { promptTokens: 50, completionTokens: 80, totalTokens: 130, model: this.textModel, provider: this.name, latencyMs: 15 }
    };
  }

  async analyzeImages<T>(
    imageUrls: string[],
    _prompt: string,
    schema: z.ZodType<T, any, any>,
    _systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>> {
    if (this.shouldTimeout) {
      throw new Error(`AI_TIMEOUT: Vision request timed out after ${timeoutMs || 30000}ms.`);
    }

    if (this.shouldFail) {
      throw new Error(`AI_VISION_ERROR: ${this.failureReason}`);
    }

    const analysis = {
      dominantColors: [
        { name: 'Midnight Cyan', hex: '#58D5FF', weight: '45%' },
        { name: 'Deep Onyx', hex: '#0B0F17', weight: '35%' },
        { name: 'Electric Violet', hex: '#8B5CF6', weight: '20%' }
      ],
      approximatePalette: [
        { name: 'Cyber Cyan', hex: '#58D5FF' },
        { name: 'Obsidian Black', hex: '#0B0F17' },
        { name: 'Pure White', hex: '#FFFFFF' },
        { name: 'Neon Purple', hex: '#A855F7' }
      ],
      lightingCharacteristics: 'High-contrast directional lighting with dramatic neon rim reflections and volumetric haze.',
      compositionAndFraming: 'Centered hero subject with dynamic angular geometric framing and generous negative space.',
      visualTone: 'Avant-garde, sophisticated, high-tech, and atmospheric.',
      textureAndMaterialCues: ['Matte anodized aluminum', 'Reflective chrome', 'Iridescent glass surfaces', 'Fine grain film noise'],
      typographyObservations: 'Clean architectural sans-serif with wide tracking and subtle metadata badges.',
      recurringPatterns: ['Grid overlays', 'Prismatic light dispersion', 'Floating geometric forms'],
      likelyThemes: ['Future tech', 'Luxury digital hardware', 'Next-gen creative tooling'],
      productionConsiderations: ['Requires precision specular highlight control in 3D scene lighting', 'Utilize 32-bit floating point EXR render passes'],
      questionsOrAmbiguities: ['Are the iridescent glass elements required for all deliverable variants?']
    };

    const validation = schema.safeParse(analysis);
    if (!validation.success) {
      throw new Error(`AI_SCHEMA_VALIDATION_FAILED: ${validation.error.message}`);
    }

    return {
      data: validation.data,
      rawText: JSON.stringify(validation.data),
      usage: { promptTokens: 300, completionTokens: 400, totalTokens: 700, model: this.visionModel, provider: this.name, latencyMs: 40 }
    };
  }
}
