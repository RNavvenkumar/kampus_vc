import { z } from 'zod';

export interface AIUsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
  latencyMs?: number;
}

export interface AIProviderResult<T> {
  data: T;
  rawText?: string;
  usage: AIUsageMetrics;
}

export interface IAIProvider {
  readonly name: string;
  readonly textModel: string;
  readonly visionModel: string;
  isAvailable(): boolean;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>>;
  generateText(
    prompt: string,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<{ text: string; usage: AIUsageMetrics }>;
  analyzeImages<T>(
    imageUrls: string[],
    prompt: string,
    schema: z.ZodType<T, any, any>,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>>;
}
