import { WebSocketServer, WebSocket } from "ws";
import { STTService } from "./stt";
import dotenv from "dotenv";
import http, { IncomingMessage } from "http";
import { Buffer } from "buffer";
import { randomUUID } from "crypto";

import { TranslationService } from "./translate";
import { TTSService } from "./tts";

dotenv.config();

const PORT = parseInt(process.env.PORT || process.env.WEBSOCKET_PORT || "8080", 10);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error("Missing DEEPGRAM_API_KEY");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PolyDub WebSocket Server is running\n');
});

const wss = new WebSocketServer({ server });
const translationService = new TranslationService();
const ttsService = new TTSService(DEEPGRAM_API_KEY);

// PCM config streamed to listeners (Deepgram Aura native rate)
const TTS_ENCODING = "linear16" as const;
const TTS_SAMPLE_RATE = 24000;

// Per-listener TTS queue: serializes audio from concurrent speakers so chunks
// never interleave on the same socket. Depth is capped so stale utterances are
// dropped rather than letting the queue grow and creating 8+ second backlogs.
const listenerQueues = new WeakMap<WebSocket, Promise<void>>();
const listenerQueueDepth = new WeakMap<WebSocket, number>();
const MAX_QUEUE_DEPTH = 1; // 1 running + 1 waiting = max 2 in-flight at once

function enqueueTTS(ws: WebSocket, fn: () => Promise<void>): void {
  const prev = listenerQueues.get(ws) ?? Promise.resolve();
  const next = prev.then(fn).catch((e) => {
    console.error("[TTS Queue] Error:", e);
  });
  listenerQueues.set(ws, next);
}

function streamTTSToSocket(ws: WebSocket, text: string, targetLang: string, voiceId?: string): void {
  const depth = listenerQueueDepth.get(ws) ?? 0;
  if (depth > MAX_QUEUE_DEPTH) {
    console.log(`[TTS Queue] Dropping utterance (depth=${depth}) to prevent backlog`);
    return;
  }
  listenerQueueDepth.set(ws, depth + 1);

  enqueueTTS(ws, async () => {
    const ttsStart = Date.now();
    try {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "tts-start", encoding: TTS_ENCODING, sampleRate: TTS_SAMPLE_RATE }));
      await ttsService.streamAudio(text, targetLang, (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      }, voiceId, { progressive: true, encoding: TTS_ENCODING, sampleRate: TTS_SAMPLE_RATE });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "tts-end" }));
      }
      console.log(`[TTS] done in ${Date.now() - ttsStart}ms`);
    } finally {
      const d = listenerQueueDepth.get(ws) ?? 1;
      listenerQueueDepth.set(ws, Math.max(0, d - 1));
    }
  });
}

// --- BROADCAST STATE (one session per host) ---
interface BroadcastSession {
  targetLangs: string[];
  listeners: Map<string, Set<WebSocket>>; // targetLang -> listener sockets
}
const broadcasts = new Map<string, BroadcastSession>(); // broadcastId -> session
const videoRooms = new Map<string, Set<WebSocket>>();   // broadcastId -> video listener sockets
// Listeners who connected before the host started
const waitingListeners = new Map<string, Map<string, Set<WebSocket>>>(); // broadcastId -> lang -> sockets

// --- NEW ROOM STATE ---
interface RoomMember {
  userId: string;
  wsAudio: WebSocket | null;
  wsVideo: WebSocket | null; // Optional separate video socket
  sourceLanguage: string;
  targetLanguage: string;
  targetVoice: string | null;
  voicePreferences?: Record<string, string>; // peerId -> voiceId
}

interface Room {
  id: string;
  members: Map<string, RoomMember>; // userId -> Member
}

const rooms = new Map<string, Room>();

console.log(`[Server] Starting WebSocket server on port ${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const role = url.searchParams.get("role") || "host"; // 'host', 'listener', 'member', 'member-video'
  
  // --- ROOM MEMBER LOGIC (Audio/Control) ---
  if (role === 'member') {
    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("user") || randomUUID();
    const sourceLang = url.searchParams.get("source") || "en";
    const targetLang = url.searchParams.get("target") || "es"; // One target per user for now
    const voiceId = url.searchParams.get("voice"); 
    const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);

    if (!roomId) {
      ws.close(1008, "Room ID required");
      return;
    }

    console.log(`[Room ${roomId}] Member connected: ${userId} (${sourceLang} -> ${targetLang})`);

    // Get or Create Room
    let room = rooms.get(roomId);
    if (!room) {
      room = { id: roomId, members: new Map() };
      rooms.set(roomId, room);
    }

    // Register Member or Update Audio Socket
    let member = room.members.get(userId);
    if (!member) {
      member = { 
        userId, 
        wsAudio: ws, 
        wsVideo: null, 
        sourceLanguage: sourceLang, 
        targetLanguage: targetLang,
        targetVoice: voiceId || null,
        voicePreferences: {} // Initialize
      };
      room.members.set(userId, member);
    } else {
      member.wsAudio = ws;
      member.sourceLanguage = sourceLang;
      member.targetLanguage = targetLang;
      // Keep existing preferences if re-connecting? For now, reset or keep is fine.
      if (!member.voicePreferences) member.voicePreferences = {};
      // Update default voice if provided, else keep old?
      if (voiceId) member.targetVoice = voiceId;
    }

    // Notify others that someone joined
    // Broadcast as JSON string for consistency
    broadcastToRoom(room, userId, { type: 'user-joined', userId, sourceLanguage: sourceLang });

    // Send list of current participants to the new user
    const participants = Array.from(room.members.values())
      .filter(m => m.userId !== userId)
      .map(m => ({ userId: m.userId, sourceLanguage: m.sourceLanguage }));
    
    ws.send(JSON.stringify({ type: 'room-state', participants }));

    // Setup STT for this user
    const sttService = new STTService({
      apiKey: DEEPGRAM_API_KEY,
      sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
      sampleRate: sampleRate,
      onTranscript: async (text, isFinal, detectedLanguage) => {
        const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
          ? detectedLanguage 
          : (sourceLang === 'auto' ? 'en' : sourceLang);

        // 1. Send loopback (transcript to self)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: isFinal ? "transcript" : "partial",
            userId: userId, // It's me
            original: text,
            translated: isFinal ? text : undefined, // No translation needed for self usually
            isSelf: true,
            timestamp: Date.now()
          }));
        }

        // 2. Broadcast to Room
        if (isFinal && text.trim().length > 0) {
            const currentRoom = rooms.get(roomId); // Refetch to be safe
            if (!currentRoom) return;
            const finalAt = Date.now();

            // Iterate other members
            await Promise.all(Array.from(currentRoom.members.values()).map(async (otherMember) => {
              if (otherMember.userId === userId) return; // Skip self
              if (!otherMember.wsAudio || otherMember.wsAudio.readyState !== WebSocket.OPEN) return;

              try {
                const translatedText = await translationService.translate(text, actualSourceLang, otherMember.targetLanguage);
                const translatedAt = Date.now();
                console.log(`[Room ${roomId}] ${userId}->${otherMember.userId} translate=${translatedAt - finalAt}ms`);

                if (!otherMember.wsAudio || otherMember.wsAudio.readyState !== WebSocket.OPEN) return;

                otherMember.wsAudio.send(JSON.stringify({
                  type: "transcript",
                  userId: userId,
                  original: text,
                  translated: translatedText,
                  timestamp: translatedAt,
                  sourceLanguage: actualSourceLang
                }));

                if (!translatedText) return;

                const specificVoice = otherMember.voicePreferences?.[userId];
                const finalVoice = specificVoice || otherMember.targetVoice;
                // Non-blocking: queued per-listener so concurrent speakers never interleave
                streamTTSToSocket(otherMember.wsAudio, translatedText, otherMember.targetLanguage, finalVoice || undefined);
              } catch (e) {
                console.error(`[Room ${roomId}] Translation/TTS failed for ${otherMember.userId}`, e);
              }
            }));
        }
      },
      onError: (err) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", message: "STT Error" }));
      }
    });

    sttService.start();

    ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
      // 1. Try to parse as Control Message (JSON)
      try {
          const msgString = message.toString();
          if (msgString.trim().startsWith('{')) {
              const data = JSON.parse(msgString);
              if (data.type === 'set-voice-preference') {
                  const mem = room.members.get(userId);
                  if (mem) {
                    if (!mem.voicePreferences) mem.voicePreferences = {};
                    mem.voicePreferences[data.peerId] = data.voiceId;
                    console.log(`[Room ${roomId}] User ${userId} set preference: ${data.peerId} -> ${data.voiceId}`);
                  }
                  return; // Handled as control message
              }
          }
      } catch (e) {
          // Not valid JSON, proceed to treat as audio
      }

      // 2. Treat as Audio Data
      if (Buffer.isBuffer(message)) sttService.sendAudio(message);
      else if (message instanceof ArrayBuffer) sttService.sendAudio(Buffer.from(message));
      else if (Array.isArray(message)) sttService.sendAudio(Buffer.concat(message));
    });

    ws.on("close", () => {
      console.log(`[Room ${roomId}] Member audio disconnected: ${userId}`);
      sttService.stop();
      if (rooms.has(roomId)) {
        const r = rooms.get(roomId)!;
        const m = r.members.get(userId);
        if (m) {
           m.wsAudio = null;
           // Wait for video to close too?
           // For simplicity, handle cleanup more aggressively or wait a bit
           if (!m.wsVideo || m.wsVideo.readyState !== WebSocket.OPEN) {
               r.members.delete(userId);
               broadcastToRoom(r, userId, { type: 'user-left', userId });
               if (r.members.size === 0) rooms.delete(roomId);
           }
        }
      }
    });

    ws.on("error", (err) => {
       console.error(`[Room ${roomId}] Audio Error for ${userId}:`, err);
       sttService.stop();
    });
  }

  // --- ROOM MEMBER VIDEO LOGIC ---
  else if (role === 'member-video') {
    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("user");

    if (!roomId || !userId) {
      ws.close(1008, "Room ID and User ID required");
      return;
    }

    let room = rooms.get(roomId);
    if (!room) {
        room = { id: roomId, members: new Map() };
        rooms.set(roomId, room);
    }
    
    let member = room.members.get(userId);
    if (!member) {
      // Audio socket hasn't connected yet — create a placeholder so wsVideo is
      // registered. The audio socket will fill in real language/voice when it connects.
      member = {
        userId,
        wsAudio: null,
        wsVideo: ws,
        sourceLanguage: '',
        targetLanguage: '',
        targetVoice: null,
      };
      room.members.set(userId, member);
    } else {
      member.wsVideo = ws;
    }

    console.log(`[Room ${roomId}] Video connected: ${userId}`);

    ws.on('message', (message) => {
        let frameData: string = "";
        
        if (Buffer.isBuffer(message)) {
            frameData = message.toString('base64');
        } else if (message instanceof ArrayBuffer) {
            frameData = Buffer.from(message).toString('base64');
        } else {
             return;
        }

        const payload = JSON.stringify({
            type: 'video-frame',
            userId: userId,
            data: frameData
        });

        const currentRoom = rooms.get(roomId);
        if (currentRoom) {
            currentRoom.members.forEach((m) => {
                if (m.userId !== userId && m.wsVideo && m.wsVideo.readyState === WebSocket.OPEN) {
                    m.wsVideo.send(payload);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`[Room ${roomId}] Video disconnected: ${userId}`);
        const r = rooms.get(roomId);
        if (r) {
            const m = r.members.get(userId);
            if (m) {
                m.wsVideo = null;
                if (!m.wsAudio || m.wsAudio.readyState !== WebSocket.OPEN) {
                    r.members.delete(userId);
                    broadcastToRoom(r, userId, { type: 'user-left', userId });
                    if (r.members.size === 0) rooms.delete(roomId);
                }
            }
        }
    });
  }
  
  // --- HOST LOGIC (Speaker) ---
  else if (role === 'host') {
    const sourceLang = url.searchParams.get("source") || "en";
    const targetsParam = url.searchParams.get("targets") || "es";
    const targetLangs = targetsParam.split(',').filter(t => t.length > 0);
    const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);
    const voicesParam = url.searchParams.get("voices");
    const broadcastId = url.searchParams.get("id") || randomUUID();

    let targetVoices: Record<string, string> = {};
    if (voicesParam) {
       try {
           targetVoices = JSON.parse(voicesParam);
       } catch (e) {
           console.error("Failed to parse voices param", e);
       }
    }

    console.log(`[Server] Host connected id=${broadcastId}: ${sourceLang} -> [${targetLangs.join(', ')}]`, targetVoices);

    // Create session
    const session: BroadcastSession = { targetLangs, listeners: new Map() };
    broadcasts.set(broadcastId, session);

    // Migrate any listeners who connected before the host started
    const waiting = waitingListeners.get(broadcastId);
    if (waiting) {
      waiting.forEach((sockets, lang) => {
        if (!session.listeners.has(lang)) session.listeners.set(lang, new Set());
        sockets.forEach(sock => {
          if (sock.readyState === WebSocket.OPEN) {
            session.listeners.get(lang)!.add(sock);
            sock.send(JSON.stringify({ type: 'info', message: 'Broadcast has started!' }));
            sock.on("close", () => session.listeners.get(lang)?.delete(sock));
          }
        });
      });
      waitingListeners.delete(broadcastId);
    }

    const sttService = new STTService({
      apiKey: DEEPGRAM_API_KEY,
      sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
      sampleRate: sampleRate,
      onTranscript: async (text, isFinal, detectedLanguage) => {
        const now = Date.now();
        
        const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
          ? detectedLanguage 
          : (sourceLang === 'auto' ? 'en' : sourceLang);

        if (ws.readyState === WebSocket.OPEN) {
          const msg: any = {
            type: isFinal ? "transcript" : "partial",
            original: text,
            translated: "", 
            timestamp: now,
            sourceLanguage: actualSourceLang,
            targetLanguage: "multi" 
          };
          
          if (!isFinal) {
             ws.send(JSON.stringify(msg));
          }
        }

        if (isFinal && text.trim().length > 0) {
          console.log(`[STT] Final: "${text}" (Detected: ${detectedLanguage || 'N/A'})`);
          const finalAt = Date.now();

          try {
            console.log(`[Broadcast] Processing targets: ${targetLangs.join(', ')}`);

            await Promise.all(targetLangs.map(async (lang) => {
               try {
                  const translatedText = await translationService.translate(text, actualSourceLang, lang);
                  const translatedAt = Date.now();

                  const specificListeners = session.listeners.get(lang);
                  if (!specificListeners || specificListeners.size === 0) return;

                  console.log(`[Broadcast] lang=${lang} translate=${translatedAt - finalAt}ms`);

                  const updateMsg = JSON.stringify({
                    type: "transcript",
                    original: text,
                    translated: translatedText,
                    timestamp: translatedAt,
                    sourceLanguage: actualSourceLang,
                    targetLanguage: lang
                  });

                  specificListeners.forEach(l => {
                    if (l.readyState === WebSocket.OPEN) l.send(updateMsg);
                  });

                  if (!translatedText) return;

                  const voiceId = targetVoices[lang];
                  // Non-blocking: each listener gets its own serialized TTS queue
                  specificListeners.forEach(l => streamTTSToSocket(l, translatedText, lang, voiceId));
               } catch (err) {
                  console.error(`[Broadcast] Error processing ${lang}:`, err);
               }
            }));

          } catch (pipelineError) {
            console.error("[Pipeline] Error:", pipelineError);
          }
        }
      },
      onError: (err) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "error", message: "STT Error" }));
      }
    });

    sttService.start();

    ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
      if (Buffer.isBuffer(message)) sttService.sendAudio(message);
      else if (message instanceof ArrayBuffer) sttService.sendAudio(Buffer.from(message));
      else if (Array.isArray(message)) sttService.sendAudio(Buffer.concat(message));
    });

    ws.on("close", () => {
      console.log(`[Server] Host disconnected id=${broadcastId}`);
      broadcasts.delete(broadcastId);
      waitingListeners.delete(broadcastId);

      session.listeners.forEach(sockets => {
        sockets.forEach(l => {
          if (l.readyState === WebSocket.OPEN) {
            l.send(JSON.stringify({ type: 'info', message: 'Host ended the broadcast.' }));
          }
        });
      });

      sttService.stop();
    });

    ws.on("error", (error) => {
      console.error(`[Server] Host error: ${error.message}`);
      sttService.stop();
      broadcasts.delete(broadcastId);
      waitingListeners.delete(broadcastId);
    });
  } 
  
  // LISTENER LOGIC (Receiver)
  else if (role === 'listener') {
    const listenLang = url.searchParams.get("lang") || "es";
    const broadcastId = url.searchParams.get("id");

    const session = broadcastId ? broadcasts.get(broadcastId) : undefined;

    if (!session) {
      // Host hasn't started yet — park listener in the waiting pool
      ws.send(JSON.stringify({ type: 'waiting', message: 'Waiting for the broadcaster to start...' }));
      if (broadcastId) {
        if (!waitingListeners.has(broadcastId)) waitingListeners.set(broadcastId, new Map());
        const byLang = waitingListeners.get(broadcastId)!;
        if (!byLang.has(listenLang)) byLang.set(listenLang, new Set());
        byLang.get(listenLang)!.add(ws);
        ws.on("close", () => byLang.get(listenLang)?.delete(ws));
        ws.on("error", () => byLang.get(listenLang)?.delete(ws));
      }
      return;
    }

    ws.send(JSON.stringify({ type: 'info', message: 'Connected to live broadcast.' }));
    if (!session.listeners.has(listenLang)) session.listeners.set(listenLang, new Set());
    session.listeners.get(listenLang)!.add(ws);

    ws.on("close", () => session.listeners.get(listenLang)?.delete(ws));
    ws.on("error", () => session.listeners.get(listenLang)?.delete(ws));
  }
  else if (role === 'host-video') {
    const broadcastId = url.searchParams.get("id") || "default";
    ws.on('message', (message) => {
      videoRooms.get(broadcastId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      });
    });
  }
  else if (role === 'listener-video') {
    const broadcastId = url.searchParams.get("id") || "default";
    if (!videoRooms.has(broadcastId)) videoRooms.set(broadcastId, new Set());
    const room = videoRooms.get(broadcastId)!;
    room.add(ws);
    ws.on('close', () => room.delete(ws));
  }
});

function broadcastToRoom(room: Room, excludeUserId: string, message: any) {
  const json = JSON.stringify(message);
  room.members.forEach((m) => {
    if (m.userId !== excludeUserId && m.wsAudio && m.wsAudio.readyState === WebSocket.OPEN) {
      m.wsAudio.send(json);
    }
  });
}

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
