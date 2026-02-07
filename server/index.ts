import { WebSocketServer, WebSocket } from "ws";
import { STTService } from "./stt";
import dotenv from "dotenv";
import http, { IncomingMessage } from "http";
import { Buffer } from "buffer";

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

// Store listeners: "es" -> Set of WebSockets
const listeners = new Map<string, Set<WebSocket>>();
// Store active broadcasts (languages currently being streamed by a host)
const activeBroadcasts = new Set<string>();
// Video Listeners
const videoListeners = new Set<WebSocket>();

console.log(`[Server] Starting WebSocket server on port ${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const role = url.searchParams.get("role") || "host"; // 'host' or 'listener'
  
  // HOST LOGIC (Speaker)
  if (role === 'host') {
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

    // Simple debounce/throttle for partial translations
    let lastPartialTime = 0;
    const PARTIAL_INTERVAL = 1000;
    let partialTranslateInProgress = false;

    const sttService = new STTService({
      apiKey: DEEPGRAM_API_KEY,
      sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
      sampleRate: sampleRate,
      onTranscript: async (text, isFinal, detectedLanguage) => {
        const now = Date.now();
        
        const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
          ? detectedLanguage 
          : (sourceLang === 'auto' ? 'en' : sourceLang);

        // Send original transcript back to Host immediately
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

        // FINAL TRANSCRIPT: Broadcast to Listeners
        if (isFinal && text.trim().length > 0) {
          console.log(`[STT] Final: "${text}" (Detected: ${detectedLanguage || 'N/A'})`);
          
          try {
            console.log(`[Broadcast] Processing targets: ${targetLangs.join(', ')}`);

            // Parallelize translations
            await Promise.all(targetLangs.map(async (lang) => {
               try {
                  // A. Translate
                  const translatedText = await translationService.translate(text, actualSourceLang, lang);
                  
                  // B. Broadcast Text to Listeners
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

                    // C. TTS Streaming (Only if listeners exist)
                    if (translatedText) {
                      const voiceId = targetVoices[lang];
                      console.log(`[Broadcast] Requesting TTS for ${lang} (Voice: ${voiceId || 'default'}): "${translatedText.slice(0, 30)}..."`);
                      
                      await ttsService.streamAudio(translatedText, lang, (chunk) => {
                        console.log(`[Broadcast] Received audio chunk for ${lang}, size: ${chunk.length} bytes. Sending to ${specificListeners?.size} listeners.`);
                        specificListeners.forEach(l => {
                          if (l.readyState === WebSocket.OPEN) {
                             l.send(chunk);
                          } else {
                             console.warn(`[Broadcast] Skipped closed listener for ${lang}`);
                          }
                        });
                        if (lang === targetLangs[0] && ws.readyState === WebSocket.OPEN) {
                           // ws.send(chunk); 
                        }
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
      
      // Notify listeners that broadcast ended
      targetLangs.forEach(lang => {
         const specificListeners = listeners.get(lang);
         if (specificListeners) {
            specificListeners.forEach(l => {
               if (l.readyState === WebSocket.OPEN) {
                  l.send(JSON.stringify({ type: 'info', message: 'Host ended the broadcast.' }));
                  // Optional: close listener connection? 
                  // l.close(); 
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
  
  // LISTENER LOGIC (Receiver)
  else if (role === 'listener') {
    const listenLang = url.searchParams.get("lang") || "es";
    console.log(`[Server] Listener connected for: ${listenLang}`);
    
    // VALIDATION: Check if this language is currently active
    if (!activeBroadcasts.has(listenLang)) {
       console.log(`[Server] Denying listener for ${listenLang} (No active host)`);
       ws.send(JSON.stringify({ 
         type: 'error', 
         message: `Start a broadcast in ${listenLang} first.` 
       }));
       // Allow them to stay connected in case host starts? 
       // Or close. User said "display a message on other paths". 
       // If we close, they see "Disconnected". If we keep open, we can auto-join later.
       // Let's keep open but show error.
       // return; // Don't cleanup or return, just warn.
    } else {
       // Send welcome/status
        ws.send(JSON.stringify({ 
          type: 'info', 
          message: `Connected to LIVE ${listenLang} broadcast.` 
        }));
    }
    
    // Register listener
    if (!listeners.has(listenLang)) {
      listeners.set(listenLang, new Set());
    }
    listeners.get(listenLang)?.add(ws);

    ws.on("close", () => {
      console.log(`[Server] Listener disconnected from ${listenLang}`);
      listeners.get(listenLang)?.delete(ws);
    });
    
    ws.on("error", (err) => {
      console.error(`[Server] Listener error: ${err.message}`);
      listeners.get(listenLang)?.delete(ws);
    });
  }
  // VIDEO RELAY LOGIC
  else if (role === 'host-video') {
    console.log("[Server] Video Host connected");
    ws.on('message', (message) => {
      // Broadcast video frames to all active video listeners
      // Note: Video is language-agnostic for now (everyone sees same video)
      videoListeners.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
    ws.on('close', () => console.log("[Server] Video Host disconnected"));
  }
  else if (role === 'listener-video') {
    console.log("[Server] Video Listener connected");
    videoListeners.add(ws);
    ws.on('close', () => videoListeners.delete(ws));
  }
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
