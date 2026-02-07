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
  recordingDestination?: MediaStreamAudioDestinationNode | null
}

export function AudioPlayback({ 
  audioQueue, 
  onAudioPlayed,
  isEnabled,
  audioContext,
  recordingDestination
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
      
      // Also connect to recording destination if provided
      if (recordingDestination) {
         source.connect(recordingDestination)
      }

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
    <div className="bg-card border rounded-lg p-2 flex flex-col sm:flex-row items-center gap-3 shadow-sm w-full">
        {/* Playing indicator & Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center shrink-0
            transition-all duration-300
            ${isPlaying 
              ? 'bg-primary/20 text-primary' 
              : 'bg-muted text-muted-foreground'
            }
          `}>
            <SpeakerHigh 
              className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} 
              weight={isPlaying ? 'fill' : 'regular'}
            />
          </div>

          <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold truncate">
                {isPlaying ? 'Speaking...' : 'Ready'}
              </span>
              {errorMessage ? (
                  <span className="text-[10px] text-destructive truncate max-w-[120px]" title={errorMessage}>
                    {errorMessage}
                  </span>
              ) : (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {audioQueue.length > 0 ? `${audioQueue.length} queued` : 'Waiting for audio...'}
                  </span>
              )}
          </div>
        </div>

        {/* Controls Group */}
        <div className="flex items-center gap-3 shrink-0">
             {/* Volume controls */}
            <div className="flex items-center gap-1.5 bg-muted/30 rounded-full px-2 py-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
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
                className="w-16"
              />
            </div>

            {/* Device Selector (Compact) */}
            {outputDevices.length > 0 && (
                <Select 
                  value={selectedOutputId} 
                  onValueChange={setSelectedOutputId}
                >
                  <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background border-muted-foreground/20">
                    <div className="flex items-center gap-1.5 truncate">
                        <Faders className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                           {selectedOutputId === 'default' 
                             ? 'Default Output' 
                             : outputDevices.find(d => d.deviceId === selectedOutputId)?.label || 'Output'}
                        </span>
                    </div>
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
            )}
        </div>
    </div>
  )
}
