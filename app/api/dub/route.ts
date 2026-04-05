import { NextRequest, NextResponse } from "next/server";
import { TranslationService } from "@/server/translate";
import { TTSService } from "@/server/tts";
import { createClient } from "@deepgram/sdk";
import { convertUtterancesToSRT } from "@/lib/srt";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetLanguage = formData.get("targetLanguage") as string;
    const sourceLanguage = formData.get("sourceLanguage") as string || "auto";
    const targetVoice = formData.get("voiceId") as string | null;

    if (!file || !targetLanguage) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!process.env.DEEPGRAM_API_KEY || !process.env.LINGO_API_KEY) {
      return NextResponse.json({ error: "Missing API Keys" }, { status: 500 });
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const translationService = new TranslationService(process.env.LINGO_API_KEY);
    const ttsService = new TTSService(process.env.DEEPGRAM_API_KEY);
    
    const buffer = await file.arrayBuffer();

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(buffer),
      {
        ...(sourceLanguage !== 'auto' ? { model: "nova-2", language: sourceLanguage } : { detect_language: true }),
        smart_format: true,
        utterances: true,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const utterances = result.results?.utterances || [];
    const translatedUtterances: { start: number; end: number; translated: string }[] = [];
    const audioChunks: Buffer[] = [];
    
    for (const u of utterances) {
       const detectedLang = sourceLanguage === 'auto' ? (u as any).language || 'en' : sourceLanguage;
       const translated = await translationService.translate(u.transcript, detectedLang, targetLanguage);
       
       translatedUtterances.push({
         start: u.start,
         end: u.end,
         translated: translated
       });

       await new Promise<void>((resolve) => {
          ttsService.streamAudio(translated, targetLanguage, (chunk) => {
             audioChunks.push(chunk);
          }, targetVoice || undefined).then(() => resolve());
       });
    }

    const srtString = convertUtterancesToSRT(translatedUtterances);
    const finalAudio = Buffer.concat(audioChunks);

    return NextResponse.json({
      srt: srtString,
      mp3: finalAudio.toString('base64')
    });
  } catch (err: any) {
    console.error("Dubbing route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
