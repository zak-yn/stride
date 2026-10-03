/**
 * Stride Synchronized Studio Audio & Reader Engine
 * Hybrid Architecture:
 * 1. Microsoft Azure Studio Neural TTS (/api/tts) for ultra-natural, human-grade audiobook narration.
 * 2. High-speed lookahead paragraph preloader for zero-latency gapless playback.
 * 3. Fallback to Web Speech API when offline.
 * 4. Lockscreen MediaSession API + SM-2 Progress Sync.
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

    // Active HTML5 Audio Element for Studio Neural Playback
    this.currentAudio = null;
    this.sampleAudio = null;
    this.preloadedAudio = null;
    this.preloadedIdx = -1;

    // Browser SpeechSynthesis fallback
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.activeUtterance = null;

    // Selected Voice ID (defaults to 'en-US-AndrewNeural')
    const savedVoice = typeof localStorage !== 'undefined'
      ? localStorage.getItem('stride_narrator_voice')
      : null;
    this.selectedVoiceName = savedVoice || 'en-US-AndrewNeural';

    this.useStudioNeural = true; // Use studio neural TTS by default
    this.availableVoices = [];

    this._initVoices();
    this._initMediaSession();
  }

  async _initVoices() {
    // Try fetching updated voices list from server
    try {
      const res = await fetch('/api/tts/voices');
      const data = await res.json();
      if (data.success && data.voices) {
        // sync
      }
    } catch (e) {
      // offline or local
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
        album: this.currentBook.title,
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  getGroupedVoices() {
    // Studio Neural Voices
    const studioEn = STUDIO_NEURAL_VOICES.filter(v => v.lang.startsWith('en'));
    const studioJa = STUDIO_NEURAL_VOICES.filter(v => v.lang.startsWith('ja'));

    // Local system voices as secondary fallback
    const allLocal = this.synth ? this.synth.getVoices() : [];
    const localEn = allLocal.filter(v => v.lang.startsWith('en'));
    const localJa = allLocal.filter(v => v.lang.startsWith('ja'));

    const formatLocalLabel = (v) => {
      const isUk = v.lang.includes('GB') || v.lang.includes('UK');
      const flag = isUk ? '🇬🇧' : '🇺🇸';
      const cleanName = v.name
        .replace(/Microsoft\s+/g, '')
        .replace(/\s+Desktop/g, '');
      return `${flag} ${cleanName} (System)`;
    };

    return {
      studioEnglish: studioEn.map(v => ({ id: v.id, name: v.id, label: v.label, desc: v.style, isStudio: true })),
      studioJapanese: studioJa.map(v => ({ id: v.id, name: v.id, label: v.label, desc: v.style, isStudio: true })),
      localEnglish: localEn.slice(0, 4).map(v => ({ id: v.name, name: v.name, label: formatLocalLabel(v), isStudio: false })),
      localJapanese: localJa.slice(0, 2).map(v => ({ id: v.name, name: v.name, label: `🇯🇵 ${v.name.replace(/Microsoft\s+/g, '')} (System)`, isStudio: false })),
      current: this.selectedVoiceName
    };
  }

  setVoice(voiceId) {
    this.selectedVoiceName = voiceId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('stride_narrator_voice', voiceId);
    }
    // If currently playing, restart current paragraph with new voice
    if (this.isPlaying) {
      this._speakParagraph(this.activeParagraphIdx);
    }
  }

  sampleVoice(voiceId) {
    this.stopSample();

    const isStudio = STUDIO_NEURAL_VOICES.some(v => v.id === voiceId);
    const isJa = voiceId.includes('ja') || voiceId.includes('Japanese') || voiceId.includes('Nanami') || voiceId.includes('Keita');

    const sampleText = isJa
      ? 'こんにちは。こちらは Stride のスタジオAIナレーターです。自然な発音で要約をお届けします。'
      : 'Hello! I am your studio narrator for Stride. Daily microlearning made effortless and engaging.';

    if (isStudio) {
      const audioUrl = `/api/tts?text=${encodeURIComponent(sampleText)}&voice=${encodeURIComponent(voiceId)}`;
      this.sampleAudio = new Audio(audioUrl);
      this.sampleAudio.playbackRate = this.playbackRate;
      this.sampleAudio.play().catch(e => console.warn('[TTS Sample] Play error:', e));
    } else {
      // Local SpeechSynthesis fallback
      if (!this.synth) return;
      this.synth.cancel();
      const voices = this.synth.getVoices();
      const v = voices.find(item => item.name === voiceId);
      if (!v) return;

      const utt = new SpeechSynthesisUtterance(sampleText);
      utt.voice = v;
      utt.lang = v.lang;
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
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().then(() => {
        this.isPlaying = true;
        this._startProgressLogger();
        this.onStateChange({ isPlaying: true });
      }).catch(() => {
        this._speakParagraph(this.activeParagraphIdx);
      });
      return;
    }
    this._speakParagraph(this.activeParagraphIdx);
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
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
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    this.stopSample();
    this.isPlaying = false;
    this._stopProgressLogger();
    this.onStateChange({ isPlaying: false });
  }

  // Speak a paragraph using high-definition Studio Neural Audio
  _speakParagraph(idx) {
    this.stop();

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
    const isStudioVoice = STUDIO_NEURAL_VOICES.some(v => v.id === this.selectedVoiceName);

    // Resolve target voice for text
    const hasJapanese = /[一-龠ぁ-ゔァ-ヴー]/.test(text);
    let targetVoiceId = this.selectedVoiceName;

    // Prevent cross-language mismatch
    if (hasJapanese && targetVoiceId.startsWith('en')) {
      targetVoiceId = 'ja-JP-NanamiNeural';
    } else if (!hasJapanese && targetVoiceId.startsWith('ja')) {
      targetVoiceId = 'en-US-AndrewNeural';
    }

    if (this.useStudioNeural && isStudioVoice) {
      this._speakWithStudioAudio(idx, text, targetVoiceId);
    } else {
      this._speakWithSpeechSynthesis(idx, text);
    }
  }

  _speakWithStudioAudio(idx, text, voiceId) {
    let audio = null;

    // Check if next paragraph was already preloaded
    if (this.preloadedAudio && this.preloadedIdx === idx) {
      audio = this.preloadedAudio;
      this.preloadedAudio = null;
      this.preloadedIdx = -1;
    } else {
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`;
      audio = new Audio(audioUrl);
    }

    this.currentAudio = audio;
    audio.playbackRate = this.playbackRate;

    audio.onplay = () => {
      this.isPlaying = true;
      this._startProgressLogger();
      this.onSentenceChange(this.activeParagraphIdx);
      this.onStateChange({
        isPlaying: true,
        paragraphIdx: this.activeParagraphIdx,
        totalParagraphs: this.paragraphs.length
      });

      // Preload next paragraph's audio for gapless playback
      this._preloadNextParagraph(this.activeParagraphIdx + 1, voiceId);
    };

    audio.onended = () => {
      if (this.isPlaying) {
        this._speakParagraph(this.activeParagraphIdx + 1);
      }
    };

    audio.onerror = (err) => {
      console.warn('[Studio Audio] Streaming failed, falling back to local voice:', err);
      this._speakWithSpeechSynthesis(idx, text);
    };

    audio.play().catch(err => {
      console.warn('[Studio Audio] Autoplay interrupted:', err);
      // Fallback
      this._speakWithSpeechSynthesis(idx, text);
    });
  }

  _preloadNextParagraph(nextIdx, voiceId) {
    if (nextIdx >= this.paragraphs.length) return;
    const nextText = this.paragraphs[nextIdx];
    const audioUrl = `/api/tts?text=${encodeURIComponent(nextText)}&voice=${encodeURIComponent(voiceId)}`;
    const preload = new Audio(audioUrl);
    preload.preload = 'auto';
    this.preloadedAudio = preload;
    this.preloadedIdx = nextIdx;
  }

  _speakWithSpeechSynthesis(idx, text) {
    if (!this.synth) return;
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

    this.activeUtterance.onstart = () => {
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
      if (this.isPlaying) {
        this._speakParagraph(this.activeParagraphIdx + 1);
      }
    };

    this.activeUtterance.onerror = (e) => {
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
    if (this.currentAudio) {
      this.currentAudio.playbackRate = this.playbackRate;
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
