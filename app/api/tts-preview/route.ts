
import { NextRequest, NextResponse } from 'next/server';
import { TTSService } from '@/server/tts';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    const { text, voiceId, lang } = await req.json();

    if (!text || !voiceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const ttsService = new TTSService(DEEPGRAM_API_KEY);
    
    // We can use a readable stream to pipe data
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            await ttsService.streamAudio(text, lang || 'en', (chunk) => {
                try {
                    controller.enqueue(chunk);
                } catch (e) {
                    // Controller already closed
                }
            }, voiceId);
            try {
                controller.close();
            } catch (e) {
                // Controller already closed
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'audio/mpeg',
        }
    });

  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
