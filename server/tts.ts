import { createClient } from "@deepgram/sdk";

export class TTSService {
  private deepgramClient: any;

  constructor(apiKey: string) {
    this.deepgramClient = createClient(apiKey);
  }

  private getVoiceForLanguage(lang: string): string {
    // Map languages to Aura voices
    // Using Aura-2 models as default for better quality
    const VOICE_MAP: Record<string, string> = {
      'en': 'aura-asteria-en',    // English (US)
      'es': 'aura-2-estrella-es', // Spanish (Mexican)
      'fr': 'aura-2-agathe-fr',   // French
      'de': 'aura-2-viktoria-de', // German
      'it': 'aura-2-livia-it',    // Italian
      'ja': 'aura-2-fujin-ja',    // Japanese
      'nl': 'aura-2-beatrix-nl',  // Dutch
    };
    
    // Deepgram voice names often follow pattern aura-[name]-[lang]
    // Robust fallback: if language starts with 'en', 'es', etc.
    if (lang.startsWith('en')) return 'aura-asteria-en';
    if (lang.startsWith('es')) return 'aura-2-estrella-es';
    if (lang.startsWith('fr')) return 'aura-2-agathe-fr';
    if (lang.startsWith('de')) return 'aura-2-viktoria-de';
    if (lang.startsWith('it')) return 'aura-2-livia-it';
    if (lang.startsWith('ja')) return 'aura-2-fujin-ja';
    if (lang.startsWith('nl')) return 'aura-2-beatrix-nl';
    
    return VOICE_MAP[lang] || 'aura-asteria-en';
  }

  public async streamAudio(text: string, targetLang: string = 'en', onChunk: (chunk: Buffer) => void): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!text || text.trim().length === 0) {
          resolve();
          return;
        }

        console.log(`[TTS] Streaming audio (Live) for: "${text}" (${targetLang})`);
        const model = this.getVoiceForLanguage(targetLang);

        const dgConnection = this.deepgramClient.speak.live({
            model: model,
            encoding: "linear16",
            sample_rate: 24000,
        });

        dgConnection.on("Open", () => {
             dgConnection.sendText(text);
             dgConnection.flush();
        });

        dgConnection.on("Audio", (data: any) => {
            if (data) {
                onChunk(Buffer.from(data));
            }
        });

        dgConnection.on("Flushed", () => {
            console.log("[TTS] Flushed, closing connection");
            try {
               // @ts-ignore
               if (dgConnection.finish) dgConnection.finish();
               // @ts-ignore
               else if (dgConnection.close) dgConnection.close();
            } catch (e) {
               console.log("Close error", e);
            }
        });

        dgConnection.on("Error", (err: any) => {
            console.error("[TTS] Live Error:", err);
            resolve();
        });
        
        dgConnection.on("Close", () => {
            resolve();
        });

      } catch (error) {
        console.error("[TTS] Error:", error);
        resolve();
      }
    });
  }
}
