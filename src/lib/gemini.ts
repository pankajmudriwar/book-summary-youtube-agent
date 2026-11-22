import { GoogleGenAI, GenerateContentConfig } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Call Gemini models with automatic fallbacks for resiliency.
 * Primary: gemini-3.6-flash
 * Fallbacks: gemini-3.8-flash, gemini-2.5-flash-lite
 */
export async function generateWithFallback(
  contents: string,
  config: GenerateContentConfig = {},
): Promise<string> {
  const client = getGeminiClient();
  const models = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed, attempting next fallback:`, err.message?.slice(0, 120));
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}
