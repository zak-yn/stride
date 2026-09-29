# Stride: Microlearning Books & Audio (PWA)

A high-performance Progressive Web App (PWA) for daily microlearning and intellectual momentum featuring synchronized audio & reader playback, spaced repetition memory flashcards (SM-2), daily habit gamification, and an AI ingestion pipeline powered by **Gemini 3.5 Flash Lite**, backed by **GitHub**, **Render**, and **Upstash Redis**.

---

## 1. Architecture & Tech Stack
- **Repository**: [https://github.com/zak-yn/stride](https://github.com/zak-yn/stride)
- **Deployment**: Render Web Service (`render.yaml`) auto-deploying from `main` as `stride-microlearning`.
- **Database & Storage**: Upstash Redis REST API (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) with seamless local file fallback (`data/books.json`, `data/user_state.json`).
- **AI Engine**: Google Gemini 3.5 Flash Lite (`v1beta/models/gemini-3.5-flash-lite:generateContent`) with resilient fallback to guarantee uninterrupted synthesis.
- **Narration**: Browser SpeechSynthesis with native neural voices + sentence/paragraph highlighting.

---

## 2. Directory Structure & Responsibilities
```
headway/
├── data/                  # Local persistence fallback (books.json, user_state.json)
├── public/                # Static PWA assets served by Express
│   ├── css/style.css      # Anti-AI architectural dark mode (#0F1115, #17191E, #FFDE30)
│   ├── js/
│   │   ├── icons.js       # Minimalist 1.5px stroke vector SVG icons
│   │   ├── audioEngine.js # Synchronized speech engine + MediaSession API
│   │   └── app.js         # Navigation, SM-2 cards, shorts feed & AI Studio
│   ├── icons/             # 192x192 & 512x512 PWA icons
│   ├── manifest.webmanifest # PWA standalone manifest
│   └── index.html         # Mobile-first shell (Today, Library, Review, Shorts, Studio)
├── server/
│   ├── db.js              # Upstash Redis REST + local file storage layer
│   ├── gemini.js          # Gemini 3.5 Flash Lite summarization & structured extractor
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
2. Verify `/api/status`, `/api/books`, `/api/flashcards`, and `/api/progress`.
3. Sensor check UI via headless browser or Playwright:
   - Check Today tab, Daily Goal ring, and Hero Pick.
   - Test Audio Reader modal playback & sentence highlighting.
   - Test 3D Flashcard flip and SM-2 review rating submission.
   - Test Shorts vertical reels and interactive scenario quiz.
   - Test AI Studio with Gemini 3.5 Flash Lite.

---

- **2026-09-30**: Official rebranding to "Stride".
  - Renamed GitHub repository to `zak-yn/stride`, updated render service to `stride-microlearning`, and updated PWA manifest and UI branding.
- **2026-09-29**: Initial release of microlearning PWA app.
  - Architecture: Render deployment ready (`render.yaml`), Upstash Redis REST + local file fallback (`server/db.js`).
  - AI Engine: Gemini 3.5 Flash Lite (`server/gemini.js`) with resilient fallback.
  - Seed catalog: 5 curated titles (*Atomic Habits*, *Deep Work*, *Psychology of Money*, *Thinking Fast & Slow*, *Diary of a CEO*).
  - Audio Engine: SpeechSynthesis with synchronized paragraph highlighting and MediaSession lockscreen controls.
  - SM-2 Spaced Repetition deck, vertical Shorts feed, and full PWA manifest.
