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

console.log(`[Server] Starting WebSocket server on port ${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const sourceLang = url.searchParams.get("source") || "en";
  const targetLang = url.searchParams.get("target") || "es";
  const sampleRate = parseInt(url.searchParams.get("sample_rate") || "16000", 10);
  
  console.log(`[Server] Client connected: ${sourceLang} -> ${targetLang} (${sampleRate}Hz)`);

  // Initialize STT Service
  
  // Simple debounce/throttle for partial translations
  let lastPartialTime = 0;
  const PARTIAL_INTERVAL = 1500; // Only translate partials every 1.5s to avoid rate limits
  let partialTranslateInProgress = false;

  const sttService = new STTService({
    apiKey: DEEPGRAM_API_KEY,
    // Use 'multi' for auto-detect to leverage Nova-3's multilingual capabilities
    sourceLanguage: sourceLang === 'auto' ? 'multi' : sourceLang,
    sampleRate: sampleRate,
    onTranscript: async (text, isFinal, detectedLanguage) => {
      const now = Date.now();
      
      // Determine actual source language
      // If auto-detect ('multi'), prioritize the detected language from Nova-3
      // Fallback to 'en' if nothing detected yet
      const actualSourceLang = (sourceLang === 'auto' && detectedLanguage) 
        ? detectedLanguage 
        : (sourceLang === 'auto' ? 'en' : sourceLang);

      // Send original transcript back immediately
      if (ws.readyState === WebSocket.OPEN) {
        // Prepare base message
        const msg: any = {
          type: isFinal ? "transcript" : "partial",
          original: text,
          translated: "", 
          timestamp: now,
          sourceLanguage: actualSourceLang,
          targetLanguage: targetLang
        };

        // Try to translate partials if enough time passed
        if (!isFinal && !partialTranslateInProgress && (now - lastPartialTime > PARTIAL_INTERVAL) && text.length > 5) {
          partialTranslateInProgress = true;
          lastPartialTime = now;
          
          translationService.translate(text, actualSourceLang, targetLang)
            .then(translated => {
              // Send the partial translation update
              if (ws.readyState === WebSocket.OPEN) {
                 ws.send(JSON.stringify({
                   type: "partial",
                   original: text,
                   translated: translated,
                   timestamp: Date.now()
                 }));
              }
            })
            .catch(err => console.error("Partial translate err:", err))
            .finally(() => { partialTranslateInProgress = false; });
        }

        // For final, waiting for translation...
        if (!isFinal) {
           ws.send(JSON.stringify(msg));
        }
      }

      if (isFinal && text.trim().length > 0) {
        console.log(`[STT] Final: "${text}" (Detected: ${detectedLanguage || 'N/A'})`);
        
        try {
          // 1. Translate
          const translatedText = await translationService.translate(text, actualSourceLang, targetLang);
          
          // Send final translated text
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "transcript",
              original: text, // ensure original is consistent
              translated: translatedText,
              timestamp: Date.now(),
              sourceLanguage: actualSourceLang,
              targetLanguage: targetLang
            }));
          }

          // 2. TTS Streaming
          if (ws.readyState === WebSocket.OPEN && translatedText) {
             await ttsService.streamAudio(translatedText, targetLang, (chunk) => {
                if (ws.readyState === WebSocket.OPEN) {
                   ws.send(chunk);
                }
             });
          }
        } catch (pipelineError) {
          console.error("[Pipeline] Error:", pipelineError);
        }
      }
    },
    onError: (err) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "error",
          message: "STT Error occurred"
        }));
      }
    }
  });

  sttService.start();

  ws.on("message", (message: Buffer | ArrayBuffer | Buffer[]) => {
    // Handle binary audio data
    if (Buffer.isBuffer(message)) {
      sttService.sendAudio(message);
    } else if (message instanceof ArrayBuffer) {
      sttService.sendAudio(Buffer.from(message));
    } else if (Array.isArray(message)) {
        // Handle Buffer[] if needed, for now join them or ignore
        const combined = Buffer.concat(message);
        sttService.sendAudio(combined);
    }
  });

  ws.on("close", () => {
    console.log("[Server] Client disconnected");
    sttService.stop();
  });

  ws.on("error", (error: Error) => {
    console.error(`[Server] WebSocket error: ${error.message}`);
    sttService.stop();
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
