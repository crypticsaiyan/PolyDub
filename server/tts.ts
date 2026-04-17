import { createClient } from "@deepgram/sdk";

export class TTSService {
  private deepgramClient: any;

  constructor(apiKey: string) {
    this.deepgramClient = createClient(apiKey);
  }

  private getVoiceForLanguage(lang: string, overrideVoiceId?: string): string {
    if (overrideVoiceId) return overrideVoiceId;

    // Aura 2 native voices (scraped from developers.deepgram.com/docs/tts-models)
    // Only EN, ES, FR, DE, IT, JA, NL have native Aura 2 voices.
    // All other languages (hi, ar, ko, zh, pt, tr, vi, uk, pl) are not supported
    // natively — Deepgram will render them with an English-accented voice regardless.
    if (lang.startsWith('en')) return 'aura-2-thalia-en';
    if (lang.startsWith('es')) return 'aura-2-celeste-es';
    if (lang.startsWith('fr')) return 'aura-2-agathe-fr';
    if (lang.startsWith('de')) return 'aura-2-viktoria-de';
    if (lang.startsWith('it')) return 'aura-2-livia-it';
    if (lang.startsWith('ja')) return 'aura-2-izanami-ja';
    if (lang.startsWith('nl')) return 'aura-2-rhea-nl';

    return 'aura-2-thalia-en';
  }

  public async streamAudio(
    text: string,
    targetLang: string = 'en',
    onChunk: (chunk: Buffer) => void,
    voiceId?: string,
    options?: { progressive?: boolean; encoding?: "mp3" | "linear16"; sampleRate?: number }
  ): Promise<void> {
    try {
      if (!text || text.trim().length === 0) {
        return;
      }

      console.log(`[TTS] Requesting audio for: "${text}" (${targetLang})`);
      const model = this.getVoiceForLanguage(targetLang, voiceId);
      const progressive = options?.progressive !== false;
      const encoding = options?.encoding || "mp3";
      const sampleRate = options?.sampleRate || 24000;

      const speakOptions: Record<string, unknown> = { model, encoding };
      if (encoding === "linear16") {
        speakOptions.sample_rate = sampleRate;
        speakOptions.container = "none";
      }

      const response = await this.deepgramClient.speak.request({ text }, speakOptions);
      const stream = await response.getStream();

      if (stream) {
        const reader = stream.getReader();
        const chunks: Buffer[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const buf = Buffer.from(value);
            if (progressive) {
              onChunk(buf);
            } else {
              chunks.push(buf);
            }
          }
        }

        if (!progressive && chunks.length > 0) {
          onChunk(Buffer.concat(chunks));
        }
      }

    } catch (error) {
      console.error("[TTS] Error:", error);
    }
  }
}
