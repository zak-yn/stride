/**
 * YouTube Search & Transcript Extraction Service for Stride
 * Extracts video metadata and speech transcripts for Gemini 3.5 Flash Lite summarization.
 */

import { YoutubeTranscript } from 'youtube-transcript';

// Extract 11-character video ID from any YouTube URL or string
export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|feature=player_embedded&v=))([^#&?]*)/;
  const match = trimmed.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}

// In-app YouTube search scraper (no API key / quota required)
export async function searchYouTube(query, preferredLanguage = 'English') {
  if (!query || !query.trim()) return [];
  try {
    const isJapanese = preferredLanguage === 'Japanese' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(query);
    const acceptLanguage = isJapanese ? 'ja,en-US;q=0.9,en;q=0.8' : 'en-US,en;q=0.9';

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': acceptLanguage
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) return [];
    const html = await res.text();

    const initialDataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                             html.match(/var ytInitialData\s*=\s*({.+?});/s);
    if (!initialDataMatch || !initialDataMatch[1]) return [];

    const data = JSON.parse(initialDataMatch[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!sections) return [];

    const results = [];
    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents;
      if (items) {
        for (const item of items) {
          const video = item?.videoRenderer;
          if (video && video.videoId) {
            const title = video.title?.runs?.map(r => r.text).join('') || '';
            const channel = video.ownerText?.runs?.[0]?.text || '';
            const length = video.lengthText?.simpleText || '';
            const views = video.viewCountText?.simpleText || '';
            const published = video.publishedTimeText?.simpleText || '';
            
            // Prefer clean non-localized thumbnail when searching in English
            let thumbnail = video.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
            if (!isJapanese && thumbnail.includes('_ja.jpg')) {
              thumbnail = `https://i.ytimg.com/vi/${video.videoId}/hq720.jpg`;
            }

            // Filter out empty titles or shorts with no length
            if (title) {
              results.push({
                videoId: video.videoId,
                title,
                channel,
                length,
                views,
                published,
                thumbnail,
                videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`
              });
            }

            if (results.length >= 8) break;
          }
        }
      }
      if (results.length >= 8) break;
    }

    return results;
  } catch (err) {
    console.error('[YouTube Search] Error:', err.message);
    return [];
  }
}

// Fetch complete video metadata and speech transcript
export async function fetchVideoDetailsAndTranscript(videoId, options = {}) {
  const {
    clientTitle = '',
    clientChannel = '',
    clientThumbnail = '',
    preferredLanguage = 'English'
  } = options;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const isJapanese = preferredLanguage === 'Japanese';
  const acceptLanguage = isJapanese ? 'ja,en-US;q=0.9,en;q=0.8' : 'en-US,en;q=0.9';
  
  // 1. Initialize with client-passed metadata fallbacks
  let title = clientTitle || '';
  let author = clientChannel || 'YouTube Creator';
  let description = '';
  let thumbnail = clientThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // 1. Always query official YouTube oEmbed API first (never blocked on datacenter / cloud IPs)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const oeRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (oeRes.ok) {
      const oeData = await oeRes.json();
      if (oeData.title) title = oeData.title;
      if (oeData.author_name) author = oeData.author_name;
      if (oeData.thumbnail_url) thumbnail = oeData.thumbnail_url;
    }
  } catch (oeErr) {
    console.warn(`[YouTube] oEmbed fetch warning for ${videoId}:`, oeErr.message);
  }

  // 2. Fetch full HTML for description and additional player details
  try {
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': acceptLanguage
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const html = await res.text();
      
      // Parse player response for clean metadata & description
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (playerMatch && playerMatch[1]) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          const videoDetails = playerData?.videoDetails;
          if (videoDetails) {
            if (videoDetails.title && (!title || title.startsWith('YouTube Video'))) title = videoDetails.title;
            if (videoDetails.author && (!author || author === 'YouTube Creator')) author = videoDetails.author;
            if (videoDetails.shortDescription) description = videoDetails.shortDescription;
            if (videoDetails.thumbnail?.thumbnails?.length > 0) {
              const scrapedThumb = videoDetails.thumbnail.thumbnails.slice(-1)[0].url;
              if (!(!isJapanese && scrapedThumb.includes('_ja.jpg'))) {
                thumbnail = scrapedThumb;
              }
            }
          }
        } catch (e) {
          // ignore json parse error
        }
      }

      // Fallback title regex if still empty
      if (!title) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(' - YouTube', '').trim();
        }
      }
    }
  } catch (metaErr) {
    console.warn(`[YouTube] Metadata HTML fetch error for ${videoId}:`, metaErr.message);
  }

  // 2. Fetch transcript with multi-language fallback
  let transcript = '';
  try {
    // Try fetching default/auto transcript
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      transcript = items.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
    }
  } catch (trErr1) {
    try {
      // If default failed, try requested language explicitly
      const targetLang = isJapanese ? 'ja' : 'en';
      const itemsLang = await YoutubeTranscript.fetchTranscript(videoId, { lang: targetLang });
      if (itemsLang && itemsLang.length > 0) {
        transcript = itemsLang.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
      }
    } catch (trErr2) {
      try {
        // Fallback to English explicitly
        const itemsEn = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        if (itemsEn && itemsEn.length > 0) {
          transcript = itemsEn.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
        }
      } catch (trErr3) {
        console.warn(`[YouTube] No subtitle track found for ${videoId}. Using video metadata.`);
      }
    }
  }

  return {
    videoId,
    title: title || clientTitle || `YouTube Video (${videoId})`,
    author: (author && author !== 'YouTube Creator') ? author : (clientChannel || 'YouTube Creator'),
    description: description.slice(0, 3000),
    transcript,
    thumbnail,
    videoUrl
  };
}
