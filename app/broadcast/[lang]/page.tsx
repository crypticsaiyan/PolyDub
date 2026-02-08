"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AudioPlayback } from "@/components/polydub/audio-playback"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Broadcast, Waveform } from "@phosphor-icons/react"
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
  const langCode = typeof params.lang === 'string' ? params.lang : 'en'
  
  const [hasJoined, setHasJoined] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Lifted AudioContext to ensure user activation works
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [hasAudioStarted, setHasAudioStarted] = useState(false)
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const videoReceiverRef = useRef<VideoReceiverRef>(null)
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize Recording Destination when AudioContext is ready
  useEffect(() => {
     if (audioContext && !recordingDestRef.current) {
         try {
             // Create a destination node that we can record from
             const dest = audioContext.createMediaStreamDestination()
             recordingDestRef.current = dest
             console.log("Recording destination created")
         } catch (e) {
             console.error("Failed to create recording destination", e)
         }
     }
  }, [audioContext])

  // Join handler to unlock Audio Context & Permissions
  const handleJoin = async () => {
    try {
       // Create and resume context immediately on user click
       const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
       await ctx.resume()
       console.log("AudioContext resumed:", ctx.state)
       setAudioContext(ctx)
       setHasJoined(true)
    } catch (e) {
       console.error("Failed to initialize AudioContext:", e)
       // Continue anyway
       setHasJoined(true)
    }
  }

  // ... useEffect for WebSocket ...
  useEffect(() => {
    if (!hasJoined) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.hostname === "localhost" 
      ? "localhost:8080" 
      : window.location.host
    
    const wsUrl = `${protocol}//${host}?role=listener&lang=${langCode}`
    
    console.log("Connecting to Listener Broadcast:", wsUrl)
    
    const ws = new WebSocket(wsUrl)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      console.log("Connected to Broadcast Stream")
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        console.log("Received Audio Chunk:", event.data.byteLength, "bytes")
        setAudioQueue(prev => [...prev, event.data])
        setHasAudioStarted(true)
        return
      }
      
      try {
        if (typeof event.data !== 'string') return

        const data = JSON.parse(event.data)
        
        if (data.type === "transcript") {
          setMessages(prev => [...prev, data])
        } else if (data.type === "info") {
          console.log("Server Info:", data.message)
        } else if (data.type === "error") {
             setError(data.message)
             ws.close()
        }
      } catch (e) {
        console.error("Failed to parse message", e)
      }
    }

    ws.onclose = () => {
      console.log("Disconnected from Broadcast")
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [langCode, hasJoined])

  const handleAudioPlayed = () => {
    setAudioQueue((prev) => prev.slice(1))
  }

  const handleStartRecording = () => {
      if (!recordingDestRef.current || !videoReceiverRef.current) {
          console.error("Recording not ready (No AudioContext or VideoRef)")
          return
      }

      const videoStream = videoReceiverRef.current.captureStream()
      const audioStream = recordingDestRef.current.stream
      
      if (!videoStream) {
          console.error("Failed to capture video stream")
          return 
      }

      // Combine tracks: Video from Canvas, Audio from WebAudio destination
      const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks()
      ])

      try {
          const recorder = new MediaRecorder(combinedStream, {
              mimeType: 'video/webm;codecs=vp9,opus'
          })
          
          recordedChunksRef.current = []
          
          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                  recordedChunksRef.current.push(e.data)
              }
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

          recorder.start(1000) // Collect chunks every second
          mediaRecorderRef.current = recorder
          setIsRecording(true)
          console.log("Recording started")
      } catch (e) {
          console.error("Failed to start MediaRecorder", e)
      }
  }

  const handleStopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
          console.log("Recording stopped")
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

  // 1. Join Screen
  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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

  // 2. Error Screen (Blocked, or Host Offline)
  if (error) {
     return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Video Player - Primary Focus */}
        <div className="relative group rounded-lg overflow-hidden border border-border/50 shadow-sm">
            <VideoReceiver 
                ref={videoReceiverRef}
                wsUrl="ws://localhost:8080" 
                delayMs={8000} 
                startRendering={hasAudioStarted} 
            />
            
            {/* Recording Controls Overlay */}
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

        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                 <Broadcast className="h-5 w-5 text-primary" weight="fill" />
              </div>
              <div>
                 <h1 className="text-lg font-bold tracking-tight">PolyDub Live</h1>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1 border-primary/20 h-5 px-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                      {isConnected ? "Live" : "Connecting..."}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {langCode.toUpperCase()}
                    </span>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-2 w-full sm:w-auto">
               {/* Audio Controls */}
               <AudioPlayback 
                  audioQueue={audioQueue}
                  onAudioPlayed={handleAudioPlayed}
                  isEnabled={true}
                  audioContext={audioContext}
                  recordingDestination={recordingDestRef.current}
               />
           </div>
        </div>

        {/* Transcript Feed */}
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
                className="group h-10 px-2 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-full flex items-center gap-0 hover:gap-2 border border-transparent hover:border-primary/10"
             >
                <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                    <Waveform className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
                    Download Transcript
                </span>
             </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground italic py-10">
                    Waiting for speaker to start talking...
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
