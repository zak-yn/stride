# Stride: Microlearning Books & Audio (PWA)

A high-performance Progressive Web App (PWA) for daily microlearning and intellectual momentum featuring synchronized audio & reader playback, spaced repetition memory flashcards (SM-2), daily habit gamification, and an AI ingestion pipeline powered by **Gemini 3.5 Flash Lite**, backed by **GitHub**, **Render**, and **Upstash Redis**.

---

## 1. Architecture & Tech Stack
- **Repository**: [https://github.com/zak-yn/stride](https://github.com/zak-yn/stride)
- **Deployment**: Render Web Service (`render.yaml`) auto-deploying from `main` as `stride-microlearning`.
- **Database & Storage**: Upstash Redis REST API (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) with seamless local file fallback (`data/books.json`, `data/user_state.json`).
- **AI Engine**: Google Gemini 3.5 Flash Lite (`v1beta/models/gemini-3.5-flash-lite:generateContent`) with resilient fallback to guarantee uninterrupted synthesis.
- **Narration**: High-fidelity Microsoft Azure Studio Neural TTS (`msedge-tts` streaming 24kHz MP3 via `/api/tts`) with natural breathing, cadence, and inflection. Features 8 studio voices (Andrew, Ava, Ryan, Sonia, Nanami, etc.), lookahead paragraph preloader for zero-latency gapless playback, sample auditioning, synchronized sentence/paragraph highlighting, and offline browser SpeechSynthesis fallback.

---

## 2. Directory Structure & Responsibilities
```
headway/
├── data/                  # Local persistence fallback (books.json, user_state.json)
├── public/                # Static PWA assets served by Express
│   ├── css/style.css      # Anti-AI architectural dark mode (#0F1115, #17191E, #FFDE30)
│   ├── js/
│   │   ├── icons.js       # Minimalist 1.5px stroke vector SVG icons
│   │   ├── audioEngine.js # Studio Neural audio streaming + preloader + MediaSession
│   │   └── app.js         # Navigation, SM-2 cards, shorts feed & AI Studio
│   ├── icons/             # 192x192 & 512x512 PWA icons
│   ├── manifest.webmanifest # PWA standalone manifest
│   └── index.html         # Mobile-first shell (Today, Library, Review, Shorts, Studio)
├── server/
│   ├── db.js              # Upstash Redis REST + local file storage layer
│   ├── tts.js             # Azure Studio Neural TTS streaming service (msedge-tts)
│   ├── gemini.js          # Gemini 3.5 Flash Lite summarization & structured extractor
│   ├── youtube.js         # In-app YouTube search & multi-language transcript extractor
│   └── seedData.js        # 5 curated editorial books with chapters, flashcards & quizzes
├── server.js              # Express API & static server (port 3000)
├── render.yaml            # Render blueprint deployment configuration
├── .env.example           # Environment template
└── AGENTS.md              # Project specification & single source of truth (<200 lines)
```

---

## 3. API Specifications & Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/books` | Returns catalog list of summarized books |
| `GET` | `/api/books/:id` | Returns full book details with chapters, flashcards, quizzes |
| `POST` | `/api/generate` | AI ingestion: Book/podcast topic -> 5 chapters + SM-2 cards + quiz |
| `GET` | `/api/progress` | User reading streak, daily minutes & in-progress book |
| `POST` | `/api/progress` | Increments listening/reading minutes & updates streak |
| `GET` | `/api/flashcards?due=true` | Returns flashcards scheduled for review |
| `POST` | `/api/flashcards/:id/review` | Updates card interval using SuperMemo-2 (Hard/Good/Easy) |
| `GET` | `/api/shorts` | Vertical reels of micro-insights & interactive scenario quizzes |
| `GET` | `/api/youtube/search?q=` | In-app YouTube video search (title, duration, views, thumb) |
| `POST` | `/api/youtube/summarize` | Extracts speech transcript & generates 5 chapters + SM-2 cards |
| `GET` | `/api/tts/voices` | Returns curated Studio Neural HD narrators (US, UK, JA) |
| `GET` | `/api/tts?text=&voice=` | Streams 24kHz MP3 audio with caching headers |
| `GET` | `/api/status` | System health, Upstash connection status & Gemini model info |

---

## 4. Spaced Repetition (SM-2) Mechanics
- Card ratings: `Hard (q=2)`, `Good (q=4)`, `Easy (q=5)`.
- If `q >= 3`:
  - `repetitions == 0` -> interval = 1 day.
  - `repetitions == 1` -> interval = 6 days.
  - `repetitions >= 2` -> `interval = round(interval * easeFactor)`.
- `easeFactor` updated via `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`, floored at 1.3.

---

## 5. Anti-AI Design & Aesthetic Mandates
- **Palette**: Deep charcoal canvas (`#0F1115`), elevated cards (`#17191E`), hairline borders (`rgba(255,255,255,0.08)`), Headway signature yellow (`#FFDE30`) and warm amber (`#F5C518`).
- **Zero Emojis in Chrome**: Only 1.5px stroke vector SVG icons (`icons.js`).
- **Restraint**: 8px-10px corner radiuses, ordered density, tactile feedback.

---

## 6. Verification Loop
1. `npm start` (or `node server.js`): Ensure server starts on port 3000 with 0 errors.
2. Verify `/api/status`, `/api/books`, `/api/flashcards`, `/api/youtube/search`, `/api/tts/voices`, and `/api/progress`.
3. Sensor check UI via headless browser or Playwright:
   - Check Today tab, Daily Goal ring, and Hero Pick.
   - Test Audio Reader modal playback & sentence highlighting with Studio Neural voice.
   - Test YouTube in-app search & 1-tap summarization flow in AI Studio.
   - Test 3D Flashcard flip and SM-2 review rating submission.
   - Test Shorts vertical reels and interactive scenario quiz.

---

## 7. Changelog
- **2026-10-04**: Zero-Latency SWR Startup & Direct YouTube oEmbed Resolution.
  - Implemented Stale-While-Revalidate (SWR) client caching with `Promise.allSettled` parallel background revalidation, reducing app startup and UI rendering latency from ~1.5s to 0ms instant display.
  - Decoupled Upstash Redis sync from Express server boot so `app.listen()` binds immediately in <10ms without blocking on cloud I/O.
  - Integrated official YouTube oEmbed API (`/oembed`) across client and server to guarantee pristine video title, channel, and thumbnail resolution on direct URL submissions, eliminating phantom "YouTube Video (videoId)" fallbacks on cloud/datacenter IPs.
- **2026-10-04**: YouTube Search Localization & Gemini Topic Fidelity Fix.
  - Dynamically configured `Accept-Language` headers (`en-US,en;q=0.9` vs `ja,en-US;q=0.9`) based on user language selection and query content, preventing YouTube from forcing Japanese localized thumbnails (`hq720_ja.jpg`) on English videos.
  - Wired client-side video title, channel, and thumbnail forwarding to `/api/youtube/summarize` so cloud servers (Render) retain rich video context even if cloud IP scraping or subtitles are blocked.
  - Hardened Gemini prompt directives with strict domain fidelity, preventing generic productivity hallucinations when summarizing domain-specific videos (e.g. geopolitics, economics).
  - Cleaned Upstash Redis cloud catalog to remove hallucinated fallback records.
- **2026-10-04**: Real-Time Audio Scrubber & Timeline Synchronization Engine.
  - Resolved static "00:00" display and chunky progress jumps by implementing continuous timeline synchronization (`onTimeUpdate`) firing every 250ms via `timeupdate` and RAF interpolation.
  - Added dynamic paragraph duration estimation (`_calculateParagraphDurations`) based on text word/character density and playback rate, dynamically computing accurate chapter totals (e.g. `01:51`).
  - Implemented interactive timeline scrubbing with live preview dragging and seamless paragraph seek jump (`seekToProgress`, `seekToTime`).
  - Added smooth CSS gradient fill (`--seek-pct`) to `.scrub-slider` for refined visual audio feedback.
- **2026-10-04**: Studio Neural Audio Upgrade & Concurrency Architecture Fix.
  - Re-architected `AudioEngine` around a single dedicated `HTMLAudioElement` with session-ID tokens (`playSessionId`) to completely eliminate dual playback (simultaneous SpeechSynthesis and Audio).
  - Fixed HTML5 `pause`/`ended` event ordering where browsers fired `pause` upon completion, unblocking automatic sequential paragraph advancement (0 -> 1 -> 2 -> ...).
  - Wired dynamic DOM re-rendering (`renderChapterParagraphs`) inside `handleAudioStateChange` so changing chapters (pills or next-chapter button) immediately refreshes the displayed text and resets scroll position.
  - Integrated in-memory LRU audio buffer caching on `/api/tts` with exact `Content-Length` and `Accept-Ranges` headers, enabling 0ms instant repeated plays and deterministic seek/ended events.
  - Resolved `msedge-tts` WebSocket initialization collision by provisioning isolated client instances per synthesis.
- **2026-10-04**: YouTube In-App Search, Video Summarization & English Default.
  - Built `server/youtube.js` for real-time video search & automatic subtitle/speech transcript extraction (JA/EN).
  - Wired Gemini 3.5 Flash Lite to ingest full video speech transcripts and structure 5-chapter audio editions.
  - Added in-app YouTube Search Studio with video thumbnail preview, duration badges, and 1-tap "✨ Summarize with Gemini".
  - Refined keyword inspiration chips to match architectural dark aesthetic (`#20242D`, hairline borders); set default summary language to English.
- **2026-10-03**: Production App Icon Suite & Native English Voice Engine.
  - Designed & rendered high-res brand icon suite (`icon-512.png`, `icon-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`) with open book + forward-stride "S" in signature electric yellow and dark obsidian.
  - Enforced native English voice (`en-US`/`en-GB`) with interactive Voice Accent selector modal.
- **2026-09-30**: Official rebranding to "Stride".
  - Renamed GitHub repository to `zak-yn/stride`, updated render service to `stride-microlearning`, and updated PWA manifest and UI branding.
- **2026-09-29**: Initial release of microlearning PWA app.
