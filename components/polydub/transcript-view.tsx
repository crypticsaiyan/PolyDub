"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Translate, Waveform, ArrowRight, User } from "@phosphor-icons/react"

export interface TranscriptEntry {
  id: string
  userId?: string
  original: string
  translated: string
  timestamp: number
  sourceLanguage: string
  targetLanguage: string
  color?: string
}

interface TranscriptViewProps {
  entries: TranscriptEntry[]
  isListening: boolean
  currentPartial?: {
    original: string
    translated?: string
    color?: string
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
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-border/50 shadow-none">
      <CardHeader className="pb-3 border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Translate className="h-4 w-4 text-primary" weight="duotone" />
            Live Transcript
          </CardTitle>
          {isListening && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
              <Waveform className="h-3 w-3 mr-1 animate-pulse" weight="fill" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden min-h-[200px] relative">
        <div className="absolute inset-0 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {entries.length === 0 && !currentPartial ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="bg-secondary/50 p-3 rounded-full mb-3">
                    <Translate className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Waiting for speech...
                </p>
              </div>
          ) : (
            <>
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    <div className="flex items-center gap-1.5">
                       {entry.userId ? (
                           <span 
                             className="flex items-center gap-1 px-1.5 py-0.5 rounded text-white shadow-sm"
                             style={{ backgroundColor: entry.color || 'var(--secondary)' }}
                           >
                               <User weight="bold" /> {entry.userId.slice(0,8)}
                           </span>
                       ) : (
                           <span>Unknown</span>
                       )}
                       <span>{formatTime(entry.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-60">
                      {entry.sourceLanguage} <ArrowRight className="h-2 w-2" /> {entry.targetLanguage}
                    </div>
                  </div>
                  
                  <div 
                    className="pl-3 border-l-2 space-y-1"
                    style={{ borderColor: entry.color ? `${entry.color}40` : 'var(--primary)/20' }}
                  >
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {entry.original}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {entry.translated}
                      </p>
                  </div>
                </div>
              ))}

              {currentPartial && (
                <div className="space-y-1.5 opacity-70">
                   <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                       <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                           <Waveform className="animate-pulse" weight="bold" /> Speaking...
                       </span>
                   </div>
                   <div className="pl-3 border-l-2 border-primary/50 space-y-1">
                      <p className="text-xs text-muted-foreground/80 italic">
                        {currentPartial.original}
                      </p>
                      {currentPartial.translated && (
                          <p className="text-sm font-medium text-foreground/80 italic">
                            {currentPartial.translated}
                          </p>
                      )}
                   </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
