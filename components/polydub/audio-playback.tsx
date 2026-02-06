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
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const isProcessingRef = useRef(false)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new AudioContext()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
    }

    return () => {
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
    if (isProcessingRef.current || audioQueue.length === 0 || !isEnabled) {
      return
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
      await audioContextRef.current?.resume()
    }

    isProcessingRef.current = true
    setIsPlaying(true)

    try {
      const audioData = audioQueue[0]
      
      // Decode audio data (assuming MP3 or WAV from Deepgram TTS)
      const audioBuffer = await audioContextRef.current!.decodeAudioData(audioData.slice(0))
      
      // Create source and play
      const source = audioContextRef.current!.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNodeRef.current!)
      
      source.onended = () => {
        onAudioPlayed()
        isProcessingRef.current = false
        setIsPlaying(false)
      }
      
      source.start()
    } catch (error) {
      console.error('Error playing audio:', error)
      onAudioPlayed()
      isProcessingRef.current = false
      setIsPlaying(false)
    }
  }, [audioQueue, onAudioPlayed, isEnabled])

  // Process queue when new audio arrives
  useEffect(() => {
    if (audioQueue.length > 0 && !isProcessingRef.current && isEnabled) {
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
