"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { SpeakerHigh, SpeakerLow, SpeakerNone, SpeakerX, Faders } from "@phosphor-icons/react"

interface AudioPlaybackProps {
  audioQueue: ArrayBuffer[]
  onAudioPlayed: () => void
  isEnabled: boolean
  audioContext?: AudioContext | null
}

export function AudioPlayback({ 
  audioQueue, 
  onAudioPlayed,
  isEnabled,
  audioContext
}: AudioPlaybackProps) {
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Audio Device State
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState<string>("default")
  
  const activeSourcesRef = useRef<number>(0)
  const nextStartTimeRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use provided context or create new one
      if (audioContext) {
         audioContextRef.current = audioContext
      } else if (!audioContextRef.current) {
         audioContextRef.current = new window.AudioContext()
      }

      // Setup Gain Node if context exists
      if (audioContextRef.current && !gainNodeRef.current) {
        const ctx = audioContextRef.current
        const gain = ctx.createGain()
        gain.connect(ctx.destination)
        gainNodeRef.current = gain
      }
    }

    return () => {
      // Only close if WE created it (no external context provided)
      if (!audioContext && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioContext])

  // Discover Audio Output Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission implicitly if needed by enumeration, though strict permission requires getUserMedia
        // Ideally the user has already granted microphone permission in the main app
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput')
        setOutputDevices(audioOutputs)
      } catch (err) {
        console.error("Failed to enumerate audio devices:", err)
      }
    }

    getDevices()
    
    // Listen for device changes (plugging in headphones, etc)
    navigator.mediaDevices.addEventListener('devicechange', getDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices)
  }, [])

  // Handle Output Device Change
  useEffect(() => {
    if (audioContextRef.current) {
      const ctx = audioContextRef.current as any // Type assertion for setSinkId
      if (typeof ctx.setSinkId === 'function') {
        // 'default' (from our select) -> '' (for API)
        const sinkId = selectedOutputId === "default" ? "" : selectedOutputId
        
        ctx.setSinkId(sinkId)
          .then(() => console.log(`Audio output set to: ${sinkId || 'System Default'}`))
          .catch((err: any) => console.warn(`Failed to set audio sink to '${sinkId}':`, err))
      }
    }
  }, [selectedOutputId])

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Process audio queue
  // Process audio queue
  const processQueue = useCallback(async () => {
    if (audioQueue.length === 0 || !isEnabled || !audioContextRef.current || !gainNodeRef.current) {
      return
    }

    const ctx = audioContextRef.current

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch (e) {
        console.error("Failed to resume audio context", e)
      }
    }

    // Process only the first chunk, then let parent update trigger next
    const audioData = audioQueue[0]
    
    try {
      // Decode MP3/WAV/etc automatically
      // We must slice() because decodeAudioData detaches the buffer, and if we re-render or logic loops, the original in queue is unsafe.
      const bufferCopy = audioData.slice(0);
      const audioBuffer = await ctx.decodeAudioData(bufferCopy)

      // Schedule playback
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNodeRef.current)

      const currentTime = ctx.currentTime
      const startTime = Math.max(currentTime, nextStartTimeRef.current)
      
      source.start(startTime)
      
      nextStartTimeRef.current = startTime + audioBuffer.duration
      
      activeSourcesRef.current++
      setIsPlaying(true)
      
      // Notify parent that this chunk is "processed/scheduled"
      onAudioPlayed()

      source.onended = () => {
           activeSourcesRef.current--
           if (activeSourcesRef.current <= 0) {
              activeSourcesRef.current = 0
              setIsPlaying(false)
              nextStartTimeRef.current = ctx.currentTime
           }
      }
    } catch (err: any) {
      console.error("Audio Decode/Playback error:", err)
      setErrorMessage(typeof err === 'string' ? err : (err.message || "Playback error"))
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
        <div className="flex flex-col gap-4">
          {/* Top Row: Playback & Volume */}
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isPlaying ? 'Playing translation...' : 'Translated Audio'}
              </p>
              {errorMessage ? (
                 <p className="text-xs text-destructive truncate" title={errorMessage}>
                   {errorMessage}
                 </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {audioQueue.length > 0 
                    ? `${audioQueue.length} segment${audioQueue.length > 1 ? 's' : ''} queued`
                    : 'Waiting for audio'
                  }
                </p>
              )}
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

          {/* Bottom Row: Output Device Selection */}
          {outputDevices.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t mt-2">
               <Faders className="h-4 w-4 text-muted-foreground shrink-0" />
               <div className="text-xs text-muted-foreground whitespace-nowrap">Output Device:</div>
               <Select 
                 value={selectedOutputId} 
                 onValueChange={setSelectedOutputId}
               >
                 <SelectTrigger className="h-8 text-xs w-full max-w-full truncate">
                   <SelectValue placeholder="Default Output" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="default" className="text-xs">
                     System Default
                   </SelectItem>
                   {outputDevices
                     .filter(device => device.deviceId && device.deviceId !== "default")
                     .map((device) => (
                     <SelectItem 
                       key={device.deviceId} 
                       value={device.deviceId}
                       className="text-xs"
                     >
                       {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
