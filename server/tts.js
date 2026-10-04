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

const ttsAudioCache = new Map();
const inFlightRequests = new Map();
const MAX_CACHE_ITEMS = 600;

class TTSService {
  constructor() {}

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

  // Synthesize text to a buffered MP3 (enables exact Content-Length, seeking & 0ms repeats)
  async synthesizeToBuffer(text, voiceId = 'en-US-AndrewNeural') {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Empty text cannot be synthesized');
    }

    const targetVoice = this.resolveVoiceForText(cleanText, voiceId);
    const cacheKey = `${targetVoice}::${cleanText}`;

    if (ttsAudioCache.has(cacheKey)) {
      return { buffer: ttsAudioCache.get(cacheKey), voiceId: targetVoice };
    }

    if (inFlightRequests.has(cacheKey)) {
      const buffer = await inFlightRequests.get(cacheKey);
      return { buffer, voiceId: targetVoice };
    }

    const synthPromise = (async () => {
      const client = new MsEdgeTTS();
      await client.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
      const { audioStream } = client.toStream(cleanText);
      const chunks = [];

      await new Promise((resolve, reject) => {
        audioStream.on('data', chunk => chunks.push(chunk));
        audioStream.on('end', resolve);
        audioStream.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      if (ttsAudioCache.size >= MAX_CACHE_ITEMS) {
        const firstKey = ttsAudioCache.keys().next().value;
        ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, buffer);
      return buffer;
    })();

    inFlightRequests.set(cacheKey, synthPromise);

    try {
      const buffer = await synthPromise;
      return { buffer, voiceId: targetVoice };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  // Synthesize text to an audio stream (legacy compatibility)
  async synthesizeToStream(text, voiceId = 'en-US-AndrewNeural') {
    const { buffer, voiceId: targetVoice } = await this.synthesizeToBuffer(text, voiceId);
    const { Readable } = await import('stream');
    const audioStream = Readable.from(buffer);
    return { audioStream, voiceId: targetVoice };
  }
}

export const ttsService = new TTSService();
