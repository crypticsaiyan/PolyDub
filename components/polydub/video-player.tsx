"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, CircleNotch } from "@phosphor-icons/react"

interface ProcessingChunk {
  id: number
  status: "pending" | "processing" | "completed"
  progress: number
}

interface VideoPlayerProps {
  videoFile: File | null
  isProcessing: boolean
  chunks: ProcessingChunk[]
  currentChunk: number
}

export function VideoPlayer({ videoFile, isProcessing, chunks, currentChunk }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const url = URL.createObjectURL(videoFile)
      videoRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [videoFile])

  // TODO: Implement real-time video playback with dubbed audio chunks
  // TODO: Sync video playback with chunk processing status
  // TODO: Handle audio mixing (dubbed vocals + original background audio)

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {videoFile ? (
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                preload="metadata"
              />
              {isProcessing && (
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-card/90 backdrop-blur-sm">
                    <CircleNotch className="h-3 w-3 animate-spin mr-1.5" />
                    Processing
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No video loaded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && chunks.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Dubbing Progress</h3>
              <span className="text-xs text-muted-foreground">
                Chunk {currentChunk + 1} of {chunks.length}
              </span>
            </div>
            
            {/* Overall Progress */}
            <div className="mb-4">
              <Progress 
                value={((currentChunk + 1) / chunks.length) * 100} 
                className="h-2"
              />
            </div>

            {/* Chunk Status List */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="flex items-center gap-3 text-sm"
                >
                  {chunk.status === "completed" && (
                    <CheckCircle className="h-4 w-4 text-accent shrink-0" weight="fill" />
                  )}
                  {chunk.status === "processing" && (
                    <CircleNotch className="h-4 w-4 text-accent animate-spin shrink-0" />
                  )}
                  {chunk.status === "pending" && (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={chunk.status === "completed" ? "text-muted-foreground" : ""}>
                    Chunk {chunk.id}
                  </span>
                  {chunk.status === "processing" && (
                    <div className="flex-1 ml-auto max-w-[100px]">
                      <Progress value={chunk.progress} className="h-1.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
