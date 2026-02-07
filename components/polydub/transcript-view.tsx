"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Translate, Waveform, ArrowRight } from "@phosphor-icons/react"

export interface TranscriptEntry {
  id: string
  original: string
  translated: string
  timestamp: number
  sourceLanguage: string
  targetLanguage: string
}

interface TranscriptViewProps {
  entries: TranscriptEntry[]
  isListening: boolean
  currentPartial?: {
    original: string
    translated?: string
  }
}

export function TranscriptView({ 
  entries, 
  isListening,
  currentPartial 
}: TranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, currentPartial])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Translate className="h-5 w-5 text-accent" weight="duotone" />
            Live Transcript
          </CardTitle>
          {isListening && (
            <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10">
              <Waveform className="h-3 w-3 mr-1.5 animate-pulse" weight="fill" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[300px]" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {entries.length === 0 && !currentPartial ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Translate className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Start speaking to see real-time translations appear here
                </p>
              </div>
            ) : (
              <>
                {entries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="space-y-2 pb-3 border-b border-border/50 last:border-0"
                  >
                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(entry.timestamp)}</span>
                      <span className="flex items-center gap-1">
                        {entry.sourceLanguage.toUpperCase()}
                        <ArrowRight className="h-3 w-3" />
                        {entry.targetLanguage.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Original text */}
                    <div className="text-sm text-muted-foreground pl-3 border-l-2 border-muted">
                      {entry.original}
                    </div>
                    
                    {/* Translated text */}
                    <div className="text-base font-medium text-foreground pl-3 border-l-2 border-accent">
                      {entry.translated}
                    </div>
                  </div>
                ))}

                {/* Current partial transcript (in progress) */}
                {currentPartial && (
                  <div className="space-y-2 animate-pulse">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(Date.now())}</span>
                      <Waveform className="h-3 w-3 animate-pulse text-accent" />
                    </div>
                    
                    {/* Partial original */}
                    <div className="text-sm text-muted-foreground pl-3 border-l-2 border-muted italic">
                      {currentPartial.original}
                    </div>
                    
                    {/* Partial translated (if available) */}
                    {currentPartial.translated && (
                      <div className="text-base font-medium text-foreground/70 pl-3 border-l-2 border-accent/50 italic">
                        {currentPartial.translated}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
