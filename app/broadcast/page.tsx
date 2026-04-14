"use client"

import { useState, useCallback } from "react"
import { MicController } from "@/components/polydub/mic-controller"
import { LanguageSelector } from "@/components/polydub/language-selector"
import { TranscriptView, TranscriptEntry } from "@/components/polydub/transcript-view"
import { Button } from "@/components/ui/button"
import { WebcamBroadcaster } from "@/components/polydub/webcam-broadcaster"
import { useWebSocket } from "@/hooks/use-websocket"
import { convertLiveTranscriptsToSRT } from "@/lib/srt"
import {
  Microphone,
  Translate,
  SpeakerHigh,
  Lightning,
  Waveform,
  Globe,
  DownloadSimple
} from "@phosphor-icons/react"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

export default function AppPage() {
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["es"])
  const [targetVoices, setTargetVoices] = useState<Record<string, string>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [broadcastValidationError, setBroadcastValidationError] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [partialTranscript, setPartialTranscript] = useState<{ original: string; translated?: string } | undefined>()

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => [...prev, entry])
    setPartialTranscript(undefined)
  }, [])

  const handlePartialTranscript = useCallback((partial: { original: string; translated?: string }) => {
    setPartialTranscript(partial)
  }, [])

  const handleAudioData = useCallback((_audio: ArrayBuffer) => {}, [])

  const handleToggleTargetLanguage = useCallback((lang: string) => {
    setTargetLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
    setBroadcastValidationError(null)
  }, [])

  const handleVoiceChange = useCallback((lang: string, voiceId: string) => {
    setTargetVoices(prev => ({ ...prev, [lang]: voiceId }))
  }, [])

  const {
    connect,
    disconnect,
    sendAudio,
    connectionStatus,
    error,
  } = useWebSocket({
    url: WS_URL,
    sourceLanguage,
    targetLanguages,
    targetVoices,
    onTranscript: handleTranscript,
    onPartialTranscript: handlePartialTranscript,
    onAudioData: handleAudioData,
  })

  const handleStart = useCallback((sampleRate?: number) => {
    if (targetLanguages.length === 0) {
      setBroadcastValidationError("Please select at least one target language")
      return
    }

    setBroadcastValidationError(null)
    connect(sampleRate)
    setIsRecording(true)
    setTranscripts([])
    setPartialTranscript(undefined)
  }, [connect, targetLanguages])

  const handleStop = useCallback(() => {
    disconnect()
    setIsRecording(false)
    setPartialTranscript(undefined)
  }, [disconnect])

  const handleMicAudioData = useCallback((chunk: ArrayBuffer) => sendAudio(chunk), [sendAudio])

  const handleDownloadSRT = useCallback(() => {
    if (transcripts.length === 0) return;
    const srt = convertLiveTranscriptsToSRT(transcripts.map(t => ({
       original: t.original,
       translated: t.translated,
       timestamp: t.timestamp
    })));
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broadcast_subtitles_${targetLanguages.join("_")}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [transcripts, targetLanguages]);

  return (
    <div className="flex-1 w-full bg-background">
      <div className="h-16" />
      <main>
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-12">
            <div className="flex flex-col gap-6">
              {/* Row 1: Language Selector (Full Width) */}
              <div className="w-full">
                <LanguageSelector
                  sourceLanguage={sourceLanguage}
                  targetLanguages={targetLanguages}
                  targetVoices={targetVoices}
                  onSourceLanguageChange={setSourceLanguage}
                  onToggleTargetLanguage={handleToggleTargetLanguage}
                  onVoiceChange={handleVoiceChange}
                  disabled={isRecording}
                />
                {error && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                {broadcastValidationError && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{broadcastValidationError}</p>
                  </div>
                )}
                {targetLanguages.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg border bg-muted/20 space-y-2">
                    <p className="text-xs text-muted-foreground">Listener link</p>
                    <div className="space-y-1">
                      {targetLanguages.map((lang) => (
                        <p key={lang} className="text-sm font-mono break-all">
                          {typeof window !== "undefined" ? `${window.location.origin}/broadcast/${lang}` : `/broadcast/${lang}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Video/Mic + Transcript */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Col 1: Video + Mic */}
                <div className="space-y-6">
                  <WebcamBroadcaster
                    wsUrl={WS_URL}
                    canStart={targetLanguages.length > 0}
                    blockedReason="Please select at least one target language"
                  />
                  <MicController
                    isRecording={isRecording}
                    onStart={handleStart}
                    onStop={handleStop}
                    onAudioData={handleMicAudioData}
                    connectionStatus={connectionStatus}
                    canStart={targetLanguages.length > 0}
                    blockedReason="Please select at least one target language"
                  />
                </div>

                {/* Col 2: Transcript */}
                <div className="h-full flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                     <h3 className="font-semibold text-lg">Live Transcript</h3>
                     <Button 
                         variant="outline" 
                         size="sm" 
                         disabled={transcripts.length === 0}
                         onClick={handleDownloadSRT}
                         className="gap-2"
                     >
                         <DownloadSimple className="h-4 w-4" /> Download .SRT
                     </Button>
                  </div>
                  <TranscriptView
                    entries={transcripts}
                    isListening={isRecording}
                    currentPartial={partialTranscript}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
