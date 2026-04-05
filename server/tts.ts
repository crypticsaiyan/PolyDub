import { createClient } from "@deepgram/sdk";

export class TTSService {
  private deepgramClient: any;

  constructor(apiKey: string) {
    this.deepgramClient = createClient(apiKey);
  }

  private getVoiceForLanguage(lang: string, overrideVoiceId?: string): string {
    // If a specific voice ID is requested, use it (could validate against map but Deepgram validates anyway)
    if (overrideVoiceId) return overrideVoiceId;

    // Deepgram Aura current valid models are all English variants
    const VOICE_MAP: Record<string, string> = {
      'en': 'aura-asteria-en',
      'es': 'aura-stella-en',
      'fr': 'aura-athena-en',
      'de': 'aura-hera-en',
      'it': 'aura-asteria-en',
      'ja': 'aura-luna-en',
      'nl': 'aura-stella-en',
    };
    
    // Robust fallback: if language starts with 'en', 'es', etc.
    if (lang.startsWith('en')) return 'aura-asteria-en';
    if (lang.startsWith('es')) return 'aura-stella-en';
    if (lang.startsWith('fr')) return 'aura-athena-en';
    if (lang.startsWith('de')) return 'aura-hera-en';
    if (lang.startsWith('it')) return 'aura-asteria-en';
    if (lang.startsWith('ja')) return 'aura-luna-en';
    if (lang.startsWith('nl')) return 'aura-stella-en';
    
    return VOICE_MAP[lang] || 'aura-asteria-en';
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
