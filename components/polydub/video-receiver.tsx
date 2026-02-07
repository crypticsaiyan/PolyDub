"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { VideoCameraSlash } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"

interface VideoReceiverProps {
  wsUrl: string // Base URL
  delayMs?: number // Delay in milliseconds
  startRendering?: boolean // Only start showing frames when this is true
}

export interface VideoReceiverRef {
  captureStream: () => MediaStream | null
}

export const VideoReceiver = forwardRef<VideoReceiverRef, VideoReceiverProps>(function VideoReceiver(
  { wsUrl, delayMs = 0, startRendering = true },
  ref
) {
  const [isConnected, setIsConnected] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Expose captureStream to parent
  useImperativeHandle(ref, () => ({
    captureStream: () => {
      if (canvasRef.current) {
        return canvasRef.current.captureStream(30) // 30 FPS
      }
      return null
    }
  }))

  const startRenderingRef = useRef(startRendering)
  useEffect(() => {
      startRenderingRef.current = startRendering
      if (startRendering) setIsWaiting(false)
  }, [startRendering])

  useEffect(() => {
    // Determine WS URL
    let finalUrl = wsUrl
    try {
        const urlObj = new URL(wsUrl)
        urlObj.protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        if (window.location.hostname === "localhost") {
             urlObj.hostname = "localhost"
             urlObj.port = "8080"
        }
        urlObj.searchParams.set("role", "listener-video")
        finalUrl = urlObj.toString()
    } catch (e) {
        finalUrl = `${wsUrl}?role=listener-video`
    }
    
    console.log("Connecting to Video Stream:", finalUrl)
    
    const ws = new WebSocket(finalUrl)
    ws.binaryType = "blob" // Receive frames as blobs
    wsRef.current = ws

    ws.onopen = () => {
       console.log("Connected to Video Broadcast")
       setIsConnected(true)
    }

    ws.onmessage = (event) => {
       if (event.data instanceof Blob) {
           const url = URL.createObjectURL(event.data)
           
           const drawFrame = () => {
              if (startRenderingRef.current && canvasRef.current) {
                 const img = new Image()
                 img.onload = () => {
                     const ctx = canvasRef.current?.getContext('2d')
                     if (ctx && canvasRef.current) {
                        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
                     }
                     URL.revokeObjectURL(url)
                 }
                 img.src = url
              } else {
                 URL.revokeObjectURL(url)
              }
           }

           if (delayMs > 0) {
              setTimeout(drawFrame, delayMs)
           } else {
              drawFrame()
           }
       }
    }

    ws.onclose = () => setIsConnected(false)

    return () => {
       ws.close()
    }
  }, [wsUrl, delayMs])

  return (
    <Card className="overflow-hidden bg-black border-border/50">
       <CardContent className="p-0 relative aspect-video flex items-center justify-center group">
          {/* Main Canvas for Video */}
          <canvas 
            ref={canvasRef} 
            width={1280} 
            height={720} 
            className={`w-full h-full object-contain ${!isWaiting && isConnected ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
          />

          {/* Loading State or Waiting State */}
          {(!isConnected || isWaiting) && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 z-10">
                <VideoCameraSlash className="w-12 h-12 mb-2 opacity-50" weight="thin" />
                <span className="text-sm font-medium">
                   {!isConnected ? "Connecting to video..." : "Syncing video feed..."}
                </span>
                {delayMs > 0 && isConnected && (
                    <span className="text-xs text-muted-foreground animate-pulse mt-2 bg-black/50 px-2 py-1 rounded-full">
                       Buffering ({delayMs}ms)
                    </span>
                )}
             </div>
          )}
          
          {/* Overlay Status */}
          <div className="absolute top-3 right-3 flex gap-2 z-20">
             {isConnected && (
               <Badge variant="destructive" className="h-6 gap-1.5 shadow-lg animate-in fade-in bg-red-600/90 hover:bg-red-600 border-none">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  LIVE
               </Badge>
             )}
          </div>
       </CardContent>
    </Card>
  )
})
