"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { SpeakerHigh, SpeakerLow, SpeakerNone, SpeakerX } from "@phosphor-icons/react"

interface AudioPlaybackProps {
  audioQueue: ArrayBuffer[]
  onAudioPlayed: () => void
  isEnabled: boolean
}

export function AudioPlayback({ 
  audioQueue, 
  onAudioPlayed,
  isEnabled 
}: AudioPlaybackProps) {
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const activeSourcesRef = useRef<number>(0)
  const nextStartTimeRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      // Use system default sample rate to avoid cracking/artifacts
      // The createBuffer below handles the resampling from 24kHz
      const ctx = new window.AudioContext()
      audioContextRef.current = ctx
      gainNodeRef.current = ctx.createGain()
      gainNodeRef.current.connect(ctx.destination)
    }

    return () => {
      // Don't close immediately to avoid cutting off tail, but for cleanup it's fine
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Process audio queue
  const processQueue = useCallback(async () => {
    if (audioQueue.length === 0 || !isEnabled || !audioContextRef.current || !gainNodeRef.current) {
      return
    }

    const ctx = audioContextRef.current

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    // Process only the first chunk, then let parent update trigger next
    const audioData = audioQueue[0]
    
    try {
      // Parse Linear16 PCM (signed 16-bit integers)
      // Note: Deepgram sends raw PCM without headers
      const int16Data = new Int16Array(audioData)
      const float32Data = new Float32Array(int16Data.length)
      
      // Convert to Float32 (-1.0 to 1.0)
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0
      }

      // Create buffer
      const buffer = ctx.createBuffer(1, float32Data.length, 24000)
      buffer.getChannelData(0).set(float32Data)

      // Schedule playback
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(gainNodeRef.current)

      // Schedule to start at the end of the previous chunk or now if verified
      const currentTime = ctx.currentTime
      // Ensure we don't schedule in the past
      const startTime = Math.max(currentTime, nextStartTimeRef.current)
      
      source.start(startTime)
      
      // Update next start time
      nextStartTimeRef.current = startTime + buffer.duration
      
      // Update UI state
      activeSourcesRef.current++
      setIsPlaying(true)
      
      // Consume chunk IMMEDIATELY from parent state
      onAudioPlayed()

      // Handle cleanup when this specific chunk ends
      source.onended = () => {
           activeSourcesRef.current--
           if (activeSourcesRef.current <= 0) {
              activeSourcesRef.current = 0
              setIsPlaying(false)
              // Reset time ref if we run dry, to avoid large gaps on resume
              nextStartTimeRef.current = ctx.currentTime
           }
      }
    } catch (err) {
      console.error("PCM Playback error:", err)
      // Consume even on error to prevent blocking
      onAudioPlayed()
    }
  }, [audioQueue, isEnabled, onAudioPlayed])

  // Process queue when new audio arrives
  useEffect(() => {
    if (audioQueue.length > 0 && isEnabled) {
      processQueue()
    }
  }, [audioQueue, processQueue, isEnabled])

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <SpeakerX className="h-4 w-4" />
    if (volume < 30) return <SpeakerNone className="h-4 w-4" />
    if (volume < 70) return <SpeakerLow className="h-4 w-4" />
    return <SpeakerHigh className="h-4 w-4" />
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Playing indicator */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isPlaying 
              ? 'bg-accent/20 text-accent' 
              : 'bg-muted text-muted-foreground'
            }
          `}>
            <SpeakerHigh 
              className={`h-5 w-5 ${isPlaying ? 'animate-pulse' : ''}`} 
              weight={isPlaying ? 'fill' : 'regular'}
            />
          </div>

          {/* Label */}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isPlaying ? 'Playing translation...' : 'Translated Audio'}
            </p>
            <p className="text-xs text-muted-foreground">
              {audioQueue.length > 0 
                ? `${audioQueue.length} segment${audioQueue.length > 1 ? 's' : ''} queued`
                : 'Waiting for audio'
              }
            </p>
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMuted(!isMuted)}
              className="text-muted-foreground hover:text-foreground"
            >
              {getVolumeIcon()}
            </Button>
            
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={(values) => {
                setVolume(values[0])
                if (values[0] > 0) setIsMuted(false)
              }}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
