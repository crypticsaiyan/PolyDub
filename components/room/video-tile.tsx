"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { User } from "@phosphor-icons/react"

interface VideoTileProps {
  userId: string
  isLocal?: boolean
  stream?: MediaStream
  lastFrameBlob?: Blob
  name?: string
  muted?: boolean
}

export function VideoTile({ userId, isLocal, stream, lastFrameBlob, name, muted }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (isLocal && stream && videoRef.current) {
        videoRef.current.srcObject = stream
    }
  }, [isLocal, stream])

  useEffect(() => {
    if (!isLocal && lastFrameBlob && imgRef.current) {
        // Create object URL
        const url = URL.createObjectURL(lastFrameBlob)
        imgRef.current.src = url
        
        // Cleanup
        return () => URL.revokeObjectURL(url)
    }
  }, [lastFrameBlob, isLocal])

  return (
    <Card className="relative overflow-hidden aspect-video bg-black flex items-center justify-center">
        {isLocal ? (
            <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror local
            />
        ) : (
            lastFrameBlob ? (
                <img 
                    ref={imgRef}
                    className="w-full h-full object-cover"
                    alt={`Video of ${userId}`}
                />
            ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                    <User className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-xs">Waiting for video...</span>
                </div>
            )
        )}
        
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
            {isLocal ? "You" : (name || userId)} {muted ? "(Muted)" : ""}
        </div>
    </Card>
  )
}
