"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VideoCamera, VideoCameraSlash } from "@phosphor-icons/react"

interface WebcamBroadcasterProps {
  wsUrl: string
}

export function WebcamBroadcaster({ wsUrl }: WebcamBroadcasterProps) {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const stopBroadcast = useCallback(() => {
    setIsActive(false)
    
    // Stop Interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Stop WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop Camera
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startBroadcast = useCallback(async () => {
    try {
       setError(null)

       // 1. Get User Media
       const stream = await navigator.mediaDevices.getUserMedia({ 
           video: { width: 640, height: 360, frameRate: 15 }, // Low res/fps for performance
           audio: false 
       })

       if (videoRef.current) {
           videoRef.current.srcObject = stream
           await videoRef.current.play()
       }

       // 2. Connect WebSocket
       let finalUrl = wsUrl
       try {
           const urlObj = new URL(wsUrl)
           // Adjust protocol based on current page
           urlObj.protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
           
           // If on localhost, force localhost:8080 to ensure dev server connection
           if (window.location.hostname === "localhost") {
               urlObj.hostname = "localhost"
               urlObj.port = "8080"
           }
           
           urlObj.searchParams.set("role", "host-video")
           finalUrl = urlObj.toString()
       } catch (e) {
           console.warn("Invalid WS URL", wsUrl)
           finalUrl = `${wsUrl}?role=host-video`
       }
       
       console.log("Connecting video WS to:", finalUrl)
       const ws = new WebSocket(finalUrl)
       wsRef.current = ws

       ws.onopen = () => {
           console.log("Video WS Connected")
           setIsActive(true)

           // 3. Start Frame Loop
           intervalRef.current = setInterval(() => {
               if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
                   const video = videoRef.current
                   const canvas = canvasRef.current
                   const ctx = canvas.getContext('2d')
                   
                   if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                       // Draw frame
                       ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                       
                       // Convert to Blob (JPEG) and send
                       // quality 0.5 is good balance
                       canvas.toBlob((blob) => {
                           if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob)
                       }, 'image/jpeg', 0.5)
                   }
               }
           }, 100) // ~10 FPS (100ms)
       }

       ws.onerror = (e) => {
           console.error("Video WS Error", e)
           // Improve error message
           setError("Connection failed. Check if server is running.")
           stopBroadcast()
       }

       ws.onclose = () => {
           if (isActive) stopBroadcast()
       }

    } catch (err: any) {
        console.error("Failed to start video:", err)
        setError(err.message || "Camera access denied")
        stopBroadcast()
    }
  }, [wsUrl, stopBroadcast, isActive])

  // Cleanup on unmount
  useEffect(() => {
     return () => stopBroadcast()
  }, [stopBroadcast])

  return (
    <Card className="w-full">
       <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
                 <VideoCamera className="w-4 h-4" />
                 Video Broadcast
             </CardTitle>
             {isActive && (
                <div className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </div>
             )}
          </div>
          <CardDescription>
             Share webcam with listeners
          </CardDescription>
       </CardHeader>
       <CardContent className="p-4 pt-0">
           <div className="space-y-4">
               {/* Preview Area */}
               <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden flex items-center justify-center border border-border/50">
                   <video 
                      ref={videoRef} 
                      muted 
                      autoPlay
                      playsInline 
                      className={`w-full h-full object-cover ${isActive ? "" : "hidden"}`}
                   />
                   
                   {!isActive && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-black/50">
                          <VideoCameraSlash className="w-8 h-8 mb-2 opacity-20" />
                          <span className="text-xs">Camera Off</span>
                       </div>
                   )}
                   {/* Hidden Canvas for processing */}
                   <canvas ref={canvasRef} width={640} height={360} className="hidden" />
               </div>

               {error && <p className="text-xs text-destructive text-center">{error}</p>}

               <Button 
                 variant={isActive ? "destructive" : "secondary"} 
                 size="sm"
                 className="w-full"
                 onClick={isActive ? stopBroadcast : startBroadcast}
               >
                  {isActive ? "Stop Camera" : "Start Video"}
               </Button>
           </div>
       </CardContent>
    </Card>
  )
}
