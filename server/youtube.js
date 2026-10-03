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
export async function searchYouTube(query) {
  if (!query || !query.trim()) return [];
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
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
            const thumbnail = video.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;

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
export async function fetchVideoDetailsAndTranscript(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // 1. Fetch web page metadata (title, author, description)
  let title = '';
  let author = 'YouTube Creator';
  let description = '';
  let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const html = await res.text();
      
      // Parse player response for clean metadata
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      if (playerMatch && playerMatch[1]) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          const videoDetails = playerData?.videoDetails;
          if (videoDetails) {
            title = videoDetails.title || '';
            author = videoDetails.author || 'YouTube Creator';
            description = videoDetails.shortDescription || '';
            if (videoDetails.thumbnail?.thumbnails?.length > 0) {
              thumbnail = videoDetails.thumbnail.thumbnails.slice(-1)[0].url;
            }
          }
        } catch (e) {
          // ignore json parse error
        }
      }

      // Fallback title regex
      if (!title) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(' - YouTube', '').trim();
        }
      }
    }
  } catch (metaErr) {
    console.warn(`[YouTube] Metadata fetch error for ${videoId}:`, metaErr.message);
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
      // If default failed, try Japanese explicitly
      const itemsJa = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' });
      if (itemsJa && itemsJa.length > 0) {
        transcript = itemsJa.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
      }
    } catch (trErr2) {
      try {
        // If Japanese failed, try English explicitly
        const itemsEn = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        if (itemsEn && itemsEn.length > 0) {
          transcript = itemsEn.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
        }
      } catch (trErr3) {
        console.warn(`[YouTube] No subtitle track found for ${videoId}. Using video description fallback.`);
      }
    }
  }

  return {
    videoId,
    title: title || `YouTube Video (${videoId})`,
    author,
    description: description.slice(0, 3000),
    transcript,
    thumbnail,
    videoUrl
  };
}
