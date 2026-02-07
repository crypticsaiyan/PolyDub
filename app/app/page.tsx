"use client"

import { useState, useCallback, useEffect } from "react"
import { MicController } from "@/components/polydub/mic-controller"
import { LanguageSelector } from "@/components/polydub/language-selector"
import { TranscriptView, TranscriptEntry } from "@/components/polydub/transcript-view"
import { WebcamBroadcaster } from "@/components/polydub/webcam-broadcaster"
import { useWebSocket } from "@/hooks/use-websocket"
import {
  Microphone,
  Translate,
  SpeakerHigh,
  Lightning,
  Waveform,
  Globe
} from "@phosphor-icons/react"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

export default function AppPage() {
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["es"])
  const [targetVoices, setTargetVoices] = useState<Record<string, string>>({})
  const [isRecording, setIsRecording] = useState(false)
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
    connect(sampleRate)
    setIsRecording(true)
    setTranscripts([])
    setPartialTranscript(undefined)
  }, [connect])

  const handleStop = useCallback(() => {
    disconnect()
    setIsRecording(false)
    setPartialTranscript(undefined)
  }, [disconnect])

  const handleMicAudioData = useCallback((chunk: ArrayBuffer) => sendAudio(chunk), [sendAudio])

  useEffect(() => {
    if (isRecording && connectionStatus === 'disconnected') setIsRecording(false)
  }, [isRecording, connectionStatus])

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
              </div>

              {/* Row 2: Video/Mic + Transcript */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Col 1: Video + Mic */}
                <div className="space-y-6">
                  <WebcamBroadcaster wsUrl={WS_URL} />
                  <MicController
                    isRecording={isRecording}
                    onStart={handleStart}
                    onStop={handleStop}
                    onAudioData={handleMicAudioData}
                    connectionStatus={connectionStatus}
                  />
                </div>

                {/* Col 2: Transcript */}
                <div className="h-full">
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
