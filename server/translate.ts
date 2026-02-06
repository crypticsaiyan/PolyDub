import { LingoDotDevEngine } from "lingo.dev/sdk";

export class TranslationService {
  private engine: LingoDotDevEngine;

  constructor(apiKey: string) {
    // Initialize Lingo.dev engine
    this.engine = new LingoDotDevEngine({
      apiKey: apiKey,
    });
  }

  public async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        return "";
      }

      console.log(`[Translate] Translating "${text}" from ${sourceLang} to ${targetLang}`);

      // The new SDK uses localizeText instead of translate
      const result = await this.engine.localizeText(text, {
        sourceLocale: sourceLang as any, // Type assertion might be needed if strict types
        targetLocale: targetLang as any,
        fast: true // Optimize for real-time
      });

      console.log(`[Translate] Result: "${result}"`);
      return result;
    } catch (error) {
      console.error("[Translate] Error:", error);
      // Fallback: return original text to avoid silence
      return text;
    }
  }
}
