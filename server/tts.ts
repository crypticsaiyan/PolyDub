import { createClient } from "@deepgram/sdk";

export class TTSService {
  private deepgramClient: any;

  constructor(apiKey: string) {
    this.deepgramClient = createClient(apiKey);
  }

  private getVoiceForLanguage(lang: string, overrideVoiceId?: string): string {
    // If a specific voice ID is requested, use it (could validate against map but Deepgram validates anyway)
    if (overrideVoiceId) return overrideVoiceId;

    // Map languages to Aura voices
    // Using Aura-2 models as default for better quality
    const VOICE_MAP: Record<string, string> = {
      // English (US/UK) - Featured
      'en': 'aura-2-thalia-en',    // Thalia (US, F), Andromeda (US, F), Apollo (US, M), Arcas (US, M)
      
      // Spanish - Featured
      'es': 'aura-2-celeste-es',   // Celeste (CO, F), Estrella (MX, F), Nestor (ES, M)
      
      // French - Featured
      'fr': 'aura-2-agathe-fr',    // Agathe (F), Hector (M)
      
      // German - Featured
      'de': 'aura-2-viktoria-de',  // Viktoria (F), Julius (M)
      
      // Italian - Featured
      'it': 'aura-2-livia-it',     // Livia (F), Dionisio (M)
      
      // Japanese - Featured
      'ja': 'aura-2-fujin-ja',     // Fujin (M), Izanami (F)
      
      // Dutch - Featured
      'nl': 'aura-2-rhea-nl',      // Rhea (F), Sander (M), Beatrix (F)
    };
    
    // Deepgram voice names often follow pattern aura-[name]-[lang]
    // Robust fallback: if language starts with 'en', 'es', etc.
    if (lang.startsWith('en')) return 'aura-2-thalia-en';
    if (lang.startsWith('es')) return 'aura-2-celeste-es';
    if (lang.startsWith('fr')) return 'aura-2-agathe-fr';
    if (lang.startsWith('de')) return 'aura-2-viktoria-de';
    if (lang.startsWith('it')) return 'aura-2-livia-it';
    if (lang.startsWith('ja')) return 'aura-2-fujin-ja';
    if (lang.startsWith('nl')) return 'aura-2-rhea-nl';
    
    return VOICE_MAP[lang] || 'aura-2-thalia-en';
  }

  public async streamAudio(text: string, targetLang: string = 'en', onChunk: (chunk: Buffer) => void, voiceId?: string): Promise<void> {
    try {
      if (!text || text.trim().length === 0) {
        return;
      }

      console.log(`[TTS] Requesting audio for: "${text}" (${targetLang}) using voice: ${voiceId || 'default'}`);
      const model = this.getVoiceForLanguage(targetLang, voiceId);

      // REST API request for MP3 (easier for browser decoding)
      const response = await this.deepgramClient.speak.request(
        { text },
        { 
          model: model,
          encoding: "mp3",
        }
      );

      // Get audio buffer
      const stream = await response.getStream();
      
      if (stream) {
        const reader = stream.getReader();
        const chunks: Buffer[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(Buffer.from(value));
          }
        }

        // Combine all chunks into one valid MP3 buffer
        if (chunks.length > 0) {
           const completeBuffer = Buffer.concat(chunks);
           onChunk(completeBuffer);
        }
      }
      
    } catch (error) {
      console.error("[TTS] Error:", error);
    }
  }
}
