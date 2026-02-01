"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { VideoUpload } from "@/components/polydub/video-upload"
import { VideoPlayer } from "@/components/polydub/video-player"
import { LanguageSelector } from "@/components/polydub/language-selector"
import { Button } from "@/components/ui/button"
import { Sparkle } from "@phosphor-icons/react"

// TODO: Replace mock data with real processing logic
interface ProcessingChunk {
  id: number
  status: "pending" | "processing" | "completed"
  progress: number
}

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState("en")
  const [targetLanguage, setTargetLanguage] = useState("es")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chunks, setChunks] = useState<ProcessingChunk[]>([])
  const [currentChunk, setCurrentChunk] = useState(0)

  // TODO: Implement real video processing
  // TODO: Connect to backend API for video chunking
  // TODO: Implement progressive audio dubbing
  // TODO: Handle WebSocket connection for real-time updates
  const handleStartDubbing = () => {
    if (!selectedVideo) return
    
    // Mock: Initialize chunks (replace with actual chunk detection)
    const mockChunks: ProcessingChunk[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      status: "pending" as const,
      progress: 0,
    }))
    
    setChunks(mockChunks)
    setIsProcessing(true)
    setCurrentChunk(0)

    // Mock: Simulate progressive processing
    let chunkIndex = 0
    const interval = setInterval(() => {
      setChunks(prev => 
        prev.map((chunk, idx) => {
          if (idx === chunkIndex) {
            return { ...chunk, status: "processing", progress: 50 }
          }
          if (idx < chunkIndex) {
            return { ...chunk, status: "completed", progress: 100 }
          }
          return chunk
        })
      )
      
      setTimeout(() => {
        setChunks(prev => 
          prev.map((chunk, idx) => 
            idx === chunkIndex 
              ? { ...chunk, status: "completed", progress: 100 }
              : chunk
          )
        )
        chunkIndex++
        setCurrentChunk(chunkIndex)
        
        if (chunkIndex >= mockChunks.length) {
          clearInterval(interval)
          setIsProcessing(false)
        }
      }, 1500)
    }, 3000)
  }

  const canStartDubbing = selectedVideo && sourceLanguage && targetLanguage && !isProcessing

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" /> {/* Spacer for fixed header */}
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-24 sm:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5">
                <Sparkle className="h-4 w-4 text-accent" weight="fill" />
                <span className="text-sm font-medium text-accent">
                  Powered by Lingo.dev
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
                PolyDub
              </h1>
              <p className="text-lg leading-8 text-muted-foreground max-w-xl mx-auto">
                Real-time video dubbing that preserves background audio while translating vocals. 
                Upload your video, select languages, and watch the magic happen.
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
                <VideoUpload 
                  onVideoSelect={setSelectedVideo}
                  selectedVideo={selectedVideo}
                />
                
                <LanguageSelector
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  onSourceLanguageChange={setSourceLanguage}
                  onTargetLanguageChange={setTargetLanguage}
                />

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canStartDubbing}
                  onClick={handleStartDubbing}
                >
                  <Sparkle className="h-5 w-5 mr-2" weight="fill" />
                  Start PolyDub
                </Button>
              </div>

              {/* Right Column: Video Player & Status */}
              <div>
                <VideoPlayer
                  videoFile={selectedVideo}
                  isProcessing={isProcessing}
                  chunks={chunks}
                  currentChunk={currentChunk}
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
                PolyDub processes your video in real-time, delivering progressive results
              </p>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-xl">
                  1
                </div>
                <h3 className="mb-2 font-semibold">Upload Video</h3>
                <p className="text-sm text-muted-foreground">
                  Select your video file and configure source/target languages
                </p>
              </div>
              
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-xl">
                  2
                </div>
                <h3 className="mb-2 font-semibold">Process Chunks</h3>
                <p className="text-sm text-muted-foreground">
                  Video is split into chunks and dubbed progressively in real-time
                </p>
              </div>
              
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-xl">
                  3
                </div>
                <h3 className="mb-2 font-semibold">Watch & Share</h3>
                <p className="text-sm text-muted-foreground">
                  Play your dubbed video with vocals translated and background audio intact
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
