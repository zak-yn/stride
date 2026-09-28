/**
 * Headway Synchronized Audio & Reader Engine
 * Web Speech API + HTML5 Audio + Lockscreen MediaSession API + SM-2 Sync
 */

export class AudioEngine {
  constructor({ onStateChange, onSentenceChange, onProgressUpdate }) {
    this.onStateChange = onStateChange || (() => {});
    this.onSentenceChange = onSentenceChange || (() => {});
    this.onProgressUpdate = onProgressUpdate || (() => {});

    this.currentBook = null;
    this.currentChapterIndex = 1;
    this.isPlaying = false;
    this.playbackRate = 1.0;
    this.paragraphs = [];
    this.activeParagraphIdx = 0;
    this.utterance = null;
    this.sleepTimerId = null;
    this.accumulatedSeconds = 0;
    this.progressSyncInterval = null;

    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this._initMediaSession();
  }

  _initMediaSession() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('seekforward', () => this.skip(15));
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-15));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevChapter());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextChapter());
    }
  }

  _updateMediaSessionMetadata() {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && this.currentBook) {
      const chapter = this.getCurrentChapter();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter ? `${chapter.chapterIndex}. ${chapter.title}` : this.currentBook.title,
        artist: this.currentBook.author,
        album: this.currentBook.title,
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  loadBook(book, chapterIndex = 1) {
    this.stop();
    this.currentBook = book;
    this.currentChapterIndex = Number(chapterIndex) || 1;
    this.activeParagraphIdx = 0;
    this.accumulatedSeconds = 0;

    const chapter = this.getCurrentChapter();
    if (chapter) {
      // Split chapter into readable paragraphs
      this.paragraphs = chapter.content
        .split(/(?<=[.!?。！？])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
    } else {
      this.paragraphs = [];
    }

    this._updateMediaSessionMetadata();
    this.onStateChange({
      book: this.currentBook,
      chapter: this.getCurrentChapter(),
      isPlaying: this.isPlaying,
      rate: this.playbackRate,
      paragraphIdx: this.activeParagraphIdx,
      totalParagraphs: this.paragraphs.length
    });
  }

  getCurrentChapter() {
    if (!this.currentBook || !Array.isArray(this.currentBook.chapters)) return null;
    return this.currentBook.chapters.find(c => c.chapterIndex === this.currentChapterIndex) || this.currentBook.chapters[0];
  }

  play() {
    if (!this.currentBook) return;
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPlaying = true;
      this._startProgressLogger();
      this.onStateChange({ isPlaying: true });
      return;
    }
    this._speakParagraph(this.activeParagraphIdx);
  }

  pause() {
    if (this.synth) {
      this.synth.pause();
    }
    this.isPlaying = false;
    this._stopProgressLogger();
    this.onStateChange({ isPlaying: false });
  }

  resume() {
    this.play();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this._stopProgressLogger();
    this.onStateChange({ isPlaying: false });
  }

  _speakParagraph(idx) {
    if (!this.synth) return;
    this.synth.cancel();

    if (idx >= this.paragraphs.length) {
      // Chapter finished: auto-advance or pause
      if (this.currentChapterIndex < (this.currentBook.chapters?.length || 1)) {
        this.nextChapter();
      } else {
        this.stop();
      }
      return;
    }

    this.activeParagraphIdx = idx;
    const text = this.paragraphs[idx];
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = this.playbackRate;
    this.utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = this.synth.getVoices();
    const isJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(text);
    if (isJapanese) {
      const jpVoice = voices.find(v => v.lang.startsWith('ja'));
      if (jpVoice) this.utterance.voice = jpVoice;
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium')));
      if (enVoice) this.utterance.voice = enVoice;
    }

    this.utterance.onstart = () => {
      this.isPlaying = true;
      this._startProgressLogger();
      this.onSentenceChange(this.activeParagraphIdx);
      this.onStateChange({
        isPlaying: true,
        paragraphIdx: this.activeParagraphIdx,
        totalParagraphs: this.paragraphs.length
      });
    };

    this.utterance.onend = () => {
      if (this.isPlaying) {
        this._speakParagraph(this.activeParagraphIdx + 1);
      }
    };

    this.utterance.onerror = (e) => {
      console.warn('[AudioEngine] Utterance error:', e);
      this.isPlaying = false;
      this._stopProgressLogger();
      this.onStateChange({ isPlaying: false });
    };

    this.synth.speak(this.utterance);
  }

  jumpToParagraph(idx) {
    if (idx >= 0 && idx < this.paragraphs.length) {
      this.activeParagraphIdx = idx;
      if (this.isPlaying) {
        this._speakParagraph(idx);
      } else {
        this.onSentenceChange(idx);
      }
    }
  }

  setRate(rate) {
    this.playbackRate = Number(rate) || 1.0;
    if (this.isPlaying) {
      this._speakParagraph(this.activeParagraphIdx);
    }
    this.onStateChange({ rate: this.playbackRate });
  }

  skip(deltaSec) {
    // Jump 1-2 paragraphs back or forward as approximation
    const deltaParas = deltaSec > 0 ? 1 : -1;
    const target = Math.max(0, Math.min(this.paragraphs.length - 1, this.activeParagraphIdx + deltaParas));
    this.jumpToParagraph(target);
  }

  setChapter(chapterIndex) {
    if (this.currentBook) {
      this.loadBook(this.currentBook, chapterIndex);
      this.play();
    }
  }

  nextChapter() {
    if (!this.currentBook) return;
    const total = this.currentBook.chapters?.length || 1;
    if (this.currentChapterIndex < total) {
      this.setChapter(this.currentChapterIndex + 1);
    }
  }

  prevChapter() {
    if (!this.currentBook) return;
    if (this.currentChapterIndex > 1) {
      this.setChapter(this.currentChapterIndex - 1);
    }
  }

  setSleepTimer(minutes) {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    if (minutes > 0) {
      this.sleepTimerId = setTimeout(() => {
        this.pause();
        alert('💤 Sleep timer completed: audio paused.');
      }, minutes * 60 * 1000);
    }
  }

  _startProgressLogger() {
    if (this.progressSyncInterval) return;
    this.progressSyncInterval = setInterval(() => {
      if (this.isPlaying) {
        this.accumulatedSeconds += 10;
        // Sync 0.2 min (12 sec) progress
        this.onProgressUpdate({
          minutes: 0.2,
          bookId: this.currentBook?.id,
          chapterIndex: this.currentChapterIndex
        });
      }
    }, 12000);
  }

  _stopProgressLogger() {
    if (this.progressSyncInterval) {
      clearInterval(this.progressSyncInterval);
      this.progressSyncInterval = null;
    }
  }
}
