const CACHE_MAX = 500;

// Normalize "en-US" → "en", "zh-CN" → "zh-CN" (Google keeps region for CJK)
function normalizeLang(lang: string): string {
  if (!lang) return "en";
  const lower = lang.toLowerCase();
  // Keep full tag for Chinese variants
  if (lower.startsWith("zh")) return lang;
  return lang.split("-")[0].split("_")[0];
}

async function googleTranslate(text: string, source: string, target: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: normalizeLang(source),
    tl: normalizeLang(target),
    dt: "t",
    q: text,
  });
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const data: any = await res.json();
  // data[0] is an array of [translated_chunk, original_chunk, ...]
  return (data[0] as any[]).map((item: any) => item[0]).join("");
}

export class TranslationService {
  private cache = new Map<string, string>();
  private inflight = new Map<string, Promise<string>>();

  private cacheKey(text: string, sourceLang: string, targetLang: string) {
    return `${normalizeLang(sourceLang)}|${normalizeLang(targetLang)}|${text}`;
  }

  private remember(key: string, value: string) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  public async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (!text || text.trim().length === 0) return "";
    if (normalizeLang(sourceLang) === normalizeLang(targetLang)) return text;

    const key = this.cacheKey(text, sourceLang, targetLang);
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const result = await googleTranslate(text, sourceLang, targetLang);
        this.remember(key, result);
        return result;
      } catch (error) {
        console.error("[Translate] Error:", error);
        return text; // fallback: return original
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }
}
