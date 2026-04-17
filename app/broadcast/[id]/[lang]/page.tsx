"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AudioPlayback, AudioPlaybackHandle } from "@/components/polydub/audio-playback"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Broadcast, Waveform, SpinnerGap } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { VideoReceiver, VideoReceiverRef } from "@/components/polydub/video-receiver"

interface Message {
  type: string
  original: string
  translated: string
  timestamp: number
  sourceLanguage?: string
  targetLanguage?: string
}

export default function AudioListenerPage() {
  const params = useParams()
  const broadcastId = typeof params.id === 'string' ? params.id : ''
  const langCode = typeof params.lang === 'string' ? params.lang : 'en'

  const [hasJoined, setHasJoined] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([])
  const [error, setError] = useState<string | null>(null)

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const videoReceiverRef = useRef<VideoReceiverRef>(null)
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioPlaybackRef = useRef<AudioPlaybackHandle>(null)
  const ttsMetaRef = useRef<{ sampleRate: number } | null>(null)

  useEffect(() => {
    if (audioContext && !recordingDestRef.current) {
      try {
        recordingDestRef.current = audioContext.createMediaStreamDestination()
      } catch (e) {
        console.error("Failed to create recording destination", e)
      }
    }
  }, [audioContext])

  const handleJoin = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      await ctx.resume()
      setAudioContext(ctx)
      setHasJoined(true)
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e)
      setHasJoined(true)
    }
  }

  useEffect(() => {
    if (!hasJoined) return

    const wsUrl = `${WS_URL}?role=listener&id=${broadcastId}&lang=${langCode}`
    console.log("Connecting to Listener Broadcast:", wsUrl)

    const ws = new WebSocket(wsUrl)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const sampleRate = ttsMetaRef.current?.sampleRate ?? 24000
        audioPlaybackRef.current?.playPCM(event.data, sampleRate)
        return
      }

      try {
        if (typeof event.data !== 'string') return
        const data = JSON.parse(event.data)

        if (data.type === "transcript") {
          setIsWaiting(false)
          setMessages(prev => [...prev, data])
        } else if (data.type === "tts-start") {
          ttsMetaRef.current = { sampleRate: data.sampleRate ?? 24000 }
        } else if (data.type === "tts-end") {
          ttsMetaRef.current = null
        } else if (data.type === "info") {
          setIsWaiting(false)
          console.log("Server Info:", data.message)
        } else if (data.type === "waiting") {
          setIsWaiting(true)
        } else if (data.type === "error") {
          setError(data.message)
          ws.close()
        }
      } catch (e) {
        console.error("Failed to parse message", e)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [broadcastId, langCode, hasJoined])

  const handleAudioPlayed = () => {
    setAudioQueue((prev) => prev.slice(1))
  }

  const handleStartRecording = () => {
    if (!recordingDestRef.current || !videoReceiverRef.current) return

    const videoStream = videoReceiverRef.current.captureStream()
    const audioStream = recordingDestRef.current.stream

    if (!videoStream) return

    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ])

    try {
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' })
      recordedChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `polydub-recording-${langCode}-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsRecording(false)
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (e) {
      console.error("Failed to start MediaRecorder", e)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleDownloadTranscript = () => {
    const content = messages.map(m =>
      `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sourceLanguage?.toUpperCase() || '?'} -> ${m.targetLanguage?.toUpperCase() || '?'}:\nOriginal: ${m.original}\nTranslated: ${m.translated}\n`
    ).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${langCode}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <Card className="max-w-sm w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
              <Broadcast className="h-6 w-6 text-primary" weight="fill" />
            </div>
            <CardTitle>Join Broadcast</CardTitle>
            <CardDescription>
              Listen to the live translation in {langCode.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleJoin} className="w-full">
              Join & Enable Audio
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Click below to start listening. Ensure your speakers are on.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <Card className="max-w-sm w-full border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center">
              <Broadcast className="h-6 w-6 text-destructive" weight="regular" />
            </div>
            <CardTitle className="text-destructive">Broadcast Unavailable</CardTitle>
            <CardDescription className="text-destructive/80 font-medium">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-20 pb-8 md:px-8 md:pt-24">
      <div className="w-full max-w-5xl space-y-6">

        {/* Waiting overlay shown inside video area */}
        {isWaiting ? (
          <Card className="overflow-hidden bg-black border-border/50">
            <CardContent className="p-0 relative aspect-video flex flex-col items-center justify-center text-muted-foreground/60">
              <SpinnerGap className="w-10 h-10 mb-3 animate-spin" weight="bold" />
              <span className="text-sm font-medium">Waiting for the broadcaster to start…</span>
            </CardContent>
          </Card>
        ) : (
          <div className="relative group rounded-lg overflow-hidden border border-border/50 shadow-sm">
            <VideoReceiver
              ref={videoReceiverRef}
              wsUrl={WS_URL}
              broadcastId={broadcastId}
              delayMs={0}
              startRendering={isConnected}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              {!isRecording ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartRecording}
                  className="shadow-lg backdrop-blur-md bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                  Record Session
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopRecording}
                  className="shadow-lg animate-pulse"
                >
                  <div className="h-2 w-2 rounded-sm bg-white mr-2" />
                  Stop & Save
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Broadcast className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">PolyDub Live</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1 border-primary/20 h-5 px-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? (isWaiting ? "bg-yellow-400 animate-pulse" : "bg-green-500 animate-pulse") : "bg-gray-400"}`} />
                  {isConnected ? (isWaiting ? "Waiting" : "Live") : "Connecting..."}
                </Badge>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {langCode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AudioPlayback
              ref={audioPlaybackRef}
              audioQueue={audioQueue}
              onAudioPlayed={handleAudioPlayed}
              isEnabled={true}
              audioContext={audioContext}
              recordingDestination={recordingDestRef.current}
            />
          </div>
        </div>

        <Card className="h-[300px] flex flex-col overflow-hidden shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Waveform className="h-4 w-4" />
                Live Transcripts
              </CardTitle>
              <CardDescription>Real-time translations appearing here</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadTranscript}
              className="group h-10 px-2 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-full flex items-center gap-2 sm:gap-0 sm:hover:gap-2 border border-transparent hover:border-primary/10"
            >
              <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm shrink-0">
                <Waveform className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold overflow-hidden whitespace-nowrap opacity-100 max-w-[120px] sm:max-w-0 sm:opacity-0 transition-all duration-300 sm:group-hover:max-w-[120px] sm:group-hover:opacity-100">
                Download Transcript
              </span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground italic py-10">
                    {isWaiting ? "Waiting for the broadcaster to start speaking..." : "Waiting for speaker to start talking..."}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-semibold text-primary break-words">{msg.translated}</p>
                    <p className="text-xs text-muted-foreground italic break-words">Original ({msg.sourceLanguage}): {msg.original}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/50">
          Make sure your audio output device is set correctly.
        </div>
      </div>
    </div>
  )
}
