/**
 * Headway Microlearning Server
 * Render Cloud Web Service with Upstash Redis REST & Gemini 3.5 Flash Lite
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { geminiSummarizer } from './server/gemini.js';
import { searchYouTube, extractYouTubeId, fetchVideoDetailsAndTranscript } from './server/youtube.js';
import { ttsService } from './server/tts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database (Local + Upstash sync)
await db.init();

// --- API Endpoints ---

// 1. Books Catalog
app.get('/api/books', (req, res) => {
  try {
    const books = db.getBooks();
    res.json({ success: true, books });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Single Book Detail
app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.getBook(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    res.json({ success: true, book });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. User Progress & Daily Streaks
app.get('/api/progress', (req, res) => {
  try {
    const progress = db.getUserState();
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { minutes, bookId, chapterIndex, audioTimeSec } = req.body;
    const progress = await db.logProgress({ minutes, bookId, chapterIndex, audioTimeSec });
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Spaced Repetition (SM-2 Flashcards)
app.get('/api/flashcards', (req, res) => {
  try {
    const dueOnly = req.query.due === 'true';
    const cards = dueOnly ? db.getFlashcardsDue() : db.getAllFlashcards();
    res.json({ success: true, cards, dueCount: db.getFlashcardsDue().length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/flashcards/:id/review', async (req, res) => {
  try {
    const { quality } = req.body; // 2 = Hard, 4 = Good, 5 = Easy
    if (!quality) {
      return res.status(400).json({ success: false, error: 'Missing quality rating' });
    }
    const result = await db.reviewFlashcard(req.params.id, quality);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Shorts Feed (Bite-sized Insights & Scenario Quizzes)
app.get('/api/shorts', (req, res) => {
  try {
    const shorts = db.getShorts();
    res.json({ success: true, shorts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.5 Studio Neural TTS Audio Stream (Free Microsoft Edge Azure Neural Voices)
app.get('/api/tts/voices', (req, res) => {
  res.json({ success: true, voices: ttsService.getCuratedVoices() });
});

app.get('/api/tts', async (req, res) => {
  try {
    const text = req.query.text;
    const voice = req.query.voice || 'en-US-AndrewNeural';

    if (!text || !text.trim()) {
      return res.status(400).send('Text parameter is required');
    }

    const { buffer } = await ttsService.synthesizeToBuffer(text, voice);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  } catch (err) {
    console.error('[TTS API Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 6. YouTube In-App Search & Video Summarization
app.get('/api/youtube/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return res.json({ success: true, videos: [] });
    }
    const videos = await searchYouTube(q);
    res.json({ success: true, videos });
  } catch (err) {
    console.error('YouTube search error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/youtube/summarize', async (req, res) => {
  try {
    const { urlOrId, language } = req.body;
    if (!urlOrId || !urlOrId.trim()) {
      return res.status(400).json({ success: false, error: 'YouTube URL or Video ID is required' });
    }

    const videoId = extractYouTubeId(urlOrId);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Invalid YouTube URL or Video ID' });
    }

    console.log(`🎬 [YouTube] Fetching details & transcript for video: ${videoId}...`);
    const videoDetails = await fetchVideoDetailsAndTranscript(videoId);

    console.log(`🤖 [Gemini] Summarizing YouTube video "${videoDetails.title}" with Gemini 3.5 Flash Lite...`);
    const summaryData = await geminiSummarizer.summarizeYouTubeVideo(
      videoDetails,
      language || 'English'
    );

    // Save directly to catalog
    await db.saveBook(summaryData);

    console.log(`✨ [Gemini] Successfully generated microlearning edition for "${summaryData.title}"!`);
    res.json({ success: true, book: summaryData });
  } catch (err) {
    console.error('❌ [YouTube Summarize] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. General AI Ingestion Studio: Summarize Book / Podcast / Transcript / YouTube
app.post('/api/generate', async (req, res) => {
  try {
    const { input, language } = req.body;
    if (!input || !input.trim()) {
      return res.status(400).json({ success: false, error: 'Input is required' });
    }

    const ytId = extractYouTubeId(input);
    let summaryData;

    if (ytId) {
      console.log(`🎬 [Gemini] Detected YouTube input (${ytId}). Extracting transcript & metadata...`);
      const videoDetails = await fetchVideoDetailsAndTranscript(ytId);
      summaryData = await geminiSummarizer.summarizeYouTubeVideo(videoDetails, language || 'English');
    } else {
      console.log(`🤖 [Gemini] Generating microlearning summary for: "${input.slice(0, 60)}..."`);
      summaryData = await geminiSummarizer.summarizeContent({
        input: input.trim(),
        language: language || 'English'
      });
    }

    // Save directly to catalog
    await db.saveBook(summaryData);

    console.log(`✨ [Gemini] Successfully generated and stored "${summaryData.title}"!`);
    res.json({ success: true, book: summaryData });
  } catch (err) {
    console.error('❌ [Gemini] Generation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. System Health & Upstash Cloud Status
app.get('/api/status', (req, res) => {
  try {
    const upstash = db.getUpstashStatus();
    res.json({
      success: true,
      service: 'Stride Microlearning API',
      status: 'operational',
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      upstash,
      env: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stride App live on http://localhost:${PORT}`);
  console.log(`⚡ Ready for Render deployment with Upstash Redis & Gemini 3.5 Flash Lite`);
});
