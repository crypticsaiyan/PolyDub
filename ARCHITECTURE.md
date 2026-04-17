# PolyDub Architecture

## System Overview

Two independent processes must run simultaneously:

```mermaid
graph LR
    Browser["Browser\n(Next.js client)"]

    subgraph "Next.js :3000"
        UI["UI Pages\n/broadcast /room /vod"]
        DUB["/api/dub"]
        MUX["/api/mux"]
        TTS_PREV["/api/tts-preview"]
    end

    subgraph "WebSocket Server :8080"
        WS["ws server\nserver/index.ts"]
        STT["STTService\nDeepgram Nova-2"]
        TR["TranslationService\nGoogle gtx"]
        TTS["TTSService\nDeepgram Aura-2"]
    end

    Browser -- "HTTP / pages" --> UI
    Browser -- "REST" --> DUB
    Browser -- "REST" --> MUX
    Browser -- "REST" --> TTS_PREV
    Browser -- "WebSocket\nbinary + JSON" --> WS
    WS --> STT --> TR --> TTS --> WS
```

The Next.js app handles UI and REST routes. The WebSocket server owns all real-time audio — it holds long-lived Deepgram streaming connections that cannot run inside serverless functions.

---

## WebSocket Role Routing

Every WebSocket connection declares its role via a query param on connect. The server branches on arrival:

```mermaid
flowchart TD
    CONN["New WS connection\n?role=..."]
    CONN --> R1{"role?"}

    R1 -- "host" --> HOST["Broadcast host\nopen STT stream\nreceive PCM from browser\nfan out to listeners"]
    R1 -- "listener" --> LIST["Broadcast listener\nregister in listeners map\nreceive translated PCM + transcript"]
    R1 -- "member" --> MEM["Room member (audio)\nopen per-member STT\nreceive + send PCM\nroom-state / user-joined events"]
    R1 -- "member-video" --> VID["Room member (video)\nreceive JPEG frames\nfan out to other members"]
    R1 -- "host-video" --> HV["Legacy host-video\nfan raw frames to listener-video sockets"]
    R1 -- "listener-video" --> LV["Legacy listener-video\nreceive raw frames"]
```

---

## Broadcast Flow

```mermaid
sequenceDiagram
    participant H as Host browser
    participant WS as WS server
    participant DG_STT as Deepgram Nova-2
    participant TR as TranslationService
    participant DG_TTS as Deepgram Aura-2
    participant L_ES as Listener (ES)
    participant L_FR as Listener (FR)

    H->>WS: connect ?role=host&source=en&targets=es,fr
    WS->>DG_STT: open streaming connection

    loop every ~100ms
        H->>WS: PCM binary frame
        WS->>DG_STT: forward audio
    end

    DG_STT-->>WS: partial transcript (interim)
    WS-->>H: {type:"partial", original}

    DG_STT-->>WS: final transcript
    WS->>TR: translate(text, en→es)
    WS->>TR: translate(text, en→fr)
    TR-->>WS: "Hola mundo"
    TR-->>WS: "Bonjour monde"

    WS-->>L_ES: {type:"transcript", translated}
    WS-->>L_FR: {type:"transcript", translated}

    WS->>DG_TTS: streamAudio("Hola mundo", es)
    WS->>DG_TTS: streamAudio("Bonjour monde", fr)

    loop PCM chunks
        DG_TTS-->>WS: linear16 chunk
        WS-->>L_ES: binary PCM
        WS-->>L_FR: binary PCM
    end

    H->>WS: disconnect
    WS-->>L_ES: {type:"info", message:"Host ended broadcast"}
    WS-->>L_FR: {type:"info", message:"Host ended broadcast"}
```

---

## Room Flow

Each member has two sockets: one for audio/control, one for video.

```mermaid
sequenceDiagram
    participant A as Member A (EN speaker)
    participant WS as WS server
    participant STT_A as Deepgram (A's STT)
    participant TR as TranslationService
    participant TTS as Deepgram Aura-2
    participant B as Member B (ES listener)

    A->>WS: connect ?role=member&source=en&target=es
    WS->>STT_A: open streaming connection
    WS-->>B: {type:"user-joined", userId:A}
    WS-->>A: {type:"room-state", participants:[B]}

    loop audio
        A->>WS: PCM binary frame
        WS->>STT_A: forward audio
    end

    STT_A-->>WS: final transcript "Hello"
    WS-->>A: {type:"transcript", isSelf:true}

    WS->>TR: translate("Hello", en→es)
    TR-->>WS: "Hola"

    WS-->>B: {type:"transcript", original:"Hello", translated:"Hola"}
    WS->>TTS: streamAudio("Hola", es, B's voice)

    loop PCM chunks
        TTS-->>WS: linear16 chunk
        WS-->>B: binary PCM (via B's TTS queue)
    end

    A->>WS: disconnect (audio socket)
    note over WS: wait for video socket to close
    A->>WS: disconnect (video socket)
    WS-->>B: {type:"user-left", userId:A}
```

### Per-listener TTS Queue

Prevents audio interleaving when multiple speakers talk simultaneously:

```mermaid
flowchart TD
    NEW["New TTS request\nfor listener L"]
    NEW --> DEPTH{"queue depth\n> MAX_DEPTH (1)?"}
    DEPTH -- "yes" --> DROP["Drop utterance\nprevent backlog"]
    DEPTH -- "no" --> ENQUEUE["Chain onto L's promise queue\ndepth++"]
    ENQUEUE --> WAIT["Wait for previous\nTTS to finish"]
    WAIT --> SEND["Send tts-start JSON\nstream PCM chunks\nsend tts-end JSON"]
    SEND --> DONE["depth--"]
```

### Room Video

```mermaid
flowchart LR
    CAM["Camera\n(browser canvas capture)"]
    CAM -- "JPEG binary\n?role=member-video" --> WS["WS server\nvideo socket"]
    WS -- "base64 JSON\n{type:video-frame, userId, data}" --> B["Member B\nvideo socket"]
    WS -- "base64 JSON" --> C["Member C\nvideo socket"]
    B --> IMG_B["decode base64\ncreate Blob\nrender in img tag"]
    C --> IMG_C["decode base64\ncreate Blob\nrender in img tag"]
```

---

## VOD Pipeline

```mermaid
flowchart TD
    UPLOAD["User uploads video/audio file\n+ selects target language"]
    UPLOAD --> DUB["POST /api/dub"]

    DUB --> STT_PRE["Deepgram prerecorded\nnova-2, utterances mode\nauto language detect"]
    STT_PRE --> UTT["utterances[]\n{start, end, transcript}"]

    UTT --> LOOP["For each utterance (sequential)"]
    LOOP --> TRANS["TranslationService\ntranslate transcript → target lang"]
    TRANS --> TTS_MP3["TTSService\nstreamAudio → MP3 encoding"]
    TTS_MP3 --> COLLECT["collect MP3 chunks"]
    COLLECT --> LOOP

    LOOP --> SRT["convertUtterancesToSRT\n→ SRT string"]
    COLLECT --> CONCAT["Buffer.concat\n→ base64 MP3"]
    SRT --> RESP["{srt, mp3} JSON response"]
    CONCAT --> RESP

    RESP --> MUX_REQ["POST /api/mux\nvideo + audio files"]
    MUX_REQ --> TMP["write to OS tmp dir"]
    TMP --> FFMPEG["ffmpeg\n-c:v copy -c:a aac\n-map 0:v:0 -map 1:a:0"]
    FFMPEG --> MP4["video/mp4 stream\ndownload as dubbed_video.mp4"]
```

---

## STT Service (`server/stt.ts`)

```mermaid
flowchart LR
    AUDIO["PCM audio\nBuffer"]
    AUDIO --> DG["Deepgram Nova-2\nlinear16, 16kHz, mono\nendpointing 150ms\nutterance_end 1000ms"]
    DG -- "interim" --> PARTIAL["onTranscript(text, isFinal=false)"]
    DG -- "final" --> FINAL["onTranscript(text, isFinal=true)"]
    DG -- "error" --> ERR["onError(err)"]
    KEEPALIVE["keepAlive() ping\nevery 10s"] --> DG
```

- Language: explicit tag, or `en-US` fallback when source is `auto`
- Detected language returned via `alternative.languages[0]` when available

---

## Translation Service (`server/translate.ts`)

```mermaid
flowchart TD
    REQ["translate(text, src, tgt)"]
    REQ --> SAME{"src == tgt?"}
    SAME -- "yes" --> PASSTHROUGH["return text as-is"]
    SAME -- "no" --> CACHE{"LRU cache\nhit?"}
    CACHE -- "yes" --> RETURN_CACHE["return cached\nmove to end (LRU)"]
    CACHE -- "no" --> INFLIGHT{"in-flight\nrequest exists?"}
    INFLIGHT -- "yes" --> SHARE["share existing promise"]
    INFLIGHT -- "no" --> FETCH["GET google gtx endpoint\n5s timeout"]
    FETCH -- "ok" --> STORE["store in LRU cache\nevict oldest if > 500"]
    FETCH -- "error" --> FALLBACK["return original text"]
    STORE --> RETURN_NEW["return translated text"]
```

---

## TTS Service (`server/tts.ts`)

```mermaid
flowchart LR
    TEXT["text + targetLang\n+ optional voiceId"]
    TEXT --> VOICE{"voice\noverride?"}
    VOICE -- "yes" --> USE_VOICE["use provided voiceId"]
    VOICE -- "no" --> LANG_MAP["map lang → default Aura-2 voice\nen→thalia es→celeste fr→agathe\nde→viktoria it→livia ja→izanami\nnl→rhea others→thalia fallback"]
    USE_VOICE --> DG_SPEAK["deepgram.speak.request()\nlinear16, 24kHz, no container"]
    LANG_MAP --> DG_SPEAK
    DG_SPEAK --> READER["stream reader"]
    READER -- "progressive=true" --> CHUNK["onChunk(buf) per chunk"]
    READER -- "progressive=false" --> BUFFER["buffer all, then onChunk(concat)"]
```

---

## Browser Audio Playback (`hooks/use-room.ts`)

```mermaid
flowchart TD
    BINARY["ArrayBuffer arrives\nbinary WebSocket message"]
    BINARY --> META["read pcmMeta.sampleRate\n(set by tts-start JSON)"]
    META --> DECODE["decode Int16LE samples\n÷ 32768 → float32"]
    DECODE --> ABUF["AudioContext.createBuffer\nmono, 24kHz"]
    ABUF --> SOURCE["createBufferSource\nconnect to destination"]
    SOURCE --> SCHED{"nextStartTime\n< currentTime?"}
    SCHED -- "yes (gap/stale)" --> RESET["nextStartTime = currentTime"]
    SCHED -- "no" --> QUEUE["source.start(nextStartTime)"]
    RESET --> QUEUE
    QUEUE --> ADVANCE["nextStartTime += buffer.duration"]
```

Chunks scheduled this way play back gapless even when they arrive in bursts.

---

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `DEEPGRAM_API_KEY` | WS server + `/api/dub` | STT and TTS |
| `LINGO_API_KEY` | Build-time Lingo compiler | UI locale compilation |
| `NEXT_PUBLIC_WS_URL` | Browser hooks | WebSocket server address |
| `PORT` / `WEBSOCKET_PORT` | WS server | Listening port (default 8080) |
