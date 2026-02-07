"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Microphone, MicrophoneSlash, Circle, WifiHigh, WifiSlash, WifiMedium } from "@phosphor-icons/react"

interface MicControllerProps {
  isRecording: boolean
  onStart: (sampleRate?: number) => void
  onStop: () => void
  onAudioData: (chunk: ArrayBuffer) => void
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
}

export function MicController({
  isRecording,
  onStart,
  onStop,
  onAudioData,
  connectionStatus,
}: MicControllerProps) {
  const [audioLevel, setAudioLevel] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setAudioLevel(0)
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          // Let device decide sample rate to avoid mismatch
        }
      })
      
      mediaStreamRef.current = stream
      setPermissionGranted(true)

      // Create audio context without forcing sample rate
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Create script processor for audio chunks
      // Buffer size needs to be a power of 2. 
      // At 48k, 4096 is ~85ms. At 16k, 4096 is ~256ms.
      const bufferSize = 4096 
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        // Convert Float32Array to Int16Array for transmission
        // Note: This sends raw audio at context sample rate (e.g. 44.1k or 48k)
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        onAudioData(int16Data.buffer)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      // Update audio level for visualization
      const updateLevel = () => {
        if (!analyserRef.current) return
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(average / 255)
        
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      onStart(audioContext.sampleRate) // Pass detected rate
    } catch (error) {
      console.error('Failed to start recording:', error)
      setPermissionGranted(false)
    }
  }, [onStart, onAudioData])

  // Stop recording
  const stopRecording = useCallback(() => {
    cleanup()
    onStop()
  }, [cleanup, onStop])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Handle recording state changes from parent
  useEffect(() => {
    if (!isRecording && mediaStreamRef.current) {
      cleanup()
    }
  }, [isRecording, cleanup])

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <WifiHigh className="h-3.5 w-3.5" weight="fill" />
      case 'connecting':
        return <WifiMedium className="h-3.5 w-3.5 animate-pulse" />
      case 'disconnected':
        return <WifiSlash className="h-3.5 w-3.5" />
    }
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500 border-green-500/20 bg-green-500/10'
      case 'connecting':
        return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
      case 'disconnected':
        return 'text-muted-foreground border-border bg-muted/50'
    }
  }

  // Generate audio level bars
  // Generate audio level bars
  const bars = Array.from({ length: 20 }, (_, i) => {
    const threshold = (i + 1) / 20
    const isActive = audioLevel >= threshold
    return (
      <div
        key={i}
        className={`w-1 rounded-full transition-all duration-75 ${
          isActive 
            ? 'bg-accent' 
            : 'bg-muted-foreground/20'
        }`}
        style={{
          height: `${Math.max(4, (i + 1) * 1.5)}px`,
        }}
      />
    )
  })

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 flex items-center justify-between gap-4">
        {/* Left: Button & Status */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={handleToggle}
            disabled={connectionStatus === 'connecting'}
            className={`
              relative w-10 h-10 rounded-full shrink-0
              transition-all duration-300
              ${isRecording 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }
            `}
          >
            {isRecording ? (
              <MicrophoneSlash className="h-5 w-5" weight="fill" />
            ) : (
              <Microphone className="h-5 w-5" weight="fill" />
            )}
          </Button>

          <div className="flex flex-col gap-0.5">
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium leading-none">
                  {isRecording ? 'Broadcasting' : 'Mic Ready'}
                </span>
                <Badge 
                  variant="outline" 
                  className={`${getConnectionColor()} px-1.5 py-0 text-[10px] h-4 gap-1`}
                >
                  {getConnectionIcon()}
                  <span className="capitalize">{connectionStatus}</span>
                </Badge>
             </div>
             <p className="text-[10px] text-muted-foreground">
               {isRecording ? 'Listening...' : 'Click to start'}
             </p>
          </div>
        </div>

        {/* Right: Audio Visualizer */}
        <div className="flex items-end justify-end gap-0.5 h-6">
          {bars}
        </div>
      </CardContent>
    </Card>
  )
}
