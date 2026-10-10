import { z } from 'zod';
import { aiService } from './aiService.js';

export const parsedSearchIntentSchema = z.object({
  interpretedQuery: z.string(),
  category: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  creativeTools: z.array(z.string()).default([]),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  currency: z.string().default('USD'),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  availability: z.enum(['available', 'limited', 'busy']).optional(),
  extractedKeywords: z.array(z.string()).default([])
});

export type ParsedSearchIntent = z.infer<typeof parsedSearchIntentSchema>;

const KNOWN_TOOLS = [
  'Blender',
  'Cinema 4D',
  'Unreal Engine',
  'Maya',
  'Houdini',
  'After Effects',
  'Premiere Pro',
  'Midjourney',
  'Stable Diffusion',
  'Runway Gen-2',
  'ComfyUI',
  'Figma',
  'Photoshop',
  'Illustrator',
  'ZBrush',
  'Substance Painter'
];

const KNOWN_CATEGORIES = [
  '3D Animation & Motion',
  'AI Art & Concept Direction',
  'Video Production & Direction',
  'Motion Graphics & VFX',
  'Brand Identity & Design',
  'Audio & Sound Design'
];

export class AISearchIntentService {
  /**
   * Parses natural language search queries into structured filter parameters.
   */
  async parseSearchIntent(userQuery: string): Promise<ParsedSearchIntent> {
    if (!userQuery || !userQuery.trim()) {
      return {
        interpretedQuery: '',
        specialties: [],
        creativeTools: [],
        currency: 'USD',
        extractedKeywords: []
      };
    }

    const trimmed = userQuery.trim();

    // 1. Try AI-powered parsing if configured
    if (aiService.isConfigured() && aiService.getProvider()) {
      try {
        const prompt = `Analyze this search query for a digital creator marketplace and extract structured search criteria.
Query: "${trimmed}"

Extract:
- category: Closest matching category from: ${KNOWN_CATEGORIES.join(', ')}
- specialties: Array of matching creative skills/specialties
- creativeTools: Array of creative software/AI tools mentioned (e.g. ${KNOWN_TOOLS.join(', ')})
- minPrice / maxPrice: numeric budget if stated (e.g. "under $3000" -> maxPrice: 3000)
- currency: ISO 3-letter currency code (default USD)
- experienceLevel: beginner, intermediate, advanced, expert (if stated)
- availability: available, limited, busy (if stated)
- interpretedQuery: A clean, concise search keyword query`;

        const result = await aiService.getProvider()!.generateStructured<ParsedSearchIntent>(
          prompt,
          parsedSearchIntentSchema,
          'You are a search intent parser for a creator marketplace. Extract structured search criteria.'
        );

        if (result.data) {
          return result.data;
        }
      } catch (err) {
        // Fallback gracefully to deterministic parser
      }
    }

    // 2. Deterministic Regex / Heuristic Fallback
    return this.deterministicParse(trimmed);
  }

  private deterministicParse(query: string): ParsedSearchIntent {
    const qLower = query.toLowerCase();

    // Extract Tools
    const detectedTools: string[] = [];
    for (const tool of KNOWN_TOOLS) {
      if (qLower.includes(tool.toLowerCase())) {
        detectedTools.push(tool);
      }
    }

    // Extract Category
    let detectedCategory: string | undefined;
    for (const cat of KNOWN_CATEGORIES) {
      if (qLower.includes(cat.toLowerCase()) || cat.toLowerCase().split(' ').some((w) => w.length > 3 && qLower.includes(w))) {
        detectedCategory = cat;
        break;
      }
    }

    // Extract Max Price (e.g. "under $5000", "< 3000", "budget 2500")
    let maxPrice: number | undefined;
    const priceMatch = query.match(/(?:under|below|max|budget|up to|<|\$)\s*\$?\s*([0-9]+(?:,[0-9]{3})*|\d+)(k)?/i);
    if (priceMatch && priceMatch[1]) {
      let num = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (priceMatch[2] && priceMatch[2].toLowerCase() === 'k') {
        num *= 1000;
      }
      if (!isNaN(num) && num > 0) {
        maxPrice = num;
      }
    }

    // Extract Currency
    let currency = 'USD';
    if (qLower.includes('eur') || query.includes('€')) currency = 'EUR';
    if (qLower.includes('gbp') || query.includes('£')) currency = 'GBP';
    if (qLower.includes('inr') || query.includes('₹')) currency = 'INR';

    // Extract Experience Level
    let experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | undefined;
    if (qLower.includes('expert') || qLower.includes('lead')) experienceLevel = 'expert';
    else if (qLower.includes('senior') || qLower.includes('advanced')) experienceLevel = 'advanced';
    else if (qLower.includes('mid') || qLower.includes('intermediate')) experienceLevel = 'intermediate';
    else if (qLower.includes('junior') || qLower.includes('entry') || qLower.includes('beginner')) experienceLevel = 'beginner';

    return {
      interpretedQuery: query,
      category: detectedCategory,
      specialties: detectedCategory ? [detectedCategory] : [],
      creativeTools: detectedTools,
      maxPrice,
      currency,
      experienceLevel,
      extractedKeywords: query.split(/\s+/).filter((w) => w.length > 2)
    };
  }
}

export const aiSearchIntentService = new AISearchIntentService();
