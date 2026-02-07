import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { ListenLiveClient } from "@deepgram/sdk";

export interface STTServiceOptions {
  apiKey: string;
  sourceLanguage: string;
  sampleRate?: number;
  onTranscript: (text: string, isFinal: boolean, detectedLanguage?: string) => void;
  onError: (error: any) => void;
}

export class STTService {
  private deepgramClient: any;
  private connection: ListenLiveClient | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor(private options: STTServiceOptions) {
    this.deepgramClient = createClient(options.apiKey);
  }

  public async start() {
    try {
      const deepgramOptions: any = {
        model: "nova-2",
        encoding: "linear16",
        sample_rate: this.options.sampleRate || 16000,
        channels: 1,
        interim_results: true,
        endpointing: 300,
      };

      if (this.options.sourceLanguage === 'multi' || this.options.sourceLanguage === 'auto') {
        // Fallback to English for now to test connection
        deepgramOptions.language = 'en-US';
      } else {
        deepgramOptions.language = this.options.sourceLanguage;
      }

      console.log("[STT] Connecting with simplified options:", JSON.stringify(deepgramOptions, null, 2));

      this.connection = this.deepgramClient.listen.live(deepgramOptions);

      if (!this.connection) {
        throw new Error("Failed to create Deepgram connection");
      }

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("[STT] Connection opened");
        
        // Keep connection alive
        this.keepAliveInterval = setInterval(() => {
          if (this.connection) {
            this.connection.keepAlive();
          }
        }, 10000);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("[STT] Connection closed");
        this.stop();
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const alternative = data.channel.alternatives[0];
        const transcript = alternative?.transcript;
        
        if (transcript && transcript.trim().length > 0) {
          const isFinal = data.is_final;
          // Extract detected language (if available, e.g. from 'multi' mode)
          const detectedLanguage = alternative.languages && alternative.languages.length > 0 
            ? alternative.languages[0] 
            : undefined;

          this.options.onTranscript(transcript, isFinal, detectedLanguage);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error("[STT] Error:", err);
        this.options.onError(err);
      });

    } catch (error) {
      console.error("[STT] Failed to start:", error);
      this.options.onError(error);
    }
  }

  public sendAudio(audio: Buffer) {
    if (this.connection && this.connection.getReadyState() === 1) { // 1 = OPEN
      // Convert Buffer to ArrayBuffer for Deepgram SDK
      const arrayBuffer = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength);
      this.connection.send(arrayBuffer);
    }
  }

  public stop() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.connection) {
      // this.connection.finish(); // Clean disconnect
      this.connection = null;
    }
  }
}
