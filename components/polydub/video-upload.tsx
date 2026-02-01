"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UploadSimple, X } from "@phosphor-icons/react"

interface VideoUploadProps {
  onVideoSelect: (file: File | null) => void
  selectedVideo: File | null
}

export function VideoUpload({ onVideoSelect, selectedVideo }: VideoUploadProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    // TODO: Add file validation (video type, size limit)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith("video/")) {
        onVideoSelect(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onVideoSelect(e.target.files[0])
    }
  }

  const handleRemove = () => {
    onVideoSelect(null)
  }

  if (selectedVideo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <UploadSimple className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-sm">{selectedVideo.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`border-dashed transition-colors ${
        dragActive ? "border-accent bg-accent/5" : ""
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <UploadSimple className="h-8 w-8 text-accent" />
        </div>
        <h3 className="mb-2 font-semibold">Upload your video</h3>
        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
          Drag and drop your video file here, or click to browse
        </p>
        <label>
          <input
            type="file"
            className="hidden"
            accept="video/*"
            onChange={handleFileChange}
          />
          <Button variant="outline" asChild>
            <span>Browse Files</span>
          </Button>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Supports MP4, MOV, AVI • Max 500MB
        </p>
      </CardContent>
    </Card>
  )
}
