/**
 * Stride Synchronized Audio & Reader Engine
 * Web Speech API + HTML5 Audio + Lockscreen MediaSession API + SM-2 Sync
 * Pure Native English/Japanese Voice Selection (Eliminating Cross-Language Accents)
 */

export class AudioEngine {
  constructor({ onStateChange, onSentenceChange, onProgressUpdate, onVoicesReady }) {
    this.onStateChange = onStateChange || (() => {});
    this.onSentenceChange = onSentenceChange || (() => {});
    this.onProgressUpdate = onProgressUpdate || (() => {});
    this.onVoicesReady = onVoicesReady || (() => {});

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

    this.selectedVoiceName = typeof localStorage !== 'undefined'
      ? localStorage.getItem('stride_narrator_voice')
      : null;

    this.availableVoices = [];
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

    this._initVoices();
    this._initMediaSession();
  }

  _initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.availableVoices = this.synth.getVoices();
      if (this.availableVoices.length > 0) {
        this.onVoicesReady(this.getGroupedVoices());
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'onvoiceschanged' in this.synth) {
      this.synth.onvoiceschanged = loadVoices;
    }
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

  getGroupedVoices() {
    const all = this.synth ? this.synth.getVoices() : [];
    const enList = all.filter(v => v.lang.startsWith('en'));
    const jaList = all.filter(v => v.lang.startsWith('ja'));

    const formatLabel = (v) => {
      let flag = '🌐';
      if (v.lang.includes('GB') || v.lang.includes('UK')) flag = '🇬🇧';
      else if (v.lang.includes('US')) flag = '🇺🇸';
      else if (v.lang.includes('AU')) flag = '🇦🇺';
      else if (v.lang.includes('CA')) flag = '🇨🇦';
      else if (v.lang.startsWith('ja')) flag = '🇯🇵';

      // Clean voice name
      const cleanName = v.name
        .replace(/Microsoft\s+/g, '')
        .replace(/\s+Desktop/g, '')
        .replace(/\s+Online\s+\(Natural\)/g, ' (Natural)')
        .replace(/\s+-\s+English\s+\(United\s+States\)/g, ' (US)')
        .replace(/\s+-\s+English\s+\(United\s+Kingdom\)/g, ' (UK)')
        .replace(/\s+-\s+English\s+\(Great\s+Britain\)/g, ' (UK)')
        .replace(/\s+-\s+Japanese\s+\(Japan\)/g, ' (JP)');

      return `${flag} ${cleanName}`;
    };

    return {
      english: enList.map(v => ({ name: v.name, lang: v.lang, label: formatLabel(v) })),
      japanese: jaList.map(v => ({ name: v.name, lang: v.lang, label: formatLabel(v) })),
      current: this.selectedVoiceName
    };
  }

  setVoice(voiceName) {
    this.selectedVoiceName = voiceName;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('stride_narrator_voice', voiceName);
    }
    // If currently playing, restart current paragraph with new voice
    if (this.isPlaying) {
      this._speakParagraph(this.activeParagraphIdx);
    }
  }

  sampleVoice(voiceName) {
    if (!this.synth) return;
    this.synth.cancel();

    const voices = this.synth.getVoices();
    const v = voices.find(item => item.name === voiceName);
    if (!v) return;

    const isJa = v.lang.startsWith('ja');
    const sampleText = isJa
      ? 'こんにちは。こちらは Stride の日本語音声ナレーターです。'
      : 'Hello! I am your narrator for Stride microlearning summaries.';

    const utt = new SpeechSynthesisUtterance(sampleText);
    utt.voice = v;
    utt.lang = v.lang;
    utt.rate = this.playbackRate;
    utt.pitch = 1.0;
    this.synth.speak(utt);
  }

  loadBook(book, chapterIndex = 1) {
    this.stop();
    this.currentBook = book;
    this.currentChapterIndex = Number(chapterIndex) || 1;
    this.activeParagraphIdx = 0;
    this.accumulatedSeconds = 0;

    const chapter = this.getCurrentChapter();
    if (chapter) {
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

  _resolveBestVoice(text) {
    const voices = this.synth ? this.synth.getVoices() : [];
    const isJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(text);

    if (isJapanese) {
      // 1. User selected Japanese voice
      if (this.selectedVoiceName) {
        const userChoice = voices.find(v => v.name === this.selectedVoiceName && v.lang.startsWith('ja'));
        if (userChoice) return { voice: userChoice, lang: userChoice.lang };
      }
      // 2. Preferred Japanese voices
      const preferredJa = ['Nanami', 'Keita', 'Haruka', 'Ayumi', 'Sayaka', 'Ichiro'];
      for (const name of preferredJa) {
        const found = voices.find(v => v.lang.startsWith('ja') && v.name.includes(name));
        if (found) return { voice: found, lang: found.lang };
      }
      // 3. Any Japanese voice
      const anyJa = voices.find(v => v.lang.startsWith('ja'));
      return { voice: anyJa || null, lang: 'ja-JP' };
    }

    // === ENGLISH NARRATION ===
    // Priority 1: User explicitly chosen English voice
    if (this.selectedVoiceName) {
      const userChoice = voices.find(v => v.name === this.selectedVoiceName && v.lang.startsWith('en'));
      if (userChoice) return { voice: userChoice, lang: userChoice.lang };
    }

    // Priority 2: Natural / Neural voices
    const neural = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')));
    if (neural) return { voice: neural, lang: neural.lang };

    // Priority 3: Renowned Native UK / US system voices
    const preferredNames = ['Hazel', 'George', 'Susan', 'Zira', 'David', 'Samantha', 'Daniel', 'Guy', 'Ryan', 'Google US', 'Google UK'];
    for (const name of preferredNames) {
      const match = voices.find(v => v.lang.startsWith('en') && v.name.includes(name));
      if (match) return { voice: match, lang: match.lang };
    }

    // Priority 4: Any voice with English locale
    const standardEn = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en'));
    if (standardEn) return { voice: standardEn, lang: standardEn.lang };

    // FALLBACK: NEVER assign a Japanese voice to English text!
    return { voice: null, lang: 'en-US' };
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

    // Resolve optimal native voice and language
    const { voice, lang } = this._resolveBestVoice(text);
    this.utterance.lang = lang;
    if (voice) {
      this.utterance.voice = voice;
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
