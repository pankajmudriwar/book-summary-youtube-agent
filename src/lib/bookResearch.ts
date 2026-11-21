import { GoogleGenAI } from '@google/genai';
import { getServerSupabase } from './supabase';

// ─── Book Cover Fetching ─────────────────────────────────────────────────────

/**
 * Attempt to find a cover image for the given book.
 * Strategy: Google Books API → Open Library Covers API → generated SVG cover.
 */
export async function fetchBookCover(
  title: string,
  author?: string,
): Promise<string> {
  const query = author ? `${title} ${author}` : title;

  // 1. Google Books API
  try {
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    const gbRes = await fetch(gbUrl);
    if (gbRes.ok) {
      const gbData = await gbRes.json();
      const thumbnail =
        gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ??
        gbData.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;
      if (thumbnail) {
        // Google Books returns http URLs; upgrade to https
        return thumbnail.replace(/^http:/, 'https:');
      }
    }
  } catch {
    // fall through to next strategy
  }

  // 2. Open Library Covers API (search by title)
  try {
    const olSearchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
    const olRes = await fetch(olSearchUrl);
    if (olRes.ok) {
      const olData = await olRes.json();
      const coverId = olData.docs?.[0]?.cover_i;
      if (coverId) {
        return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      }
    }
  } catch {
    // fall through to SVG generation
  }

  // 3. Generate a typographic SVG cover and upload to Supabase Storage
  return generateAndUploadCover(title, author);
}

/**
 * Create a minimal SVG cover with the book title in Devanagari,
 * then upload to Supabase Storage and return the public URL.
 */
async function generateAndUploadCover(
  title: string,
  author?: string,
): Promise<string> {
  const escapedTitle = escapeXml(title);
  const escapedAuthor = author ? escapeXml(author) : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)"/>
  <rect x="20" y="20" width="360" height="560" rx="8" fill="none" stroke="#e94560" stroke-width="2"/>
  <text x="200" y="260" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold">
    ${wrapSvgText(escapedTitle, 16)}
  </text>
  ${
    escapedAuthor
      ? `<text x="200" y="420" text-anchor="middle" fill="#e94560" font-family="sans-serif" font-size="18">${escapedAuthor}</text>`
      : ''
  }
  <text x="200" y="540" text-anchor="middle" fill="#888888" font-family="sans-serif" font-size="12">पुस्तक सारांश</text>
</svg>`;

  const svgBuffer = Buffer.from(svg, 'utf-8');

  // Upload to Supabase Storage
  const supabase = getServerSupabase();
  const fileName = `covers/${Date.now()}-${slugify(title)}.svg`;

  const { error: uploadError } = await supabase.storage
    .from('agent-media')
    .upload(fileName, svgBuffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (uploadError) {
    console.error('Cover upload failed:', uploadError.message);
    // Return a data-URI fallback so the pipeline does not break
    return `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('agent-media').getPublicUrl(fileName);

  return publicUrl;
}

// ─── Book Content Research ───────────────────────────────────────────────────

/**
 * Research a book's content — chapters, philosophy, key lessons, examples.
 * If `sourceText` is provided it is used directly; otherwise the Gemini API
 * with Google Search grounding fetches relevant information.
 */
export async function researchBookContent(
  title: string,
  author?: string,
  sourceText?: string,
): Promise<string> {
  if (sourceText?.trim()) {
    return sourceText.trim();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY env var is not set');
  }

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a meticulous book researcher. Research the book "${title}"${author ? ` by ${author}` : ''}.

Provide a comprehensive summary covering:
1. **Overview** — What is the book about? Genre, context, year of publication.
2. **Chapter-wise breakdown** — List each major chapter/section with a 2-3 sentence summary.
3. **Core philosophy & themes** — The central ideas and recurring themes.
4. **Key lessons & takeaways** — At least 5 actionable lessons a reader walks away with.
5. **Real-world examples & stories** — Memorable anecdotes or case studies from the book.
6. **Author background** — Brief bio and why the author is credible on this topic.

Write in English. Be detailed — this research will be used to generate a Marathi YouTube narration script.`;

  const interaction = await client.interactions.create({
    model: 'gemini-4-hydrogen',
    input: prompt,
    tools: [{ google_search: {} } as any],
  });

  const output = interaction.output_text;
  if (!output) {
    throw new Error('Gemini returned no output for book research');
  }

  return output;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Wrap long text into multiple <tspan> elements for SVG rendering. */
function wrapSvgText(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current.trim()) lines.push(current.trim());

  return lines
    .map(
      (line, i) =>
        `<tspan x="200" dy="${i === 0 ? 0 : 36}">${line}</tspan>`,
    )
    .join('');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}
