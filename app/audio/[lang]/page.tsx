"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AudioPlayback } from "@/components/polydub/audio-playback"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Broadcast, Waveform } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

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
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
              Listen to the live translation in <strong>{langCode.toUpperCase()}</strong>
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

  // 3. Main Player
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
             <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Broadcast className="h-8 w-8 text-primary" weight="fill" />
             </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PolyDub Live Broadcast</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
             <Badge variant="outline" className="gap-1 border-primary/20">
               <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
               {isConnected ? "Live" : "Connecting..."}
             </Badge>
             <span className="flex items-center gap-1 text-sm">
               <Globe className="h-4 w-4" />
               Listening in <strong>{langCode.toUpperCase()}</strong>
             </span>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayback 
          audioQueue={audioQueue}
          onAudioPlayed={handleAudioPlayed}
          isEnabled={true}
          audioContext={audioContext}
        />

        {/* Transcript Feed */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Waveform className="h-4 w-4" />
               Live Transcripts
             </CardTitle>
             <CardDescription>Real-time translations appearing here</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground italic py-10">
                    Waiting for speaker to start talking...
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-semibold text-primary">{msg.translated}</p>
                    <p className="text-xs text-muted-foreground italic">Original ({msg.sourceLanguage}): {msg.original}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <div className="text-center text-xs text-muted-foreground">
           Make sure your audio output device is set correctly above.
        </div>

      </div>
    </div>
  )
}
