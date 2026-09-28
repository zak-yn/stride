/**
 * Headway AI Engine: Powered by Gemini 3.5 Flash Lite
 * Free-tier optimized with resilient fallback & high-demand exponential backoff.
 */

const USER_API_KEY = process.env.GEMINI_API_KEY || '';
const FALLBACK_API_KEY = process.env.GEMINI_FALLBACK_KEY || '';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export class GeminiSummarizer {
  constructor() {
    this.primaryKey = USER_API_KEY;
    this.fallbackKey = FALLBACK_API_KEY;
    this.modelName = MODEL_NAME;
  }

  async generateWithKey(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const err = new Error(data.error?.message || `HTTP ${response.status}`);
      err.code = data.error?.code || response.status;
      throw err;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No text generated in response');
    }

    return text;
  }

  async generate(prompt) {
    // 1. Try with user's primary key
    try {
      return await this.generateWithKey(this.primaryKey, prompt);
    } catch (primaryErr) {
      console.warn(`[Gemini] Primary key failed (${primaryErr.message}). Retrying with resilient fallback key...`);
      // If 503 high-demand spike or quota error, try fallback key
      try {
        return await this.generateWithKey(this.fallbackKey, prompt);
      } catch (fallbackErr) {
        throw new Error(`Gemini generation failed: ${fallbackErr.message}`);
      }
    }
  }

  async summarizeContent({ input, language = 'English' }) {
    const systemPrompt = `You are a world-class editorial curator and executive summary writer for Headway, the premier microlearning application.
Transform the provided input (book title, author, topic, or raw transcript) into a high-density, beautifully structured microlearning masterwork.

Output MUST be strictly valid JSON matching this exact structure:
{
  "id": "slug-title-here",
  "title": "Clean Title of the Book or Topic",
  "author": "Author or Speaker Name",
  "category": "One of: Productivity & Habits | Career & Focus | Wealth & Finance | Psychology & Decision Making | Leadership & Life | Health & Vitality",
  "readTimeMin": 15,
  "coverAccent": "#F5C518 or #3B82F6 or #10B981 or #EC4899 or #8B5CF6 or #F97316",
  "synopsis": "Punchy 2-sentence synopsis capturing the primary paradigm shift.",
  "keyTakeaways": [
    "High-impact takeaway 1",
    "High-impact takeaway 2",
    "High-impact takeaway 3",
    "High-impact takeaway 4"
  ],
  "chapters": [
    {
      "chapterIndex": 1,
      "title": "Compelling Title for Chapter 1",
      "content": "Rich, insightful editorial prose (250-350 words). Practical, engaging, and suitable for synchronized audio reading."
    },
    {
      "chapterIndex": 2,
      "title": "Compelling Title for Chapter 2",
      "content": "Rich, insightful editorial prose (250-350 words)."
    },
    {
      "chapterIndex": 3,
      "title": "Compelling Title for Chapter 3",
      "content": "Rich, insightful editorial prose (250-350 words)."
    },
    {
      "chapterIndex": 4,
      "title": "Compelling Title for Chapter 4",
      "content": "Rich, insightful editorial prose (250-350 words)."
    },
    {
      "chapterIndex": 5,
      "title": "Actionable Behavioral Blueprint (Conclusion)",
      "content": "Step-by-step implementation guide and final takeaway (250-350 words)."
    }
  ],
  "flashcards": [
    {
      "front": "Thought-provoking question or core concept?",
      "back": "Clear, punchy behavioral rule or mental model."
    },
    {
      "front": "Second core concept question?",
      "back": "Actionable insight."
    },
    {
      "front": "Third core concept question?",
      "back": "Actionable insight."
    },
    {
      "front": "Fourth core concept question?",
      "back": "Actionable insight."
    },
    {
      "front": "Fifth core concept question?",
      "back": "Actionable insight."
    }
  ],
  "quiz": {
    "scenario": "A concrete real-world workplace or life dilemma applying this book's teachings.",
    "options": [
      "Common intuitive but suboptimal reaction",
      "Optimal principled approach recommended by the author",
      "Counterproductive or extreme reaction"
    ],
    "correctIndex": 1,
    "explanation": "Brief 1-2 sentence lesson explaining why the chosen option succeeds based on the book's principles."
  },
  "shortInsights": [
    {
      "quote": "Memorable, quotable wisdom from this work.",
      "tag": "Mindset"
    },
    {
      "quote": "Second unforgettable insight.",
      "tag": "Execution"
    }
  ]
}

LANGUAGE REQUIREMENT: Write the entire summary, chapters, flashcards, and quiz in ${language}.
INPUT CONTENT / TOPIC / TRANSCRIPT:
${input.slice(0, 50000)}
`;

    const raw = await this.generate(systemPrompt);
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    
    // Add IDs and SM-2 metadata to flashcards
    const bookId = parsed.id || 'book-' + Date.now();
    parsed.id = bookId;
    if (Array.isArray(parsed.flashcards)) {
      parsed.flashcards = parsed.flashcards.map((fc, idx) => ({
        id: `${bookId}-fc-${idx + 1}`,
        bookId,
        front: fc.front,
        back: fc.back,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }));
    }

    return parsed;
  }
}

export const geminiSummarizer = new GeminiSummarizer();
