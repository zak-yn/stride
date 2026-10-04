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
const DELETED_BOOKS_FILE = path.join(DATA_DIR, 'deleted_books.json');

const REDIS_KEY_BOOKS = 'stride_catalog_books';
const REDIS_KEY_USER_STATE = 'stride_user_state';
const REDIS_KEY_DELETED_BOOKS = 'stride_deleted_book_ids';
const LEGACY_REDIS_KEY_BOOKS = 'headway_catalog_books';
const LEGACY_REDIS_KEY_USER_STATE = 'headway_user_state';

class DatabaseService {
  constructor() {
    this.upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    this.upstashToken = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    this.hasUpstash = Boolean(this.upstashUrl && this.upstashToken);

    this.books = [];
    this.deletedBookIds = new Set();
    this.userState = this._getDefaultUserState();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // 1. Try local file storage first (instant synchronous read in <2ms)
    this._loadLocal();

    // 2. If catalog is empty, hydrate from seedBooks (LOCAL ONLY, do not overwrite Upstash yet!)
    if (this.books.length === 0) {
      console.log('📚 [DB] Seeding curated microlearning books locally...');
      this.books = seedBooks.filter(b => !this.deletedBookIds.has(b.id));
      this._persistLocalOnly();
    }

    // 3. Clean up any hallucinated phantom fallback items or deleted books
    const initialCount = this.books.length;
    this.books = this.books.filter(
      b => !b.title?.startsWith('YouTube Video (') &&
           !b.id?.startsWith('youtube-video-qy8gr27ylmk') &&
           !this.deletedBookIds.has(b.id)
    );
    if (this.books.length !== initialCount) {
      this._persistLocalOnly();
    }

    // 4. If Upstash is configured, run cloud sync in background
    // Merges cloud with local without ever erasing generated books!
    if (this.hasUpstash) {
      console.log('⚡ [DB] Connecting to Upstash Redis Cloud in background...');
      this._syncFromUpstash()
        .then(() => {
          console.log(`✅ [DB] Upstash cloud synchronization active. Total library books: ${this.books.length}`);
        })
        .catch(err => {
          console.warn('⚠️ [DB] Background Upstash sync warning:', err.message);
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
      if (fs.existsSync(DELETED_BOOKS_FILE)) {
        const rawDel = fs.readFileSync(DELETED_BOOKS_FILE, 'utf-8');
        const parsedDel = JSON.parse(rawDel);
        if (Array.isArray(parsedDel)) {
          this.deletedBookIds = new Set(parsedDel);
        }
      }
      if (fs.existsSync(BOOKS_FILE)) {
        const raw = fs.readFileSync(BOOKS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.books = parsed.filter(b => !this.deletedBookIds.has(b.id));
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
      // 1. Fetch cloud deleted IDs to ensure deleted items remain deleted
      const cloudDeleted = await this._getUpstashKey(REDIS_KEY_DELETED_BOOKS);
      if (Array.isArray(cloudDeleted)) {
        for (const id of cloudDeleted) {
          this.deletedBookIds.add(id);
        }
        this._persistDeletedLocal();
      }

      // 2. Fetch cloud catalog books
      const cloudBooks = await this._getUpstashKey(REDIS_KEY_BOOKS);

      // Merge: seedBooks + cloudBooks + local books without resurrecting deleted ones
      const bookMap = new Map();

      // Priority 1: seedBooks (base catalog)
      for (const b of seedBooks) {
        if (!this.deletedBookIds.has(b.id)) {
          bookMap.set(b.id, { ...b, isGenerated: false });
        }
      }

      // Priority 2: cloudBooks
      if (Array.isArray(cloudBooks)) {
        for (const b of cloudBooks) {
          if (!this.deletedBookIds.has(b.id)) {
            bookMap.set(b.id, b);
          }
        }
      }

      // Priority 3: local books (keep latest local generated editions)
      for (const b of this.books) {
        if (!this.deletedBookIds.has(b.id)) {
          bookMap.set(b.id, b);
        }
      }

      this.books = Array.from(bookMap.values()).filter(
        b => !b.title?.startsWith('YouTube Video (') &&
             !b.id?.startsWith('youtube-video-qy8gr27ylmk') &&
             !this.deletedBookIds.has(b.id)
      );

      // Persist merged state to both local and Upstash Redis Cloud
      this._persistLocalOnly();
      await this._setUpstashKey(REDIS_KEY_BOOKS, this.books);
      await this._setUpstashKey(REDIS_KEY_DELETED_BOOKS, Array.from(this.deletedBookIds));

      // User state sync
      const cloudUserState = await this._getUpstashKey(REDIS_KEY_USER_STATE);
      if (cloudUserState && typeof cloudUserState === 'object') {
        this.userState = { ...this.userState, ...cloudUserState };
        fs.writeFileSync(USER_STATE_FILE, JSON.stringify(this.userState, null, 2), 'utf-8');
      } else {
        await this._setUpstashKey(REDIS_KEY_USER_STATE, this.userState);
      }
    } catch (err) {
      console.warn('⚠️ [DB] Upstash sync failed, keeping local copy:', err.message);
    }
  }

  _persistLocalOnly() {
    try {
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(this.books, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ [DB] Failed to save books locally:', err.message);
    }
  }

  _persistDeletedLocal() {
    try {
      fs.writeFileSync(DELETED_BOOKS_FILE, JSON.stringify(Array.from(this.deletedBookIds), null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ [DB] Failed to save deleted book IDs locally:', err.message);
    }
  }

  async _persistBooks() {
    this._persistLocalOnly();
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
      flashcardCount: b.flashcards?.length || 0,
      isGenerated: Boolean(b.isGenerated),
      createdAt: b.createdAt || null,
      sourceType: b.sourceType || 'book'
    }));
  }

  getBook(id) {
    return this.books.find(b => b.id === id) || null;
  }

  async saveBook(book) {
    // If book was previously marked deleted, un-delete it since user is re-saving/generating
    this.deletedBookIds.delete(book.id);
    this._persistDeletedLocal();

    const bookToSave = {
      ...book,
      isGenerated: book.isGenerated !== undefined ? book.isGenerated : true,
      createdAt: book.createdAt || new Date().toISOString()
    };

    const existingIdx = this.books.findIndex(b => b.id === bookToSave.id);
    if (existingIdx >= 0) {
      this.books[existingIdx] = { ...this.books[existingIdx], ...bookToSave };
    } else {
      this.books.unshift(bookToSave);
    }

    await this._persistBooks();
    if (this.hasUpstash) {
      await this._setUpstashKey(REDIS_KEY_DELETED_BOOKS, Array.from(this.deletedBookIds));
    }
    return bookToSave;
  }

  async deleteBook(id) {
    const idx = this.books.findIndex(b => b.id === id);
    if (idx === -1) {
      return false;
    }

    this.books.splice(idx, 1);
    this.deletedBookIds.add(id);

    this._persistLocalOnly();
    this._persistDeletedLocal();

    if (this.hasUpstash) {
      await this._setUpstashKey(REDIS_KEY_BOOKS, this.books);
      await this._setUpstashKey(REDIS_KEY_DELETED_BOOKS, Array.from(this.deletedBookIds));
    }

    // Clean up userState if deleted book was currently inProgress
    if (this.userState.inProgress && this.userState.inProgress.bookId === id) {
      const nextBook = this.books[0];
      this.userState.inProgress = {
        bookId: nextBook ? nextBook.id : 'atomic-habits',
        chapterIndex: 1,
        audioTimeSec: 0,
        updatedAt: new Date().toISOString()
      };
      await this._persistUserState();
    }

    return true;
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
