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
    try {
      if (!text || text.trim().length === 0) {
        return;
      }

      console.log(`[TTS] Requesting audio for: "${text}" (${targetLang})`);
      const model = this.getVoiceForLanguage(targetLang);

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
