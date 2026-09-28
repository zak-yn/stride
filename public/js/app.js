/**
 * Headway Main Application Orchestrator
 * Connects UI, State, Audio Engine, SM-2 Spaced Repetition, and AI Ingestion.
 */

import { icons } from './icons.js';
import { AudioEngine } from './audioEngine.js';

class HeadwayApp {
  constructor() {
    this.books = [];
    this.activeCategory = 'all';
    this.userState = {
      streak: 1,
      todayMinutesConsumed: 0,
      dailyGoalMinutes: 15,
      totalMinutesRead: 0
    };

    // Review / SM-2 state
    this.dueCards = [];
    this.currentCardIdx = 0;
    this.isCardFlipped = false;

    // Shorts state
    this.shorts = [];

    // Selected book for details
    this.selectedBook = null;

    // Init Audio Engine
    this.audio = new AudioEngine({
      onStateChange: (state) => this.handleAudioStateChange(state),
      onSentenceChange: (idx) => this.handleSentenceChange(idx),
      onProgressUpdate: (data) => this.handleProgressUpdate(data)
    });

    this.init();
  }

  async init() {
    this.renderStaticIcons();
    this.setupNavigation();
    this.setupEventListeners();
    this.registerServiceWorker();

    // Initial Data Fetch
    await this.fetchProgress();
    await this.fetchBooks();
    await this.fetchFlashcards();
    await this.fetchShorts();
    await this.fetchSystemStatus();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    }
  }

  renderStaticIcons() {
    // Header
    const flameSlot = document.getElementById('header-flame-icon');
    if (flameSlot) flameSlot.innerHTML = icons.flame(16);

    const settingsSlot = document.getElementById('header-settings-icon');
    if (settingsSlot) settingsSlot.innerHTML = icons.settings(18);

    // Hero
    const heroSparkle = document.getElementById('hero-sparkle-icon');
    if (heroSparkle) heroSparkle.innerHTML = icons.sparkles(14);

    const heroClock = document.getElementById('hero-clock-icon');
    if (heroClock) heroClock.innerHTML = icons.clock(14);

    const heroPlay = document.getElementById('btn-hero-play');
    if (heroPlay) {
      const playIcon = heroPlay.querySelector('#hero-play-icon');
      if (playIcon) playIcon.innerHTML = icons.play(14);
    }

    // Nav icons
    document.getElementById('icon-nav-today').innerHTML = icons.home(20);
    document.getElementById('icon-nav-library').innerHTML = icons.library(20);
    document.getElementById('icon-nav-review').innerHTML = icons.cards(20);
    document.getElementById('icon-nav-shorts').innerHTML = icons.shorts(20);
    document.getElementById('icon-nav-studio').innerHTML = icons.sparkles(20);

    // Mini Player
    document.getElementById('mini-play-icon').innerHTML = icons.play(18);

    // Reader Deck
    document.getElementById('icon-close-reader').innerHTML = icons.chevronLeft(22);
    document.getElementById('icon-sleep-timer').innerHTML = icons.clock(18);
    document.getElementById('icon-deck-back15').innerHTML = icons.skipBack15(20);
    document.getElementById('icon-deck-play').innerHTML = icons.play(24);
    document.getElementById('icon-deck-forward15').innerHTML = icons.skipForward15(20);
    document.getElementById('icon-deck-next-ch').innerHTML = icons.chevronRight(20);

    // Modals
    document.getElementById('icon-close-detail').innerHTML = icons.close(18);
    document.getElementById('icon-close-settings').innerHTML = icons.close(18);
    document.getElementById('icon-detail-listen').innerHTML = icons.play(14);
    document.getElementById('studio-sparkle-icon').innerHTML = icons.sparkles(16);
    document.getElementById('all-caught-up-icon').innerHTML = icons.check(28);

    const searchIconSlot = document.getElementById('search-icon-slot');
    if (searchIconSlot) searchIconSlot.innerHTML = icons.search(16);
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        navItems.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');

        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  setupEventListeners() {
    // Hero Play
    document.getElementById('btn-hero-play')?.addEventListener('click', () => {
      const topBook = this.books[0];
      if (topBook) this.openReader(topBook, 1, true);
    });

    // Category chips in Today tab
    document.querySelectorAll('#today-category-chips .chip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#today-category-chips .chip-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.cat;
        this.renderBooksGrid('today-book-grid');
      });
    });

    // Category chips in Library tab
    document.querySelectorAll('#library-category-chips .chip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#library-category-chips .chip-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.cat;
        this.renderBooksGrid('library-book-grid');
      });
    });

    // Library search
    const searchInput = document.getElementById('library-search-input');
    searchInput?.addEventListener('input', () => {
      this.renderBooksGrid('library-book-grid', searchInput.value.trim().toLowerCase());
    });

    // Mini Player bar click -> open full reader
    document.getElementById('mini-player-expand-trigger')?.addEventListener('click', () => {
      this.openReaderModal();
    });

    document.getElementById('btn-mini-play')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.togglePlay();
    });

    // Reader Deck controls
    document.getElementById('btn-close-reader')?.addEventListener('click', () => {
      this.closeReaderModal();
    });

    document.getElementById('btn-reader-play')?.addEventListener('click', () => {
      this.audio.togglePlay();
    });

    document.getElementById('btn-reader-skip-back')?.addEventListener('click', () => {
      this.audio.skip(-15);
    });

    document.getElementById('btn-reader-skip-forward')?.addEventListener('click', () => {
      this.audio.skip(15);
    });

    document.getElementById('btn-reader-next-ch')?.addEventListener('click', () => {
      this.audio.nextChapter();
    });

    // Playback Speed Toggle
    const speedBtn = document.getElementById('btn-reader-speed');
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    let curSpeedIdx = 0;
    speedBtn?.addEventListener('click', () => {
      curSpeedIdx = (curSpeedIdx + 1) % speeds.length;
      const spd = speeds[curSpeedIdx];
      this.audio.setRate(spd);
      speedBtn.innerText = `${spd}x`;
    });

    // Sleep Timer
    document.getElementById('btn-toggle-sleep')?.addEventListener('click', () => {
      const choice = prompt('Set Sleep Timer (minutes):\nEnter 5, 15, 30, or 0 to cancel', '15');
      if (choice !== null) {
        const mins = parseInt(choice, 10);
        if (!isNaN(mins)) {
          this.audio.setSleepTimer(mins);
        }
      }
    });

    // Flashcard Flip
    document.getElementById('flashcard-wrapper')?.addEventListener('click', () => {
      this.toggleFlashcardFlip();
    });

    // SM-2 Review Rating Buttons
    document.querySelectorAll('.btn-sm2').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const quality = parseInt(btn.dataset.q, 10);
        await this.handleCardReview(quality);
      });
    });

    // Review all cards button
    document.getElementById('btn-review-all-cards')?.addEventListener('click', async () => {
      await this.fetchFlashcards(false); // fetch all
    });

    // AI Studio: Generate
    document.getElementById('btn-generate-ai')?.addEventListener('click', async () => {
      await this.handleAIGeneration();
    });

    // Sample Idea chips
    document.querySelectorAll('.btn-sample-idea').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('studio-input');
        if (input) input.value = btn.dataset.idea;
      });
    });

    // Settings Modal
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.openSettingsModal();
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.closeSettingsModal();
    });
    document.getElementById('btn-refresh-status')?.addEventListener('click', async () => {
      await this.fetchSystemStatus();
      alert('System connection refreshed!');
    });

    // Detail Modal actions
    document.getElementById('btn-close-detail')?.addEventListener('click', () => {
      this.closeDetailModal();
    });
    document.getElementById('btn-detail-start-listening')?.addEventListener('click', () => {
      if (this.selectedBook) {
        this.closeDetailModal();
        this.openReader(this.selectedBook, 1, true);
      }
    });
    document.getElementById('btn-detail-read-now')?.addEventListener('click', () => {
      if (this.selectedBook) {
        this.closeDetailModal();
        this.openReader(this.selectedBook, 1, false);
      }
    });
  }

  // --- Data Fetching & Sync ---

  async fetchProgress() {
    try {
      const res = await fetch('/api/progress');
      const data = await res.json();
      if (data.success && data.progress) {
        this.userState = data.progress;
        this.updateHabitUI();
      }
    } catch (err) {
      console.warn('[App] Error fetching progress:', err);
    }
  }

  async fetchBooks() {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      if (data.success && Array.isArray(data.books)) {
        this.books = data.books;
        this.renderBooksGrid('today-book-grid');
        this.renderBooksGrid('library-book-grid');
        
        const countLabel = document.getElementById('library-count-label');
        if (countLabel) countLabel.innerText = `${this.books.length} Titles`;

        // Update hero card if available
        if (this.books.length > 0) {
          const hero = this.books[0];
          document.getElementById('hero-title').innerText = hero.title;
          document.getElementById('hero-author').innerText = hero.author;
          document.getElementById('hero-synopsis').innerText = hero.synopsis || '';
        }
      }
    } catch (err) {
      console.warn('[App] Error fetching books:', err);
    }
  }

  async fetchFlashcards(dueOnly = true) {
    try {
      const res = await fetch(`/api/flashcards?due=${dueOnly}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.cards)) {
        this.dueCards = data.cards;
        this.currentCardIdx = 0;
        this.isCardFlipped = false;
        this.renderCurrentFlashcard();

        // Update stat badges
        document.getElementById('stat-due-count').innerText = data.dueCount || this.dueCards.length;
        document.getElementById('stat-mastered-count').innerText = this.userState.flashcardStats?.masteredCards || 0;
        document.getElementById('stat-reviewed-count').innerText = this.userState.flashcardStats?.totalReviewed || 0;
      }
    } catch (err) {
      console.warn('[App] Error fetching flashcards:', err);
    }
  }

  async fetchShorts() {
    try {
      const res = await fetch('/api/shorts');
      const data = await res.json();
      if (data.success && Array.isArray(data.shorts)) {
        this.shorts = data.shorts;
        this.renderShorts();
      }
    } catch (err) {
      console.warn('[App] Error fetching shorts:', err);
    }
  }

  async fetchSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && data.upstash) {
        const badge = document.getElementById('status-upstash-badge');
        if (badge) {
          if (data.upstash.connected) {
            badge.innerText = 'Connected (Upstash Redis Cloud)';
            badge.style.color = '#34D399';
          } else {
            badge.innerText = 'Local File System (data/books.json)';
            badge.style.color = '#F5C518';
          }
        }
      }
    } catch (err) {
      console.warn('[App] Status fetch error:', err);
    }
  }

  // --- Habit & Streak UI ---

  updateHabitUI() {
    const mins = Math.round(this.userState.todayMinutesConsumed || 0);
    const goal = this.userState.dailyGoalMinutes || 15;
    const streak = this.userState.streak || 1;

    document.getElementById('stat-today-mins').innerText = mins;
    document.getElementById('streak-counter-val').innerText = streak;
    document.getElementById('settings-streak-val').innerText = streak;
    document.getElementById('settings-total-mins').innerText = Math.round(this.userState.totalMinutesRead || 0);

    const percent = Math.min(100, Math.round((mins / goal) * 100));
    document.getElementById('goal-percent-text').innerText = `${percent}%`;

    // Circular SVG Progress: Circumference = 2 * PI * 24 ≈ 150.8
    const circumference = 150.8;
    const offset = circumference - (percent / 100) * circumference;
    const ring = document.getElementById('svg-goal-ring');
    if (ring) ring.style.strokeDashoffset = offset;

    const cheerText = document.getElementById('goal-cheer-text');
    if (cheerText) {
      if (percent >= 100) {
        cheerText.innerText = '🎉 Daily target completed! Habit streak protected.';
      } else {
        cheerText.innerText = `${goal - mins} more minutes to achieve your daily target.`;
      }
    }
  }

  // --- Book Rendering & Details ---

  renderBooksGrid(containerId, searchQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filtered = this.books;
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter((b) => b.category === this.activeCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery) ||
          b.author.toLowerCase().includes(searchQuery) ||
          (b.synopsis && b.synopsis.toLowerCase().includes(searchQuery))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 14px;">
          No book summaries found for this selection.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (book) => `
        <div class="book-card" data-book-id="${book.id}">
          <div class="book-card-spine" style="background-color: ${book.coverAccent || '#F5C518'};"></div>
          <div class="book-card-body">
            <div class="book-card-category">${book.category || 'Nonfiction'}</div>
            <div class="book-card-title">${book.title}</div>
            <div class="book-card-author">${book.author}</div>
            <div class="book-card-footer">
              <span>${book.readTimeMin || 15} mins · ${book.chapterCount || 5} chapters</span>
              <span style="color: var(--brand-amber); font-weight: 600;">Explore →</span>
            </div>
          </div>
        </div>
      `
      )
      .join('');

    container.querySelectorAll('.book-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const bookId = card.getAttribute('data-book-id');
        await this.showBookDetails(bookId);
      });
    });
  }

  async showBookDetails(bookId) {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      const data = await res.json();
      if (!data.success || !data.book) return;

      this.selectedBook = data.book;
      const b = this.selectedBook;

      document.getElementById('detail-title').innerText = b.title;
      document.getElementById('detail-author').innerText = b.author;
      document.getElementById('detail-category').innerText = b.category || 'Nonfiction';
      document.getElementById('detail-synopsis').innerText = b.synopsis || '';

      const takeawaysContainer = document.getElementById('detail-takeaways');
      if (takeawaysContainer) {
        takeawaysContainer.innerHTML = (b.keyTakeaways || [])
          .map((t) => `<li style="margin-bottom: 6px;">${t}</li>`)
          .join('');
      }

      const chaptersContainer = document.getElementById('detail-chapters-list');
      if (chaptersContainer) {
        chaptersContainer.innerHTML = (b.chapters || [])
          .map(
            (c) => `
            <div style="background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
              <span><strong>${c.chapterIndex}.</strong> ${c.title}</span>
              <span style="font-size: 11px; color: var(--text-muted);">~3 min</span>
            </div>
          `
          )
          .join('');
      }

      document.getElementById('book-detail-modal').classList.add('is-active');
    } catch (err) {
      console.warn('[App] Error opening book detail:', err);
    }
  }

  closeDetailModal() {
    document.getElementById('book-detail-modal').classList.remove('is-active');
  }

  openSettingsModal() {
    document.getElementById('settings-modal').classList.add('is-active');
  }

  closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('is-active');
  }

  // --- Audio Reader & Synchronized Playback ---

  async openReader(book, chapterIndex = 1, autoPlay = true) {
    // If book is a shallow object without chapters, fetch full book
    if (!book.chapters) {
      const res = await fetch(`/api/books/${book.id}`);
      const data = await res.json();
      if (data.success && data.book) {
        book = data.book;
      }
    }

    this.audio.loadBook(book, chapterIndex);
    this.renderReaderUI(book, chapterIndex);
    this.openReaderModal();

    if (autoPlay) {
      this.audio.play();
    }
  }

  renderReaderUI(book, chapterIndex) {
    document.getElementById('reader-book-title').innerText = book.title;
    document.getElementById('reader-author-name').innerText = book.author;

    // Mini Player bar update
    document.getElementById('mini-book-title').innerText = book.title;
    const curChapter = book.chapters?.find((c) => c.chapterIndex === chapterIndex) || book.chapters?.[0];
    document.getElementById('mini-chapter-title').innerText = curChapter
      ? `Ch ${curChapter.chapterIndex}: ${curChapter.title}`
      : '';
    document.getElementById('mini-player-bar').style.display = 'flex';

    // Chapter Tab pills
    const tabsContainer = document.getElementById('reader-chapter-tabs');
    if (tabsContainer && Array.isArray(book.chapters)) {
      tabsContainer.innerHTML = book.chapters
        .map(
          (c) => `
          <button class="chapter-tab-pill ${c.chapterIndex === chapterIndex ? 'active' : ''}" data-ch="${c.chapterIndex}">
            Ch ${c.chapterIndex}
          </button>
        `
        )
        .join('');

      tabsContainer.querySelectorAll('.chapter-tab-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          const chNum = parseInt(pill.dataset.ch, 10);
          this.audio.setChapter(chNum);
        });
      });
    }

    // Render Paragraphs
    const textContainer = document.getElementById('reader-text-container');
    if (textContainer && curChapter) {
      textContainer.innerHTML = (this.audio.paragraphs || [])
        .map(
          (p, idx) => `
          <p class="${idx === 0 ? 'sentence-active' : ''}" data-para-idx="${idx}">${p}</p>
        `
        )
        .join('');

      textContainer.querySelectorAll('p').forEach((pEl) => {
        pEl.addEventListener('click', () => {
          const pIdx = parseInt(pEl.dataset.paraIdx, 10);
          this.audio.jumpToParagraph(pIdx);
        });
      });
    }
  }

  handleAudioStateChange(state) {
    const playBtnIcon = state.isPlaying ? icons.pause(24) : icons.play(24);
    const miniPlayIcon = state.isPlaying ? icons.pause(18) : icons.play(18);

    const deckPlay = document.getElementById('icon-deck-play');
    if (deckPlay) deckPlay.innerHTML = playBtnIcon;

    const miniPlay = document.getElementById('mini-play-icon');
    if (miniPlay) miniPlay.innerHTML = miniPlayIcon;

    if (state.chapter) {
      document.getElementById('mini-chapter-title').innerText = `Ch ${state.chapter.chapterIndex}: ${state.chapter.title}`;

      // Update active chapter pill
      document.querySelectorAll('.chapter-tab-pill').forEach((pill) => {
        pill.classList.toggle('active', parseInt(pill.dataset.ch, 10) === state.chapter.chapterIndex);
      });
    }

    if (state.totalParagraphs && state.totalParagraphs > 0) {
      const progressPercent = Math.min(100, Math.round(((state.paragraphIdx + 1) / state.totalParagraphs) * 100));
      const miniFill = document.getElementById('mini-progress-fill');
      if (miniFill) miniFill.style.width = `${progressPercent}%`;

      const scrubber = document.getElementById('reader-scrubber');
      if (scrubber) scrubber.value = progressPercent;
    }
  }

  handleSentenceChange(idx) {
    const container = document.getElementById('reader-text-container');
    if (!container) return;

    container.querySelectorAll('p').forEach((pEl, i) => {
      pEl.classList.toggle('sentence-active', i === idx);
      if (i === idx) {
        pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  async handleProgressUpdate(data) {
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.success && resData.progress) {
        this.userState = resData.progress;
        this.updateHabitUI();
      }
    } catch (e) {
      console.warn('[Progress] Sync error:', e);
    }
  }

  openReaderModal() {
    document.getElementById('reader-modal').classList.add('is-open');
  }

  closeReaderModal() {
    document.getElementById('reader-modal').classList.remove('is-open');
  }

  // --- Spaced Repetition (SM-2 Flashcards) ---

  toggleFlashcardFlip() {
    const inner = document.getElementById('flashcard-inner');
    if (inner) {
      this.isCardFlipped = !this.isCardFlipped;
      inner.classList.toggle('is-flipped', this.isCardFlipped);
    }
  }

  renderCurrentFlashcard() {
    const deckContainer = document.getElementById('flashcard-deck-container');
    const emptyState = document.getElementById('flashcard-completed-state');

    if (!this.dueCards || this.dueCards.length === 0 || this.currentCardIdx >= this.dueCards.length) {
      if (deckContainer) deckContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (deckContainer) deckContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    const card = this.dueCards[this.currentCardIdx];
    this.isCardFlipped = false;
    document.getElementById('flashcard-inner')?.classList.remove('is-flipped');

    document.getElementById('card-book-tag').innerText = card.bookTitle || 'Insight Gem';
    document.getElementById('card-question-text').innerText = card.front;
    document.getElementById('card-answer-text').innerText = card.back;
  }

  async handleCardReview(quality) {
    if (this.currentCardIdx >= this.dueCards.length) return;
    const card = this.dueCards[this.currentCardIdx];

    try {
      await fetch(`/api/flashcards/${card.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality })
      });

      this.currentCardIdx++;
      this.renderCurrentFlashcard();

      // Refresh counters
      const remaining = Math.max(0, this.dueCards.length - this.currentCardIdx);
      document.getElementById('stat-due-count').innerText = remaining;
      this.userState.flashcardStats = this.userState.flashcardStats || {};
      this.userState.flashcardStats.totalReviewed = (this.userState.flashcardStats.totalReviewed || 0) + 1;
      document.getElementById('stat-reviewed-count').innerText = this.userState.flashcardStats.totalReviewed;
    } catch (err) {
      console.warn('[Review] SM-2 review submit error:', err);
    }
  }

  // --- Shorts Vertical Feed ---

  renderShorts() {
    const container = document.getElementById('shorts-reel-container');
    if (!container) return;

    if (this.shorts.length === 0) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No insights available yet.</div>';
      return;
    }

    container.innerHTML = this.shorts
      .map((item, idx) => {
        if (item.type === 'quiz') {
          return `
          <div class="short-card" data-short-idx="${idx}">
            <div class="short-header">
              <span class="card-label-badge" style="color: var(--accent-purple);">Interactive Scenario Quiz</span>
              <span class="short-book-meta">${item.bookTitle}</span>
            </div>
            
            <div style="margin: auto 0;">
              <div class="quiz-scenario">${item.quiz.scenario}</div>
              <div class="quiz-options-list">
                ${item.quiz.options
                  .map(
                    (opt, optIdx) => `
                  <button class="quiz-option" data-correct="${optIdx === item.quiz.correctIndex}">
                    ${opt}
                  </button>
                `
                  )
                  .join('')}
              </div>
              <div class="quiz-explanation">
                <strong>Insight:</strong> ${item.quiz.explanation}
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); text-align: center;">
              Swipe down for next microlearning card ↓
            </div>
          </div>
        `;
        }

        return `
        <div class="short-card" data-short-idx="${idx}">
          <div class="short-header">
            <span class="card-label-badge">${item.tag || 'Mindset'}</span>
            <span class="short-book-meta">${item.bookTitle} · ${item.author}</span>
          </div>

          <div class="short-quote-body">
            "${item.quote}"
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
            <button class="btn-secondary btn-listen-from-short" data-book-id="${item.bookId}">
              ${icons.play(14)} Listen Book
            </button>
            <span style="font-size: 11px; color: var(--text-muted);">Swipe for more ↓</span>
          </div>
        </div>
      `;
      })
      .join('');

    // Bind Quiz Option Clicks
    container.querySelectorAll('.quiz-option').forEach((optBtn) => {
      optBtn.addEventListener('click', () => {
        const isCorrect = optBtn.getAttribute('data-correct') === 'true';
        const card = optBtn.closest('.short-card');

        // highlight options
        card.querySelectorAll('.quiz-option').forEach((btn) => {
          if (btn.getAttribute('data-correct') === 'true') {
            btn.classList.add('correct');
          } else {
            btn.classList.add('incorrect');
          }
          btn.disabled = true;
        });

        // show explanation
        const expl = card.querySelector('.quiz-explanation');
        if (expl) expl.style.display = 'block';
      });
    });

    // Bind Listen from short
    container.querySelectorAll('.btn-listen-from-short').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const bId = btn.dataset.bookId;
        const book = this.books.find((b) => b.id === bId);
        if (book) {
          await this.openReader(book, 1, true);
        }
      });
    });
  }

  // --- AI Ingestion Studio (Gemini 3.5 Flash Lite) ---

  async handleAIGeneration() {
    const inputEl = document.getElementById('studio-input');
    const langEl = document.getElementById('studio-language');
    const btn = document.getElementById('btn-generate-ai');
    const statusBox = document.getElementById('studio-status-box');
    const statusText = document.getElementById('studio-status-text');

    const inputVal = inputEl?.value.trim();
    if (!inputVal) {
      alert('Please enter a book title, topic, or podcast transcript first.');
      inputEl?.focus();
      return;
    }

    btn.disabled = true;
    btn.style.opacity = '0.6';
    statusBox.style.display = 'block';
    statusText.innerText = 'Calling Gemini 3.5 Flash Lite to structure chapters, SM-2 cards & quizzes...';

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputVal,
          language: langEl ? langEl.value : 'English'
        })
      });

      const data = await res.json();
      if (!data.success || !data.book) {
        throw new Error(data.error || 'Failed to synthesize book');
      }

      statusText.innerText = `🎉 Successfully generated "${data.book.title}"!`;

      // Refresh catalog and flashcards
      await this.fetchBooks();
      await this.fetchFlashcards();
      await this.fetchShorts();

      inputEl.value = '';

      setTimeout(() => {
        statusBox.style.display = 'none';
        btn.disabled = false;
        btn.style.opacity = '1';

        // Switch to today tab and open reader
        document.getElementById('nav-today')?.click();
        this.openReader(data.book, 1, true);
      }, 1200);
    } catch (err) {
      alert(`AI Generation Failed: ${err.message}`);
      statusBox.style.display = 'none';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HeadwayApp();
});
