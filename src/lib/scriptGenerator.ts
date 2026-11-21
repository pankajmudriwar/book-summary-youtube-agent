import { GoogleGenAI } from '@google/genai';
import type { GeneratedScript } from './types';

/**
 * Generate a Marathi YouTube narration script + SEO metadata for a book.
 *
 * Uses Gemini with structured JSON output so the response is reliably parseable.
 */
export async function generateScript(
  bookTitle: string,
  author: string,
  researchContent: string,
): Promise<GeneratedScript> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY env var is not set');
  }

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a top-performing Marathi YouTube content creator specialising in book summaries.

Using the research below, produce a COMPLETE YouTube video package for the book "${bookTitle}" by ${author}.

## RESEARCH CONTENT
${researchContent}

## OUTPUT REQUIREMENTS

### youtube_title
- Mix Marathi + English for maximum CTR
- Under 90 characters
- Include power words and the book title
- Example style: "या पुस्तकाने माझं आयुष्य बदललं! | Atomic Habits Summary in Marathi"

### youtube_description
- Compelling Marathi overview (150-250 words)
- Include 3-5 timestamps
- End with 8-10 hashtags mixing Marathi and English
- Include a subscribe CTA

### youtube_tags
- 15-20 keywords
- Mix of Marathi and English
- Include book title, author name, genre, and broad discovery terms like "book summary marathi", "पुस्तक सारांश"

### script_marathi
- 650-900 words in Devanagari script
- Structure: Hook (30-50 words) → Context (80-120 words) → Lessons with stories (400-600 words) → CTA (30-50 words)
- Conversational, energetic tone — speak directly to the viewer ("तुम्ही", "आपण")
- Include rhetorical questions and relatable examples
- Do NOT use markdown formatting symbols like *, #, or stage directions like [pause]
- Write pure narration text only`;

  const responseSchema = {
    type: 'object' as const,
    properties: {
      youtube_title: { type: 'string' as const },
      youtube_description: { type: 'string' as const },
      youtube_tags: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      script_marathi: { type: 'string' as const },
    },
    required: [
      'youtube_title',
      'youtube_description',
      'youtube_tags',
      'script_marathi',
    ],
  };

  const interaction = await client.interactions.create({
    model: 'gemini-4-hydrogen',
    input: prompt,
    response_mime_type: 'application/json',
    response_format: {
      type: 'json_schema',
      json_schema: { schema: responseSchema },
    } as any,
  });

  const rawText = interaction.output_text;
  if (!rawText) {
    throw new Error('Gemini returned no output for script generation');
  }

  const parsed: GeneratedScript = JSON.parse(rawText);

  // Clean up any residual markdown symbols the model may have included
  parsed.script_marathi = cleanScript(parsed.script_marathi);
  parsed.youtube_title = cleanScript(parsed.youtube_title);

  return parsed;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip markdown-style formatting symbols and stage directions that
 * should not appear in spoken narration or YouTube metadata.
 */
function cleanScript(text: string): string {
  return text
    .replace(/\*{1,3}/g, '') // bold / italic markers
    .replace(/#{1,6}\s?/g, '') // heading markers
    .replace(/\[pause\]/gi, '') // stage directions
    .replace(/\[music\]/gi, '')
    .replace(/\[intro\]/gi, '')
    .replace(/\[outro\]/gi, '')
    .replace(/\n{3,}/g, '\n\n') // collapse excess newlines
    .trim();
}
