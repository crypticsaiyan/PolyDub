import { WebSocketServer, WebSocket } from "ws";
import { STTService } from "./stt";
import dotenv from "dotenv";
import http, { IncomingMessage } from "http";
import { Buffer } from "buffer";
import { randomUUID } from "crypto";

import { TranslationService } from "./translate";
import { TTSService } from "./tts";

dotenv.config();

const PORT = parseInt(process.env.WEBSOCKET_PORT || "8080", 10);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const LINGO_API_KEY = process.env.LINGO_API_KEY;

if (!DEEPGRAM_API_KEY || !LINGO_API_KEY) {
  console.error("Missing API keys");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PolyDub WebSocket Server is running\n');
});

const wss = new WebSocketServer({ server });
const translationService = new TranslationService(LINGO_API_KEY);
const ttsService = new TTSService(DEEPGRAM_API_KEY);

// --- LEGACY BROADCAST STATE ---
// Store listeners: "es" -> Set of WebSockets
const listeners = new Map<string, Set<WebSocket>>();
// Store active broadcasts (languages currently being streamed by a host)
const activeBroadcasts = new Set<string>();
// Video Listeners
const videoListeners = new Set<WebSocket>();

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

            // Iterate other members
            await Promise.all(Array.from(currentRoom.members.values()).map(async (otherMember) => {
              if (otherMember.userId === userId) return; // Skip self
              if (!otherMember.wsAudio || otherMember.wsAudio.readyState !== WebSocket.OPEN) return;

              try {
                // Translate
                const translatedText = await translationService.translate(text, actualSourceLang, otherMember.targetLanguage);
                
                // Send Transcript
                otherMember.wsAudio.send(JSON.stringify({
                  type: "transcript",
                  userId: userId,
                  original: text,
                  translated: translatedText,
                  timestamp: Date.now(),
                  sourceLanguage: actualSourceLang
                }));

                // TTS
                if (translatedText) {
                  // Check if this listener has a specific voice preference for the speaker (userId)
                  const specificVoice = otherMember.voicePreferences?.[userId];
                  const finalVoice = specificVoice || otherMember.targetVoice;
                  
                  await ttsService.streamAudio(translatedText, otherMember.targetLanguage, (chunk) => {
                      if (otherMember.wsAudio?.readyState === WebSocket.OPEN) {
                          otherMember.wsAudio.send(chunk);
                      }
                  }, finalVoice || undefined);
                }

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
       member = { 
        userId, 
        wsAudio: null, 
        wsVideo: ws, 
        sourceLanguage: 'en', 
        targetLanguage: 'es', 
        targetVoice: null 
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
  
  // --- LEGACY HOST LOGIC (Speaker) ---
  else if (role === 'host') {
    const sourceLang = url.searchParams.get("source") || "en";
    const targetsParam = url.searchParams.get("targets") || "es";
    const targetLangs = targetsParam.split(',').filter(t => t.length > 0);
    const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);
    const voicesParam = url.searchParams.get("voices");
    
    let targetVoices: Record<string, string> = {};
    if (voicesParam) {
       try {
           targetVoices = JSON.parse(voicesParam);
       } catch (e) {
           console.error("Failed to parse voices param", e);
       }
    }
    
    console.log(`[Server] Host connected: ${sourceLang} -> [${targetLangs.join(', ')}]`, targetVoices);

    // Register active broadcasts
    targetLangs.forEach(lang => activeBroadcasts.add(lang));

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
          
          try {
            console.log(`[Broadcast] Processing targets: ${targetLangs.join(', ')}`);

            await Promise.all(targetLangs.map(async (lang) => {
               try {
                  const translatedText = await translationService.translate(text, actualSourceLang, lang);
                  
                  const updateMsg = JSON.stringify({
                    type: "transcript",
                    original: text,
                    translated: translatedText,
                    timestamp: Date.now(),
                    sourceLanguage: actualSourceLang,
                    targetLanguage: lang
                  });

                  const specificListeners = listeners.get(lang);
                  if (specificListeners && specificListeners.size > 0) {
                    specificListeners.forEach(l => {
                      if (l.readyState === WebSocket.OPEN) l.send(updateMsg);
                    });

                    if (translatedText) {
                      const voiceId = targetVoices[lang];
                      await ttsService.streamAudio(translatedText, lang, (chunk) => {
                        specificListeners.forEach(l => {
                          if (l.readyState === WebSocket.OPEN) {
                             l.send(chunk);
                          }
                        });
                      }, voiceId);
                    }
                  } 
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
      console.log(`[Server] Host disconnected. Cleaning up broadcasts: ${targetLangs.join(', ')}`);
      targetLangs.forEach(lang => activeBroadcasts.delete(lang));
      
      targetLangs.forEach(lang => {
         const specificListeners = listeners.get(lang);
         if (specificListeners) {
            specificListeners.forEach(l => {
               if (l.readyState === WebSocket.OPEN) {
                  l.send(JSON.stringify({ type: 'info', message: 'Host ended the broadcast.' }));
               }
            });
         }
      });
      
      sttService.stop();
    });

    ws.on("error", (error) => {
      console.error(`[Server] Host error: ${error.message}`);
      sttService.stop();
      targetLangs.forEach(lang => activeBroadcasts.delete(lang));
    });
  } 
  
  // LEGACY LISTENER LOGIC (Receiver)
  else if (role === 'listener') {
    const listenLang = url.searchParams.get("lang") || "es";
    if (!activeBroadcasts.has(listenLang)) {
       ws.send(JSON.stringify({ 
         type: 'error', 
         message: `Start a broadcast in ${listenLang} first.` 
       }));
    } else {
        ws.send(JSON.stringify({ 
          type: 'info', 
          message: `Connected to LIVE ${listenLang} broadcast.` 
        }));
    }
    
    if (!listeners.has(listenLang)) {
      listeners.set(listenLang, new Set());
    }
    listeners.get(listenLang)?.add(ws);

    ws.on("close", () => {
      listeners.get(listenLang)?.delete(ws);
    });
    
    ws.on("error", (err) => {
      listeners.get(listenLang)?.delete(ws);
    });
  }
  else if (role === 'host-video') {
    ws.on('message', (message) => {
      videoListeners.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  }
  else if (role === 'listener-video') {
    videoListeners.add(ws);
    ws.on('close', () => videoListeners.delete(ws));
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
