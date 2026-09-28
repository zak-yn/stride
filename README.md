# Headway Microlearning Clone (PWA + Audio Reader + AI Studio)

A production-grade Progressive Web App (PWA) clone of **Headway**, designed for $0-to-low-cost operation and structured for seamless deployment with **GitHub**, **Render**, and **Upstash Redis**.

---

## ✨ Features
1. **Curated 5-Chapter Book & Podcast Summaries**:
   - Pre-seeded with 5 world-class titles (*Atomic Habits*, *Deep Work*, *The Psychology of Money*, *Thinking, Fast and Slow*, and *The Diary of a CEO*).
2. **Synchronized Audio & Reader Engine**:
   - Sentence and paragraph active audio highlighting.
   - Browser SpeechSynthesis with natural neural voices.
   - Lockscreen & background playback with `navigator.mediaSession` integration.
   - Variable playback speed (0.75x to 2.0x), 15s scrub, and adjustable sleep timer.
3. **Active Recall & Spaced Repetition (SM-2)**:
   - 3D flippable Insight Gem flashcards.
   - SuperMemo-2 algorithmic calculation (Hard, Good, Easy) scheduling next review intervals.
4. **Habit Gamification & Daily Goals**:
   - Flame streak counter tracking consecutive days.
   - Dynamic 15-minute daily growth target ring.
5. **Interactive Shorts Feed**:
   - Vertical swipeable reels with key mental models and scenario dilemmas with immediate feedback.
6. **AI Ingestion Studio (Gemini 3.5 Flash Lite)**:
   - Enter any book title, author, topic, or raw YouTube transcript.
   - Gemini automatically synthesizes 5 chapters, 5 SM-2 flashcard gems, key takeaways, and scenario quizzes.

---

## 🛠️ Tech Stack & Topology
- **Frontend**: Vanilla ES Modules, PWA Service Worker (`sw.js`), HTML5 Web Audio, Inter Typography.
- **Backend**: Node.js + Express web service.
- **Hosting**: **Render** (`render.yaml` blueprint included).
- **Database / Cache**: **Upstash Redis REST API** with local file fallback (`data/` directory).
- **AI Model**: **Gemini 3.5 Flash Lite** (`v1beta/models/gemini-3.5-flash-lite:generateContent`).

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## ☁️ Deploy to Render & GitHub

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: complete headway microlearning clone"
git remote add origin https://github.com/<YOUR_USER>/headway.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service** (or **Blueprint** using `render.yaml`).
3. Connect your GitHub repository.
4. Configure Environment Variables:
   - `PORT`: `3000`
   - `GEMINI_API_KEY`: *(your Gemini API key)*
   - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
   - `UPSTASH_REDIS_REST_URL`: *(from your Upstash Console)*
   - `UPSTASH_REDIS_REST_TOKEN`: *(from your Upstash Console)*
5. Click **Create Web Service**. Your app is live!

---

## ⚡ Upstash Redis Configuration (Optional)
If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are omitted, the app runs with **100% functionality** using the local file storage fallback (`data/books.json` and `data/user_state.json`). Once Upstash credentials are provided, data synchronizes to the cloud across all your devices.
