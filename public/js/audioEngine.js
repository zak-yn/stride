/**
 * Stride Synchronized Studio Audio & Reader Engine
 * Robust Architecture:
 * 1. Microsoft Azure Studio Neural TTS (/api/tts) for ultra-natural, human-grade audiobook narration.
 * 2. Single HTMLAudioElement pipeline with session IDs to prevent duplicate playback & race conditions.
 * 3. Low-priority HTTP cache preloading for zero-latency, seamless gapless paragraph playback.
 * 4. Absolute mutual exclusion between Studio Audio and legacy SpeechSynthesis (never overlaps).
 * 5. Lockscreen MediaSession API + SM-2 habit tracking.
 */

export const STUDIO_NEURAL_VOICES = [
  {
    id: 'en-US-AndrewNeural',
    name: 'Andrew (US Studio Narrator)',
    label: '🇺🇸 Andrew (US Studio HD)',
    lang: 'en-US',
    accent: 'US',
    gender: 'Male',
    style: 'Deep, engaging & articulate audiobook narrator',
    isStudio: true,
    isDefault: true
  },
  {
    id: 'en-US-AvaNeural',
    name: 'Ava (US Warm & Expressive)',
    label: '🇺🇸 Ava (US Studio HD)',
    lang: 'en-US',
    accent: 'US',
    gender: 'Female',
    style: 'Warm, natural & modern storytelling',
    isStudio: true
  },
  {
    id: 'en-US-BrianNeural',
    name: 'Brian (US Authoritative)',
    label: '🇺🇸 Brian (US Studio HD)',
    lang: 'en-US',
    accent: 'US',
    gender: 'Male',
    style: 'Clear, crisp executive cadence',
    isStudio: true
  },
  {
    id: 'en-US-EmmaNeural',
    name: 'Emma (US Conversational)',
    label: '🇺🇸 Emma (US Studio HD)',
    lang: 'en-US',
    accent: 'US',
    gender: 'Female',
    style: 'Friendly, bright & engaging',
    isStudio: true
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (UK BBC Accent)',
    label: '🇬🇧 Ryan (UK BBC HD)',
    lang: 'en-GB',
    accent: 'UK',
    gender: 'Male',
    style: 'Refined, intellectual British narrator',
    isStudio: true
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (UK Editorial)',
    label: '🇬🇧 Sonia (UK Editorial HD)',
    lang: 'en-GB',
    accent: 'UK',
    gender: 'Female',
    style: 'Classic British documentary narrator',
    isStudio: true
  },
  {
    id: 'ja-JP-NanamiNeural',
    name: '七海 (Nanami 日本語ナレーション)',
    label: '🇯🇵 七海 (Nanami Studio HD)',
    lang: 'ja-JP',
    accent: 'JP',
    gender: 'Female',
    style: '澄んだ自然で知的なトーン',
    isStudio: true
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: '圭太 (Keita 日本語ナレーション)',
    label: '🇯🇵 圭太 (Keita Studio HD)',
    lang: 'ja-JP',
    accent: 'JP',
    gender: 'Male',
    style: '落ち着きのある深みのあるトーン',
    isStudio: true
  }
];

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
    this.accumulatedSeconds = 0;
    this.progressSyncInterval = null;

    // Concurrency & state protection
    this.playSessionId = 0;
    this.isTransitioning = false;

    // Single dedicated HTMLAudioElement for all playback
    this.audioEl = typeof Audio !== 'undefined' ? new Audio() : null;
    this.sampleAudio = null;

    // Browser SpeechSynthesis fallback
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.activeUtterance = null;

    // Selected Voice ID (defaults to 'en-US-AndrewNeural')
    const savedVoice = typeof localStorage !== 'undefined'
      ? localStorage.getItem('stride_narrator_voice')
      : null;
    this.selectedVoiceName = savedVoice || 'en-US-AndrewNeural';

    this.useStudioNeural = true;
    this.availableVoices = [];

    this._initAudioElement();
    this._initVoices();
    this._initMediaSession();
  }

  _initAudioElement() {
    if (!this.audioEl) return;

    this.audioEl.addEventListener('play', () => {
      this.isPlaying = true;
      this.isTransitioning = false;
      this._startProgressLogger();
      this.onSentenceChange(this.activeParagraphIdx);
      this.onStateChange({
        isPlaying: true,
        paragraphIdx: this.activeParagraphIdx,
        totalParagraphs: this.paragraphs.length
      });

      // Low-priority HTTP prefetch of next paragraph to ensure 0ms gapless transition
      this._prefetchParagraph(this.activeParagraphIdx + 1);
    });

    this.audioEl.addEventListener('ended', () => {
      if (!this.isTransitioning) {
        this._advanceToNextParagraph(this.activeParagraphIdx + 1);
      }
    });

    this.audioEl.addEventListener('pause', () => {
      // If the audio paused because it naturally reached the end, ignore so ended event advances cleanly
      if (this.audioEl.ended) return;

      // Ignore transient pause events fired during src switching
      if (!this.isTransitioning) {
        this.isPlaying = false;
        this._stopProgressLogger();
        this.onStateChange({ isPlaying: false });
      }
    });

    this.audioEl.addEventListener('error', (e) => {
      console.warn('[AudioEngine] HTMLAudioElement error event:', e);
      if (this.isPlaying && !this.isTransitioning) {
        this._speakWithSpeechSynthesis(this.activeParagraphIdx, this.paragraphs[this.activeParagraphIdx]);
      }
    });
  }

  async _initVoices() {
    try {
      const res = await fetch('/api/tts/voices');
      const data = await res.json();
      if (data.success && data.voices) {
        // Voices active on server
      }
    } catch (e) {
      // Offline
    }

    if (this.synth) {
      const loadLocalVoices = () => {
        this.availableVoices = this.synth.getVoices();
        this.onVoicesReady(this.getGroupedVoices());
      };
      loadLocalVoices();
      if (typeof window !== 'undefined' && 'onvoiceschanged' in this.synth) {
        this.synth.onvoiceschanged = loadLocalVoices;
      }
    }

    this.onVoicesReady(this.getGroupedVoices());
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
        album: 'Stride Microlearning Books & Audio',
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  getGroupedVoices() {
    const studioEn = STUDIO_NEURAL_VOICES.filter(v => v.lang.startsWith('en'));
    const studioJa = STUDIO_NEURAL_VOICES.filter(v => v.lang.startsWith('ja'));
    const allLocal = this.synth ? this.synth.getVoices() : [];

    return {
      studioEnglish: studioEn,
      studioJapanese: studioJa,
      localEnglish: allLocal.filter(v => v.lang.startsWith('en')).map(v => ({
        id: v.name,
        name: v.name,
        label: `${v.name} (${v.lang})`,
        lang: v.lang,
        isStudio: false
      })),
      localJapanese: allLocal.filter(v => v.lang.startsWith('ja')).map(v => ({
        id: v.name,
        name: v.name,
        label: `${v.name} (${v.lang})`,
        lang: v.lang,
        isStudio: false
      })),
      current: this.selectedVoiceName
    };
  }

  setVoice(voiceId) {
    this.selectedVoiceName = voiceId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('stride_narrator_voice', voiceId);
    }
    // If actively playing, restart current paragraph with new narrator
    if (this.isPlaying && this.activeParagraphIdx >= 0) {
      this._speakParagraph(this.activeParagraphIdx);
    }
  }

  sampleVoice(voiceId) {
    this.stop(); // Halt any existing playback cleanly

    const isStudio = STUDIO_NEURAL_VOICES.some(v => v.id === voiceId);
    const isJa = voiceId.includes('ja') || voiceId.includes('Nanami') || voiceId.includes('Keita');
    const sampleText = isJa
      ? 'こんにちは。Strideのスタジオナレーターです。毎日の成長と読書をサポートします。'
      : 'Hello! I am your studio narrator for Stride. Daily microlearning made effortless and engaging.';

    if (isStudio) {
      if (this.sampleAudio) {
        this.sampleAudio.pause();
        this.sampleAudio = null;
      }
      const audioUrl = `/api/tts?text=${encodeURIComponent(sampleText)}&voice=${encodeURIComponent(voiceId)}`;
      this.sampleAudio = new Audio(audioUrl);
      this.sampleAudio.playbackRate = this.playbackRate;
      this.sampleAudio.play().catch(e => {
        if (e.name !== 'AbortError') console.warn('[AudioEngine] Sample play failed:', e);
      });
    } else if (this.synth) {
      this.synth.cancel();
      const voices = this.synth.getVoices();
      const v = voices.find(item => item.name === voiceId);
      const utt = new SpeechSynthesisUtterance(sampleText);
      if (v) utt.voice = v;
      utt.rate = this.playbackRate;
      this.synth.speak(utt);
    }
  }

  stopSample() {
    if (this.sampleAudio) {
      this.sampleAudio.pause();
      this.sampleAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterance = null;
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
      isPlaying: false,
      rate: this.playbackRate,
      paragraphIdx: 0,
      totalParagraphs: this.paragraphs.length
    });
  }

  getCurrentChapter() {
    if (!this.currentBook || !Array.isArray(this.currentBook.chapters)) return null;
    return this.currentBook.chapters.find(c => c.chapterIndex === this.currentChapterIndex) || this.currentBook.chapters[0];
  }

  play() {
    if (!this.currentBook || this.paragraphs.length === 0) return;

    // If audio is already loaded and paused mid-paragraph, simply resume it
    if (this.audioEl && this.audioEl.src && this.audioEl.paused && this.audioEl.currentTime > 0 && !this.audioEl.ended) {
      this.isPlaying = true;
      this.audioEl.play().catch(e => {
        if (e.name !== 'AbortError') {
          this._speakParagraph(this.activeParagraphIdx);
        }
      });
      return;
    }

    this._speakParagraph(this.activeParagraphIdx);
  }

  pause() {
    this.playSessionId++;
    this.isPlaying = false;
    this.isTransitioning = false;

    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterance = null;
    }
    this.stopSample();

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
    this.playSessionId++;
    this.isPlaying = false;
    this.isTransitioning = false;

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterance = null;
    }
    this.stopSample();

    this._stopProgressLogger();
    this.onStateChange({ isPlaying: false });
  }

  // Speaks a paragraph with guaranteed single-source execution
  _speakParagraph(idx) {
    if (idx < 0 || idx >= this.paragraphs.length) return;

    this.activeParagraphIdx = idx;
    const text = this.paragraphs[idx];

    // Absolute mutual exclusion: cancel browser speech synthesizer
    if (this.synth) {
      this.synth.cancel();
      this.activeUtterance = null;
    }

    const isStudioVoice = STUDIO_NEURAL_VOICES.some(v => v.id === this.selectedVoiceName);

    if (this.useStudioNeural && isStudioVoice) {
      this._speakWithStudioAudio(idx, text);
    } else {
      this._speakWithSpeechSynthesis(idx, text);
    }
  }

  _speakWithStudioAudio(idx, text) {
    if (!this.audioEl) {
      this._speakWithSpeechSynthesis(idx, text);
      return;
    }

    // Resolve voice based on language detection
    const hasJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(text);
    let voiceId = this.selectedVoiceName;
    if (hasJapanese && voiceId.startsWith('en')) {
      voiceId = 'ja-JP-NanamiNeural';
    } else if (!hasJapanese && voiceId.startsWith('ja')) {
      voiceId = 'en-US-AndrewNeural';
    }

    const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`;

    // Set transition state and bump session ID
    this.isTransitioning = true;
    this.isPlaying = true;
    const currentSession = ++this.playSessionId;

    this.onSentenceChange(idx);

    this.audioEl.playbackRate = this.playbackRate;

    // Check if audio src is already pointing to this URL
    const resolvedUrl = new URL(audioUrl, window.location.href).href;
    if (this.audioEl.src !== resolvedUrl) {
      this.audioEl.src = audioUrl;
    } else {
      this.audioEl.currentTime = 0;
    }

    this.audioEl.play().then(() => {
      if (this.playSessionId !== currentSession) return;
      this.isTransitioning = false;
    }).catch(err => {
      if (this.playSessionId !== currentSession) return;
      this.isTransitioning = false;

      // AbortError is normal when play() was superseded or paused by user. Do NOT trigger fallback!
      if (err.name === 'AbortError') {
        return;
      }

      console.warn('[Studio Audio] Play failed, falling back:', err);
      if (this.isPlaying) {
        this._speakWithSpeechSynthesis(idx, text);
      }
    });
  }

  _prefetchParagraph(nextIdx) {
    if (nextIdx >= this.paragraphs.length) return;
    const nextText = this.paragraphs[nextIdx];
    const hasJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(nextText);
    let voiceId = this.selectedVoiceName;
    if (hasJapanese && voiceId.startsWith('en')) {
      voiceId = 'ja-JP-NanamiNeural';
    } else if (!hasJapanese && voiceId.startsWith('ja')) {
      voiceId = 'en-US-AndrewNeural';
    }

    const nextUrl = `/api/tts?text=${encodeURIComponent(nextText)}&voice=${encodeURIComponent(voiceId)}`;
    if (typeof fetch !== 'undefined') {
      fetch(nextUrl, { priority: 'low' }).catch(() => {});
    }
  }

  _advanceToNextParagraph(nextIdx) {
    if (nextIdx >= this.paragraphs.length) {
      // Chapter complete: advance to next chapter if available
      const maxChapters = this.currentBook?.chapters?.length || 1;
      if (this.currentChapterIndex < maxChapters) {
        this.setChapter(this.currentChapterIndex + 1);
      } else {
        this.stop();
      }
      return;
    }

    this._speakParagraph(nextIdx);
  }

  _speakWithSpeechSynthesis(idx, text) {
    if (!this.synth) return;

    // Absolute mutual exclusion: pause HTMLAudioElement
    if (this.audioEl) {
      this.audioEl.pause();
    }

    this.synth.cancel();

    this.activeParagraphIdx = idx;
    this.activeUtterance = new SpeechSynthesisUtterance(text);
    this.activeUtterance.rate = this.playbackRate;
    this.activeUtterance.pitch = 1.0;

    const voices = this.synth.getVoices();
    const isJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(text);

    if (isJapanese) {
      this.activeUtterance.lang = 'ja-JP';
      const jv = voices.find(v => v.lang.startsWith('ja'));
      if (jv) this.activeUtterance.voice = jv;
    } else {
      this.activeUtterance.lang = 'en-US';
      const ev = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Hazel') || v.name.includes('Zira') || v.name.includes('Google')));
      if (ev) this.activeUtterance.voice = ev;
    }

    const currentSession = ++this.playSessionId;

    this.activeUtterance.onstart = () => {
      if (this.playSessionId !== currentSession) return;
      this.isPlaying = true;
      this._startProgressLogger();
      this.onSentenceChange(this.activeParagraphIdx);
      this.onStateChange({
        isPlaying: true,
        paragraphIdx: this.activeParagraphIdx,
        totalParagraphs: this.paragraphs.length
      });
    };

    this.activeUtterance.onend = () => {
      if (this.playSessionId !== currentSession) return;
      if (this.isPlaying) {
        this._advanceToNextParagraph(idx + 1);
      }
    };

    this.activeUtterance.onerror = (e) => {
      if (this.playSessionId !== currentSession) return;
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('[SpeechSynthesis] Error:', e);
      this.isPlaying = false;
      this._stopProgressLogger();
      this.onStateChange({ isPlaying: false });
    };

    this.synth.speak(this.activeUtterance);
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
    if (this.audioEl) {
      this.audioEl.playbackRate = this.playbackRate;
    }
    if (this.activeUtterance) {
      this.activeUtterance.rate = this.playbackRate;
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
    const maxChapters = this.currentBook.chapters?.length || 1;
    if (this.currentChapterIndex < maxChapters) {
      this.setChapter(this.currentChapterIndex + 1);
    } else {
      this.stop();
    }
  }

  prevChapter() {
    if (!this.currentBook) return;
    if (this.currentChapterIndex > 1) {
      this.setChapter(this.currentChapterIndex - 1);
    } else {
      this.jumpToParagraph(0);
    }
  }

  _startProgressLogger() {
    this._stopProgressLogger();
    this.progressSyncInterval = setInterval(() => {
      if (this.isPlaying) {
        this.accumulatedSeconds += 1;
        this.onProgressUpdate({
          seconds: this.accumulatedSeconds,
          bookId: this.currentBook?.id,
          chapterIndex: this.currentChapterIndex
        });
      }
    }, 1000);
  }

  _stopProgressLogger() {
    if (this.progressSyncInterval) {
      clearInterval(this.progressSyncInterval);
      this.progressSyncInterval = null;
    }
  }
}
