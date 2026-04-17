# PolyDub — Real-Time Multilingual Video Dubbing 

> Speak any language. Be heard in any language. Live.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Deepgram](https://img.shields.io/badge/Deepgram-STT%2FTTS-orange?style=flat)](https://deepgram.com/)
[![Lingo.dev](https://img.shields.io/badge/Lingo.dev-i18n-green?style=flat)](https://lingo.dev/)

**Demo:** https://youtu.be/Vomt_04eN-Q

> **30-second pitch:** PolyDub is a real-time multilingual dubbing platform. Speak into your mic. Everyone listening hears you in their own language within 1.5 seconds, in a browser, with no plugins. It supports live one-to-many broadcasts, multi-party rooms where each person speaks their own language, and async video dubbing with MP4 + SRT output.

---

## What Is PolyDub?

PolyDub is a full-stack real-time dubbing platform. It listens to a speaker, transcribes them, translates the speech, and plays back a dubbed audio stream in the listener's language, all within ~1.5 seconds, in a browser, with no plugins.

Three modes:

| Mode | Who it's for |
|------|-------------|
| **Live Broadcast** | One host speaks and the audience worldwide hears a live dubbed stream in their language |
| **Multilingual Rooms** | Multi-party video calls where everyone speaks their own language and hears everyone else in theirs |
| **VOD Dubbing** | Upload any video and download a fully dubbed MP4 + SRT subtitle file |

### What Makes This Different

- **Sub-1.5s real-time dubbing** in a plain browser tab, no extensions or native apps
- **Genuine native-accent TTS voices** per language via Deepgram Aura-2 (not English voices relabelled)
- **Per-listener audio serialization** so multi-speaker rooms produce clean audio, not interleaved noise
- **12-locale UI** compiled at build time via Lingo.dev so every part of the interface is translated, not just the audio
- **Full VOD pipeline** using the same STT/translate/TTS stack plus FFmpeg muxing, producing a playable MP4 and a time-coded SRT file

---

## How It Works

Need deeper internals? See [ARCHITECTURE.md](./ARCHITECTURE.md) for full sequence diagrams, role routing, and pipeline details.

```
Mic (PCM 16kHz) → WebSocket
  → Deepgram Nova-2 (STT, streaming)
  → Google Translate (< 350ms, LRU-cached)
  → Deepgram Aura-2 (TTS, native voice per language)
  → WebSocket → Browser AudioContext → Speaker
```

Two processes run simultaneously:

```
┌──────────────────────────┐     ┌──────────────────────────────────┐
│   Next.js App  (:3000)   │     │  WebSocket Server  (:8080)       │
│                          │     │                                  │
│  /broadcast/[lang]       │◄───►│  STTService   (Deepgram Nova-2)  │
│  /room/[roomId]          │     │  TranslateService (Google gtx)   │
│  /vod                    │     │  TTSService   (Deepgram Aura-2)  │
│                          │     │                                  │
│  /api/dub   (pipeline)   │     │  rooms: Map<roomId, Members>     │
│  /api/mux   (FFmpeg)     │     │  listeners: Map<id, Set<WS>>     │
│  /api/tts-preview        │     │                                  │
└──────────────────────────┘     └──────────────────────────────────┘
```

---

## Supported Languages

**Speak (STT — Deepgram Nova-2):** English, Spanish, French, German, Italian, Dutch, Japanese, Portuguese, Hindi, Arabic, Korean, Turkish, Vietnamese, Ukrainian, Polish — plus Auto-detect

**Hear (TTS — Deepgram Aura-2 native voices):**

| Language | Voices |
|----------|--------|
| English | Thalia, Andromeda, Apollo, Arcas |
| Spanish | Celeste, Estrella, Nestor, Sirio |
| French | Agathe, Hector |
| German | Viktoria, Elara, Julius, Fabian |
| Italian | Livia, Melia, Dionisio, Elio |
| Japanese | Izanami, Uzume, Ama, Ebisu, Fujin |
| Dutch | Rhea, Beatrix, Sander, Lars |

All voices use Aura-2 — the model that ships with genuine per-language native accent, not English voices re-labelled.

---

## Tech Stack

- **Frontend** — Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Phosphor Icons
- **WebSocket Server** — Node.js, `ws`, TypeScript
- **STT** — Deepgram Nova-2 (streaming, 16 kHz linear16 PCM)
- **Translation** — Google Translate unofficial `gtx` endpoint (250–350ms warm, LRU + in-flight dedup)
- **TTS** — Deepgram Aura-2 (streaming PCM, native voices per language)
- **VOD Muxing** — FFmpeg via `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` (bundled, no system install needed)
- **UI i18n** — Lingo.dev compiler (build-time, 12 locales)

---

## Screenshots

### Landing Page
![Landing Page](./public/landing.png)

### Broadcast Mode
![Broadcast Mode](./public/broadcast.png)

### Multilingual Room
![Room Mode](./public/room.png)

### VOD Dubbing Studio
![VOD Studio](./public/vod.png)

---

## Getting Started

### Prerequisites

- Node.js 18+, pnpm
- [Deepgram API key](https://console.deepgram.com) — for STT + TTS
- [Lingo.dev API key](https://lingo.dev) — for UI translation at build time

### Setup

```bash
git clone https://github.com/your-username/polydub.git
cd polydub
pnpm install
cp .env.example .env
```

Edit `.env`:

```env
DEEPGRAM_API_KEY=your_key
LINGO_API_KEY=your_key
LINGO_BUILD_MODE=translate
PORT=8080
WEBSOCKET_PORT=8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Run (Development)

```bash
# Terminal 1 — Next.js frontend
pnpm dev

# Terminal 2 — WebSocket server
pnpm server
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
pnpm build   # compiles Lingo translations + Next.js
pnpm start   # start Next.js
pnpm server  # start WebSocket server
```

---

## Deployment

PolyDub needs **two services** running simultaneously.

### Render (Recommended)

Use the included Blueprint file to create both services at once:

1. Push this repo to GitHub.
2. In Render, choose **New +** → **Blueprint** and connect the repo.
3. Render will read `render.yaml` and create:
  - `polydub-web` (Next.js app)
  - `polydub-ws` (WebSocket server)
4. Add required env vars on both services:
  - `DEEPGRAM_API_KEY`
  - `LINGO_API_KEY`
5. After first deploy, copy the public URL of `polydub-ws` and set on `polydub-web`:
  - `NEXT_PUBLIC_WS_URL=wss://<your-ws-service>.onrender.com`
6. Redeploy `polydub-web` so the client picks up the updated public WS URL.

Use `wss://` (not `ws://`) in production — browsers block unencrypted WebSocket connections from HTTPS pages.

### Render Free Tier Notes

- Free instances can spin down when idle, which adds cold starts and can interrupt real-time WebSocket sessions.
- For demos and testing, free tier is usually fine.
- For reliable live sessions, use a paid always-on instance for at least the WebSocket service.

### Railway (Alternative)

Railway also works with the same two-service split:

1. **Next.js service** — build: `pnpm build`, start: `pnpm start`
2. **WebSocket service** — start: `pnpm server` (or `pnpm server:start` if prebuilt)

Set `NEXT_PUBLIC_WS_URL` on the Next.js service to the WebSocket service public URL.

---

## Project Structure

```
├── app/
│   ├── broadcast/[lang]/     # Live broadcast listener page
│   ├── room/[roomId]/        # Multilingual video room
│   ├── vod/                  # VOD dubbing studio
│   └── api/
│       ├── dub/              # STT → translate → TTS pipeline
│       ├── mux/              # FFmpeg audio/video muxer
│       └── tts-preview/      # Voice preview endpoint
├── server/
│   ├── index.ts              # WebSocket server (all broadcast + room logic)
│   ├── stt.ts                # Deepgram Nova-2 streaming wrapper
│   ├── translate.ts          # Google Translate with LRU cache + dedup
│   └── tts.ts                # Deepgram Aura-2 streaming wrapper
├── hooks/
│   ├── use-room.ts           # Room WebSocket hook + PCM playback
│   └── use-websocket.ts      # Broadcast WebSocket hook
├── components/polydub/       # Core feature UI components
├── lib/srt.ts                # SRT subtitle generation (shared by all modes)
└── testsprite_tests/         # AI-generated test suite (TestSprite MCP)
```

---

## Testing

Tests are generated and executed using [TestSprite MCP](https://testsprite.com). Two full rounds were run: an initial baseline pass, followed by fixes and a confirmation pass.

### Round 1 — Issues Found

TestSprite surfaced two concrete bugs on the first run:

1. **TC003 (`POST /api/dub` third-party failure):** The error handler was returning a plain text string on API failures instead of a JSON response. This caused clients to receive an unparseable body on 500 errors.
2. **TC009 (malformed room ID):** The frontend form was submitting malformed room IDs to the server without client-side validation. The server rejected them but no user-visible error was shown.

Both were fixed before Round 2.

### Round 2 — All Tests Passing ✅

![TestSprite MCP dashboard showing PolyDub run history, progressing from 0/5 to 5/5 Pass across multiple runs](./public/testsprite-dashboard.png)

*Run history in the TestSprite dashboard. Early runs show 0/5 and partial passes. The final run lands at 5/5 after fixes.*

**Backend API Tests — 5/5 Passing**

| Test | What it checks |
|------|---------------|
| TC001 | `POST /api/dub` — builds a minimal valid WAV inline, posts it, then asserts the response is JSON with a non-empty `srt` string **and** a `mp3` field whose base64 actually decodes to non-zero bytes |
| TC002 | `POST /api/dub` — missing params returns 400 with `"Missing parameters"` |
| TC003 | `POST /api/dub` — third-party API failure returns 500 with JSON error body |
| TC004 | `POST /api/mux` — valid video + audio produces a `video/mp4` stream |
| TC005 | `POST /api/mux` — missing inputs returns 400 with `"Missing video or audio file"` |

**Frontend / E2E Tests — 12 Cases**

| Test | What it checks |
|------|---------------|
| TC001 | Start live broadcast after selecting source + target languages |
| TC002 | Create a new room and reach in-room view |
| TC003 | Join an existing room by ID |
| TC004 | Leave and rejoin a room with the same ID |
| TC005 | Prevent broadcast start when no target languages are selected |
| TC006 | Change language and voice selection in an active room |
| TC007 | VOD studio — open and verify upload-ready state |
| TC008 | Navigate from landing page to broadcast setup |
| TC009 | Show validation when joining with a malformed room ID |
| TC010 | Navigate from landing page to rooms lobby |
| TC011 | Reject unsupported VOD file type on upload |
| TC012 | Navigate from landing page to VOD studio |

All test files are in [`testsprite_tests/`](./testsprite_tests/). Run results and the full TestSprite report are in [`testsprite_tests/tmp/`](./testsprite_tests/tmp/).

---

## Design Decisions

**Why Google Translate instead of Lingo.dev for real-time?**
Lingo.dev is LLM-based (~5–8s latency) — great for content quality, not suitable for live dubbing. Google's `gtx` endpoint runs at 250–350ms warm with zero API cost. Lingo.dev is used where it belongs: build-time UI localization across 15 languages.

**Why two separate processes?**
The WebSocket server holds long-lived streaming connections to Deepgram (STT) that cannot exist inside Next.js serverless functions. Separate processes also let each scale independently in production.

**Why Deepgram Aura-2?**
Aura-2 is one of the few TTS APIs with genuinely native-accent voices per language. Aura v1 only shipped English voices regardless of the language parameter — Aura-2 ships native Japanese, German, Italian, Spanish, French, and Dutch voices with correct prosody and accent.

---

## License

MIT
