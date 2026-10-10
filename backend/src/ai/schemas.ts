import { z } from 'zod';

export const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
  message: 'Color must be a valid 3 or 6 digit hex code starting with #'
});

// 1. Structured Campaign Brief Schema
export const generatedDeliverableSchema = z.object({
  name: z.string().min(1, 'Deliverable name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  format: z.string().min(1, 'Format is required (e.g. 4K MP4, RAW PNG, Vector SVG)'),
  dimensionsOrRatio: z.string().optional(),
  requiredElements: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([])
});

export const generatedBriefSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  title: z.string().min(3, 'Campaign title must be at least 3 characters').max(150),
  summary: z.string().max(300),
  objective: z.string().min(1, 'Objective is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  coreMessage: z.string().min(1, 'Core message is required'),
  creativeApproach: z.string().min(1, 'Creative approach is required'),
  requiredSpecialties: z.array(z.string()).min(1, 'At least one specialty is required'),
  suggestedTools: z.array(z.string()).default([]),
  deliverables: z.array(generatedDeliverableSchema).min(1, 'At least one deliverable is required'),
  acceptanceCriteria: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  budgetSuggestion: z
    .object({
      minBudget: z.number().nonnegative().optional(),
      maxBudget: z.number().nonnegative().optional(),
      currency: z.string().default('USD'),
      reasoning: z.string()
    })
    .nullable()
    .optional(),
  timelineSuggestion: z
    .object({
      estimatedWeeks: z.number().int().min(1).max(52).optional(),
      keyPhases: z.array(z.string()).default([]),
      reasoning: z.string()
    })
    .nullable()
    .optional(),
  missingInformation: z.array(z.string()).default([]),
  clarificationQuestions: z.array(z.string()).default([])
});

// 2. Creative Directions Schema
export const creativeDirectionSchema = z.object({
  directionName: z.string().min(2, 'Direction name is required'),
  creativeConcept: z.string().min(5, 'Concept description is required'),
  moodAndTone: z.array(z.string()).min(1, 'At least one mood tag is required'),
  visualStyle: z.string().min(3, 'Visual style is required'),
  colorPalette: z
    .array(
      z.object({
        name: z.string().min(1),
        hex: hexColorSchema
      })
    )
    .min(2, 'At least 2 colors required in palette')
    .max(8),
  lightingAndComposition: z.string().min(3, 'Lighting guidance is required'),
  typographyGuidance: z.string().default('Clean modern sans-serif hierarchy'),
  motionOrCameraDirection: z.string().default('Dynamic pacing with smooth stabilized camera movement'),
  recommendedDeliverables: z.array(z.string()).default([]),
  strengthsAndTradeoffs: z.object({
    strengths: z.array(z.string()).min(1),
    tradeoffs: z.array(z.string()).min(1)
  }),
  productionConsiderations: z.array(z.string()).default([]),
  accessibilityConsiderations: z.string().optional()
});

export const creativeDirectionsResponseSchema = z.object({
  directions: z.array(creativeDirectionSchema).min(2, 'Must generate at least 2 distinct directions').max(4)
});

// 3. Moodboard Analysis Schema
export const moodboardAnalysisSchema = z.object({
  dominantColors: z
    .array(
      z.object({
        name: z.string(),
        hex: hexColorSchema,
        weight: z.string().optional()
      })
    )
    .min(1),
  approximatePalette: z
    .array(
      z.object({
        name: z.string(),
        hex: hexColorSchema
      })
    )
    .min(1),
  lightingCharacteristics: z.string().min(1),
  compositionAndFraming: z.string().min(1),
  visualTone: z.string().min(1),
  textureAndMaterialCues: z.array(z.string()).default([]),
  typographyObservations: z.string().default('N/A or not prominent'),
  recurringPatterns: z.array(z.string()).default([]),
  likelyThemes: z.array(z.string()).default([]),
  productionConsiderations: z.array(z.string()).default([]),
  questionsOrAmbiguities: z.array(z.string()).default([])
});

// 4. Requirement Synthesis Schema
export const synthesizedDeliverableSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  format: z.string().min(1),
  dimensionsOrRatio: z.string().optional(),
  requiredContent: z.string().min(1),
  requiredElements: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  revisionExpectations: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  productionConsiderations: z.string().optional(),
  milestoneGrouping: z.string().optional()
});

export const requirementSynthesisSchema = z.object({
  deliverables: z.array(synthesizedDeliverableSchema).min(1),
  suggestedMilestones: z
    .array(
      z.object({
        phaseName: z.string(),
        estimatedDurationWeeks: z.number().positive(),
        deliverableNames: z.array(z.string()),
        keyMilestoneDeliverable: z.string()
      })
    )
    .default([]),
  clarificationQuestions: z.array(z.string()).default([])
});

// 5. AI Draft Improvement Schema
export const draftImprovementSchema = z.object({
  originalField: z.string(),
  suggestedImprovement: z.string().min(1),
  rationale: z.string().min(1),
  changesSummary: z.string().min(1),
  consistencyCheck: z.object({
    isConsistent: z.boolean(),
    issuesFound: z.array(z.string()).default([])
  })
});

// Client Input Schemas for AI endpoints
export const generateBriefInputSchema = z.object({
  userPrompt: z.string().min(10, 'Prompt must be at least 10 characters').max(4000),
  category: z.string().optional(),
  knownBudgetMin: z.number().nonnegative().optional(),
  knownBudgetMax: z.number().nonnegative().optional(),
  currency: z.string().max(5).optional(),
  timelineWeeks: z.number().int().min(1).max(52).optional(),
  locationPreference: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  existingBriefId: z.string().optional()
});

export const generateDirectionsInputSchema = z.object({
  briefTitle: z.string().min(3),
  objective: z.string().min(5),
  creativeApproach: z.string().optional(),
  targetAudience: z.string().optional(),
  count: z.number().int().min(2).max(4).default(3)
});

export const analyzeMoodboardInputSchema = z.object({
  imageUrls: z.array(z.string()).min(1, 'At least 1 image URL is required').max(8, 'Maximum 8 moodboard images allowed'),
  contextNotes: z.string().max(1000).optional()
});

export const synthesizeRequirementsInputSchema = z.object({
  briefTitle: z.string().min(3),
  summary: z.string().optional(),
  creativeApproach: z.string().optional(),
  deliverableHints: z.array(z.string()).default([])
});

export const improveDraftInputSchema = z.object({
  fieldName: z.enum([
    'title',
    'summary',
    'objective',
    'targetAudience',
    'coreMessage',
    'creativeApproach',
    'deliverables',
    'acceptanceCriteria',
    'entireBrief'
  ]),
  currentContent: z.string().min(1, 'Current content cannot be empty').max(5000),
  improvementGoal: z.enum([
    'improve_clarity',
    'rewrite_professionally',
    'shorten',
    'expand_rationale',
    'increase_specificity',
    'check_consistency'
  ]),
  campaignContext: z.record(z.any()).optional()
});

export type GeneratedDeliverable = z.infer<typeof generatedDeliverableSchema>;
export type GeneratedBrief = z.infer<typeof generatedBriefSchema>;
export type CreativeDirection = z.infer<typeof creativeDirectionSchema>;
export type MoodboardAnalysis = z.infer<typeof moodboardAnalysisSchema>;
export type SynthesizedDeliverable = z.infer<typeof synthesizedDeliverableSchema>;
export type RequirementSynthesis = z.infer<typeof requirementSynthesisSchema>;
export type DraftImprovement = z.infer<typeof draftImprovementSchema>;
