import { z } from 'zod';
import { IAIProvider, AIProviderResult, AIUsageMetrics } from './providerInterface';

export class GeminiProvider implements IAIProvider {
  public readonly name = 'gemini';
  public readonly textModel: string;
  public readonly visionModel: string;
  private readonly apiKey?: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputTokens: number;

  constructor(options: {
    apiKey?: string;
    textModel?: string;
    visionModel?: string;
    timeoutMs?: number;
    maxOutputTokens?: number;
  }) {
    this.apiKey = options.apiKey;
    this.textModel = options.textModel || 'gemini-1.5-flash';
    this.visionModel = options.visionModel || 'gemini-1.5-flash';
    this.defaultTimeoutMs = options.timeoutMs || 30000;
    this.maxOutputTokens = options.maxOutputTokens || 4096;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>> {
    if (!this.isAvailable()) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: Gemini API key is not configured.');
    }

    const startTime = Date.now();
    const timeout = timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${this.apiKey}`;

    const requestBody: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: this.maxOutputTokens,
        temperature: 0.7
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 429) {
          throw new Error('AI_RATE_LIMIT: Provider rate limit exceeded. Please try again shortly.');
        }
        throw new Error(`AI_PROVIDER_ERROR: Gemini returned status ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('AI_EMPTY_RESPONSE: No content was returned by the AI provider.');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (err: any) {
        throw new Error(`AI_INVALID_JSON: Failed to parse AI JSON response: ${err.message}`);
      }

      const validation = schema.safeParse(parsedJson);
      if (!validation.success) {
        throw new Error(`AI_SCHEMA_VALIDATION_FAILED: ${validation.error.message}`);
      }

      const latencyMs = Date.now() - startTime;
      const usageMetadata = json.usageMetadata || {};

      const usage: AIUsageMetrics = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
        model: this.textModel,
        provider: this.name,
        latencyMs
      };

      return {
        data: validation.data,
        rawText,
        usage
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`AI_TIMEOUT: Generation request timed out after ${timeout}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateText(
    prompt: string,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<{ text: string; usage: AIUsageMetrics }> {
    if (!this.isAvailable()) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: Gemini API key is not configured.');
    }

    const startTime = Date.now();
    const timeout = timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${this.apiKey}`;

    const requestBody: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: this.maxOutputTokens,
        temperature: 0.7
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`AI_PROVIDER_ERROR: Gemini returned status ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const json: any = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const latencyMs = Date.now() - startTime;
      const usageMetadata = json.usageMetadata || {};

      const usage: AIUsageMetrics = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
        model: this.textModel,
        provider: this.name,
        latencyMs
      };

      return { text, usage };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`AI_TIMEOUT: Generation request timed out after ${timeout}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async analyzeImages<T>(
    imageUrls: string[],
    prompt: string,
    schema: z.ZodType<T, any, any>,
    systemInstruction?: string,
    timeoutMs?: number
  ): Promise<AIProviderResult<T>> {
    if (!this.isAvailable()) {
      throw new Error('AI_PROVIDER_UNAVAILABLE: Gemini API key is not configured.');
    }

    const startTime = Date.now();
    const timeout = timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.visionModel}:generateContent?key=${this.apiKey}`;

    const parts: any[] = [{ text: `${prompt}\n\nReference Image URLs to analyze:\n${imageUrls.join('\n')}` }];

    const requestBody: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: this.maxOutputTokens,
        temperature: 0.4
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`AI_VISION_ERROR: Gemini vision returned status ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('AI_EMPTY_RESPONSE: No image analysis content returned.');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (err: any) {
        throw new Error(`AI_INVALID_JSON: Failed to parse vision JSON response: ${err.message}`);
      }

      const validation = schema.safeParse(parsedJson);
      if (!validation.success) {
        throw new Error(`AI_SCHEMA_VALIDATION_FAILED: ${validation.error.message}`);
      }

      const latencyMs = Date.now() - startTime;
      const usageMetadata = json.usageMetadata || {};

      const usage: AIUsageMetrics = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
        model: this.visionModel,
        provider: this.name,
        latencyMs
      };

      return {
        data: validation.data,
        rawText,
        usage
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`AI_TIMEOUT: Vision request timed out after ${timeout}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
