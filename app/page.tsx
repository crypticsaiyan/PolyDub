"use client"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MicController } from "@/components/polydub/mic-controller"
import { LanguageSelector } from "@/components/polydub/language-selector"
import { TranscriptView, TranscriptEntry } from "@/components/polydub/transcript-view"
import { AudioPlayback } from "@/components/polydub/audio-playback"
import { useWebSocket } from "@/hooks/use-websocket"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkle, 
  Microphone, 
  Translate, 
  SpeakerHigh,
  Lightning,
  ArrowRight,
  Waveform,
  Globe
} from "@phosphor-icons/react"

// WebSocket server URL - update this for production
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

export default function Home() {
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("es")
  const [isRecording, setIsRecording] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [partialTranscript, setPartialTranscript] = useState<{ original: string; translated?: string } | undefined>()
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([])

  // Handle new transcript entries
  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscripts(prev => [...prev, entry])
    setPartialTranscript(undefined)
  }, [])

  // Handle partial transcripts
  const handlePartialTranscript = useCallback((partial: { original: string; translated?: string }) => {
    setPartialTranscript(partial)
  }, [])

  // Handle incoming audio
  const handleAudioData = useCallback((audio: ArrayBuffer) => {
    setAudioQueue(prev => [...prev, audio])
  }, [])

  // Handle audio played
  const handleAudioPlayed = useCallback(() => {
    setAudioQueue(prev => prev.slice(1))
  }, [])

  // WebSocket connection
  const { 
    connect, 
    disconnect, 
    sendAudio, 
    connectionStatus,
    error 
  } = useWebSocket({
    url: WS_URL,
    sourceLanguage,
    targetLanguage,
    onTranscript: handleTranscript,
    onPartialTranscript: handlePartialTranscript,
    onAudioData: handleAudioData,
  })

  // Handle recording start
  const handleStart = useCallback(() => {
    connect()
    setIsRecording(true)
    setTranscripts([])
    setPartialTranscript(undefined)
    setAudioQueue([])
  }, [connect])

  // Handle recording stop
  const handleStop = useCallback(() => {
    disconnect()
    setIsRecording(false)
    setPartialTranscript(undefined)
  }, [disconnect])

  // Handle audio data from microphone
  const handleMicAudioData = useCallback((chunk: ArrayBuffer) => {
    sendAudio(chunk)
  }, [sendAudio])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" /> {/* Spacer for fixed header */}
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
          
          <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12 py-16 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5">
                <Sparkle className="h-4 w-4 text-accent" weight="fill" />
                <span className="text-sm font-medium text-accent">
                  Powered by Lingo.dev + Deepgram
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
                PolyDub
                <span className="block text-2xl sm:text-3xl font-medium text-muted-foreground mt-2">
                  Real-Time Voice Translator
                </span>
              </h1>
              <p className="text-lg leading-8 text-muted-foreground max-w-xl mx-auto">
                Speak in any language and hear instant translations. 
                Powered by cutting-edge AI for natural, real-time voice translation.
              </p>
            </div>
          </div>
        </section>

        {/* Main Application Section */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column: Controls */}
              <div className="space-y-6">
                {/* Language Selector */}
                <LanguageSelector
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  onSourceLanguageChange={setSourceLanguage}
                  onTargetLanguageChange={setTargetLanguage}
                  disabled={isRecording}
                />

                {/* Microphone Controller */}
                <MicController
                  isRecording={isRecording}
                  onStart={handleStart}
                  onStop={handleStop}
                  onAudioData={handleMicAudioData}
                  connectionStatus={connectionStatus}
                />

                {/* Audio Playback */}
                <AudioPlayback
                  audioQueue={audioQueue}
                  onAudioPlayed={handleAudioPlayed}
                  isEnabled={isRecording}
                />

                {/* Error display */}
                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Transcript */}
              <div>
                <TranscriptView
                  entries={transcripts}
                  isListening={isRecording}
                  currentPartial={partialTranscript}
                />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 sm:py-24 border-t border-border">
          <div className="mx-auto max-w-5xl px-6 lg:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real-time voice translation in three simple steps
              </p>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Microphone className="h-8 w-8" weight="fill" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Speak</h3>
                <p className="text-sm text-muted-foreground">
                  Select your languages and start speaking naturally into your microphone
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="hidden sm:block absolute top-8 -left-4 right-full">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Translate className="h-8 w-8" weight="fill" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Translate</h3>
                <p className="text-sm text-muted-foreground">
                  AI transcribes and translates your speech in real-time using Lingo.dev
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="hidden sm:block absolute top-8 -left-4 right-full">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <SpeakerHigh className="h-8 w-8" weight="fill" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Listen</h3>
                <p className="text-sm text-muted-foreground">
                  Hear the translated speech instantly with natural-sounding AI voice
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 sm:py-20 border-t border-border bg-card/30">
          <div className="mx-auto max-w-5xl px-6 lg:px-12">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-accent border-accent/30">
                <Lightning className="h-3 w-3 mr-1" weight="fill" />
                Tech Stack
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-4">
                Built for the Lingo.dev Hackathon
              </h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Waveform className="h-5 w-5 text-accent" weight="fill" />
                  </div>
                  <h3 className="font-semibold">Deepgram</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time speech-to-text and text-to-speech with Aura voices
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-accent" weight="fill" />
                  </div>
                  <h3 className="font-semibold">Lingo.dev</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered translation for natural, context-aware results
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Lightning className="h-5 w-5 text-accent" weight="fill" />
                  </div>
                  <h3 className="font-semibold">WebSockets</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bi-directional streaming for ultra-low latency communication
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
