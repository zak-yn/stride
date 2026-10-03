/**
 * Stride Studio Neural TTS Service
 * Powered by Edge-TTS (Microsoft Azure Studio Neural Voices)
 * Provides ultra-natural, human-grade audiobook narration (Free, Unlimited, Zero API Key).
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Curated list of premier studio audiobook narrators
export const STUDIO_VOICES = [
  // English (US)
  {
    id: 'en-US-AndrewNeural',
    name: 'Andrew',
    lang: 'en-US',
    region: 'United States',
    accent: 'US',
    gender: 'Male',
    style: 'Deep, engaging & articulate audiobook narrator',
    isDefault: true
  },
  {
    id: 'en-US-AvaNeural',
    name: 'Ava',
    lang: 'en-US',
    region: 'United States',
    accent: 'US',
    gender: 'Female',
    style: 'Warm, modern & expressive storyteller'
  },
  {
    id: 'en-US-BrianNeural',
    name: 'Brian',
    lang: 'en-US',
    region: 'United States',
    accent: 'US',
    gender: 'Male',
    style: 'Clear, authoritative executive cadence'
  },
  {
    id: 'en-US-EmmaNeural',
    name: 'Emma',
    lang: 'en-US',
    region: 'United States',
    accent: 'US',
    gender: 'Female',
    style: 'Friendly, bright & conversational'
  },
  // English (UK)
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan',
    lang: 'en-GB',
    region: 'United Kingdom',
    accent: 'UK',
    gender: 'Male',
    style: 'Refined, polished BBC-style British voice'
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia',
    lang: 'en-GB',
    region: 'United Kingdom',
    accent: 'UK',
    gender: 'Female',
    style: 'Classic British editorial narrator'
  },
  // Japanese
  {
    id: 'ja-JP-NanamiNeural',
    name: 'Nanami (七海)',
    lang: 'ja-JP',
    region: 'Japan',
    accent: 'JP',
    gender: 'Female',
    style: '澄んだ自然なトーンの日本語ナレーション'
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: 'Keita (圭太)',
    lang: 'ja-JP',
    region: 'Japan',
    accent: 'JP',
    gender: 'Male',
    style: '落ち着きのある知的な日本語ナレーション'
  }
];

class TTSService {
  constructor() {
    this.ttsClient = new MsEdgeTTS();
    this.currentVoice = null;
  }

  getCuratedVoices() {
    return STUDIO_VOICES;
  }

  // Resolve best studio voice for given text if none specified
  resolveVoiceForText(text, requestedVoiceId) {
    if (requestedVoiceId) {
      const match = STUDIO_VOICES.find(v => v.id === requestedVoiceId);
      if (match) return match.id;
    }

    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    if (hasJapanese) {
      return 'ja-JP-NanamiNeural';
    }
    return 'en-US-AndrewNeural';
  }

  // Synthesize text to an audio stream
  async synthesizeToStream(text, voiceId = 'en-US-AndrewNeural') {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Empty text cannot be synthesized');
    }

    const targetVoice = this.resolveVoiceForText(cleanText, voiceId);

    // Initialize or switch voice metadata
    if (this.currentVoice !== targetVoice) {
      await this.ttsClient.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      this.currentVoice = targetVoice;
    }

    const { audioStream } = this.ttsClient.toStream(cleanText);
    return { audioStream, voiceId: targetVoice };
  }
}

export const ttsService = new TTSService();
