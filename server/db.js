/**
 * Headway Cloud & Local Database Layer
 * Dual Storage Engine: Upstash Redis REST API (Cloud Serverless) + Local File Fallback
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedBooks } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'user_state.json');

const REDIS_KEY_BOOKS = 'stride_catalog_books';
const REDIS_KEY_USER_STATE = 'stride_user_state';
const LEGACY_REDIS_KEY_BOOKS = 'headway_catalog_books';
const LEGACY_REDIS_KEY_USER_STATE = 'headway_user_state';

class DatabaseService {
  constructor() {
    this.upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    this.upstashToken = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    this.hasUpstash = Boolean(this.upstashUrl && this.upstashToken);

    this.books = [];
    this.userState = this._getDefaultUserState();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // 1. Try local file storage first (instant synchronous read in <2ms)
    this._loadLocal();

    // 2. If catalog is empty, hydrate from seedBooks
    if (this.books.length === 0) {
      console.log('📚 [DB] Seeding default curated microlearning books...');
      this.books = [...seedBooks];
      this._persistBooks().catch(() => {});
    }

    // 3. Clean up any hallucinated phantom fallback items
    const initialCount = this.books.length;
    this.books = this.books.filter(b => !b.title?.startsWith('YouTube Video (') && !b.id?.startsWith('youtube-video-qy8gr27ylmk'));
    if (this.books.length !== initialCount) {
      this._persistBooks().catch(() => {});
    }

    // 4. If Upstash is configured, run cloud sync asynchronously in background
    // This allows Express to bind the port and serve requests in milliseconds!
    if (this.hasUpstash) {
      console.log('⚡ [DB] Connecting to Upstash Redis Cloud in background...');
      this._syncFromUpstash()
        .then(() => {
          const filtered = this.books.filter(b => !b.title?.startsWith('YouTube Video (') && !b.id?.startsWith('youtube-video-qy8gr27ylmk'));
          if (filtered.length !== this.books.length) {
            this.books = filtered;
            this._persistBooks().catch(() => {});
          }
        })
        .catch(err => {
          console.warn('⚠️ [DB] Background Upstash sync error:', err.message);
        });
    } else {
      console.log('📁 [DB] Running with local file storage (data/ directory)');
    }

    this.initialized = true;
  }

  _getDefaultUserState() {
    return {
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      dailyGoalMinutes: 15,
      todayMinutesConsumed: 0,
      totalMinutesRead: 0,
      completedBookIds: [],
      inProgress: {
        bookId: "atomic-habits",
        chapterIndex: 1,
        audioTimeSec: 0
      },
      flashcardStats: {
        totalReviewed: 0,
        masteredCards: 0
      },
      historyDays: {} // { "2026-09-29": 15 }
    };
  }

  _loadLocal() {
    try {
      if (fs.existsSync(BOOKS_FILE)) {
        const raw = fs.readFileSync(BOOKS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.books = parsed;
        }
      }
      if (fs.existsSync(USER_STATE_FILE)) {
        const raw = fs.readFileSync(USER_STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.userState = { ...this._getDefaultUserState(), ...parsed };
        }
      }
    } catch (err) {
      console.warn('⚠️ [DB] Local file load warning:', err.message);
    }
  }

  async _syncFromUpstash() {
    try {
      const cloudBooks = await this._getUpstashKey(REDIS_KEY_BOOKS);
      if (Array.isArray(cloudBooks) && cloudBooks.length > 0) {
        this.books = cloudBooks;
        fs.writeFileSync(BOOKS_FILE, JSON.stringify(this.books, null, 2), 'utf-8');
      } else if (this.books.length > 0) {
        await this._setUpstashKey(REDIS_KEY_BOOKS, this.books);
      }

      const cloudUserState = await this._getUpstashKey(REDIS_KEY_USER_STATE);
      if (cloudUserState && typeof cloudUserState === 'object') {
        this.userState = { ...this.userState, ...cloudUserState };
        fs.writeFileSync(USER_STATE_FILE, JSON.stringify(this.userState, null, 2), 'utf-8');
      } else {
        await this._setUpstashKey(REDIS_KEY_USER_STATE, this.userState);
      }
      console.log('✅ [DB] Upstash cloud synchronization active.');
    } catch (err) {
      console.warn('⚠️ [DB] Upstash sync failed, keeping local copy:', err.message);
    }
  }

  async _persistBooks() {
    try {
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(this.books, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ [DB] Failed to save books locally:', err.message);
    }
    if (this.hasUpstash) {
      await this._setUpstashKey(REDIS_KEY_BOOKS, this.books);
    }
  }

  async _persistUserState() {
    try {
      fs.writeFileSync(USER_STATE_FILE, JSON.stringify(this.userState, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ [DB] Failed to save user state locally:', err.message);
    }
    if (this.hasUpstash) {
      await this._setUpstashKey(REDIS_KEY_USER_STATE, this.userState);
    }
  }

  async _getUpstashKey(key) {
    if (!this.hasUpstash) return null;
    const baseUrl = this.upstashUrl.replace(/\/$/, '');
    try {
      const resp = await fetch(`${baseUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.upstashToken}` },
        signal: AbortSignal.timeout(6000)
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data.result !== undefined && data.result !== null) {
        let val = data.result;
        while (typeof val === 'string') {
          try {
            val = JSON.parse(val);
          } catch {
            break;
          }
        }
        return val;
      }
    } catch (e) {
      console.warn(`[Upstash] Error getting key ${key}:`, e.message);
    }
    return null;
  }

  async _setUpstashKey(key, value) {
    if (!this.hasUpstash) return false;
    const baseUrl = this.upstashUrl.replace(/\/$/, '');
    try {
      const payload = JSON.stringify(value);
      const resp = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.upstashToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, payload]),
        signal: AbortSignal.timeout(6000)
      });
      return resp.ok;
    } catch (e) {
      console.warn(`[Upstash] Error setting key ${key}:`, e.message);
      return false;
    }
  }

  // --- Public API Methods ---

  getBooks() {
    return this.books.map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      readTimeMin: b.readTimeMin || 15,
      coverAccent: b.coverAccent || '#F5C518',
      synopsis: b.synopsis,
      chapterCount: b.chapters?.length || 0,
      flashcardCount: b.flashcards?.length || 0
    }));
  }

  getBook(id) {
    return this.books.find(b => b.id === id) || null;
  }

  async saveBook(book) {
    const existingIdx = this.books.findIndex(b => b.id === book.id);
    if (existingIdx >= 0) {
      this.books[existingIdx] = { ...this.books[existingIdx], ...book };
    } else {
      this.books.unshift(book);
    }
    await this._persistBooks();
    return book;
  }

  getUserState() {
    // Check day rollover for streak and daily minutes
    const today = new Date().toISOString().split('T')[0];
    if (this.userState.lastActiveDate !== today) {
      const lastDate = new Date(this.userState.lastActiveDate);
      const curDate = new Date(today);
      const diffDays = Math.round((curDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // consecutive day
        if (this.userState.todayMinutesConsumed < 3) {
          // Did not complete minimum on previous day, reset streak to 0
          this.userState.streak = 1;
        }
      } else if (diffDays > 1) {
        // Gap of 2+ days, reset streak
        this.userState.streak = 1;
      }
      this.userState.lastActiveDate = today;
      this.userState.todayMinutesConsumed = 0;
      this._persistUserState().catch(() => {});
    }
    return this.userState;
  }

  async logProgress({ minutes = 1, bookId = null, chapterIndex = 1, audioTimeSec = 0 }) {
    const today = new Date().toISOString().split('T')[0];
    this.getUserState(); // rollover check

    const mins = Math.max(0, Number(minutes) || 0);
    this.userState.todayMinutesConsumed += mins;
    this.userState.totalMinutesRead += mins;
    this.userState.historyDays[today] = (this.userState.historyDays[today] || 0) + mins;

    if (bookId) {
      this.userState.inProgress = {
        bookId,
        chapterIndex: Number(chapterIndex) || 1,
        audioTimeSec: Number(audioTimeSec) || 0,
        updatedAt: new Date().toISOString()
      };
    }

    // Check if daily threshold (3 minutes) reached to ensure streak is active
    if (this.userState.todayMinutesConsumed >= 3 && this.userState.streak === 0) {
      this.userState.streak = 1;
    }

    await this._persistUserState();
    return this.userState;
  }

  getAllFlashcards() {
    const all = [];
    for (const book of this.books) {
      if (Array.isArray(book.flashcards)) {
        for (const card of book.flashcards) {
          all.push({
            ...card,
            bookTitle: book.title,
            bookAuthor: book.author
          });
        }
      }
    }
    return all;
  }

  getFlashcardsDue() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const all = this.getAllFlashcards();
    return all.filter(c => {
      if (!c.nextReviewAt) return true;
      const dueStr = c.nextReviewAt.split('T')[0];
      return dueStr <= todayStr;
    });
  }

  /**
   * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
   * Quality: 2 (Hard), 4 (Good), 5 (Easy)
   */
  async reviewFlashcard(cardId, quality) {
    const q = Number(quality);
    let targetCard = null;
    let targetBook = null;

    for (const book of this.books) {
      if (Array.isArray(book.flashcards)) {
        const found = book.flashcards.find(c => c.id === cardId);
        if (found) {
          targetCard = found;
          targetBook = book;
          break;
        }
      }
    }

    if (!targetCard) {
      throw new Error(`Flashcard not found: ${cardId}`);
    }

    let repetitions = targetCard.repetitions || 0;
    let interval = targetCard.intervalDays || 1;
    let easeFactor = targetCard.easeFactor || 2.5;

    if (q >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      interval = 1;
      repetitions = 0;
    }

    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    targetCard.repetitions = repetitions;
    targetCard.intervalDays = interval;
    targetCard.easeFactor = Number(easeFactor.toFixed(2));
    targetCard.nextReviewAt = nextReviewDate.toISOString();
    targetCard.lastReviewedAt = new Date().toISOString();

    // Update user stats
    this.userState.flashcardStats.totalReviewed += 1;
    if (interval >= 6) {
      this.userState.flashcardStats.masteredCards += 1;
    }

    await this._persistBooks();
    await this._persistUserState();

    return {
      cardId,
      nextReviewAt: targetCard.nextReviewAt,
      intervalDays: interval,
      repetitions,
      easeFactor: targetCard.easeFactor
    };
  }

  getShorts() {
    const shorts = [];
    for (const book of this.books) {
      if (Array.isArray(book.shortInsights)) {
        for (const item of book.shortInsights) {
          shorts.push({
            type: 'insight',
            bookId: book.id,
            bookTitle: book.title,
            author: book.author,
            quote: item.quote,
            tag: item.tag || 'Mindset'
          });
        }
      }
      if (book.quiz) {
        shorts.push({
          type: 'quiz',
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          quiz: book.quiz
        });
      }
    }
    // Shuffle slightly for fresh feed experience
    return shorts.sort(() => 0.5 - Math.random());
  }

  getUpstashStatus() {
    return {
      connected: this.hasUpstash,
      provider: this.hasUpstash ? 'Upstash Redis REST' : 'Local JSON File System',
      endpoint: this.hasUpstash ? this.upstashUrl.split('@').pop() : 'data/books.json',
      bookCount: this.books.length,
      flashcardCount: this.getAllFlashcards().length
    };
  }
}

export const db = new DatabaseService();
