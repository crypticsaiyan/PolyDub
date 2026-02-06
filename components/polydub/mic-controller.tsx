"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Microphone, MicrophoneSlash, Circle, WifiHigh, WifiSlash, WifiMedium } from "@phosphor-icons/react"

interface MicControllerProps {
  isRecording: boolean
  onStart: () => void
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
          sampleRate: 16000,
        }
      })
      
      mediaStreamRef.current = stream
      setPermissionGranted(true)

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Create script processor for audio chunks (500ms buffer)
      const bufferSize = 8192 // ~512ms at 16kHz
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        // Convert Float32Array to Int16Array for transmission
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

      onStart()
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
        return 'text-green-400 border-green-400/30 bg-green-400/10'
      case 'connecting':
        return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
      case 'disconnected':
        return 'text-red-400 border-red-400/30 bg-red-400/10'
    }
  }

  // Generate audio level bars
  const bars = Array.from({ length: 20 }, (_, i) => {
    const threshold = (i + 1) / 20
    const isActive = audioLevel >= threshold
    return (
      <div
        key={i}
        className={`w-1.5 rounded-full transition-all duration-75 ${
          isActive 
            ? 'bg-accent' 
            : 'bg-muted-foreground/20'
        }`}
        style={{
          height: `${Math.max(8, (i + 1) * 2)}px`,
        }}
      />
    )
  })

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Connection Status Badge */}
        <div className="flex justify-center mb-6">
          <Badge 
            variant="outline" 
            className={`${getConnectionColor()} flex items-center gap-1.5`}
          >
            {getConnectionIcon()}
            <span className="capitalize">{connectionStatus}</span>
          </Badge>
        </div>

        {/* Audio Level Visualization */}
        <div className="flex items-end justify-center gap-0.5 h-12 mb-6">
          {bars}
        </div>

        {/* Main Control Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleToggle}
            disabled={connectionStatus === 'disconnected'}
            className={`
              relative w-32 h-32 rounded-full text-lg font-semibold
              transition-all duration-300 shadow-lg
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                : 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-accent/30'
              }
            `}
          >
            {/* Pulsing ring when recording */}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/50 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
              </>
            )}
            
            <span className="relative flex flex-col items-center gap-1">
              {isRecording ? (
                <>
                  <MicrophoneSlash className="h-8 w-8" weight="fill" />
                  <span className="text-xs">STOP</span>
                </>
              ) : (
                <>
                  <Microphone className="h-8 w-8" weight="fill" />
                  <span className="text-xs">START</span>
                </>
              )}
            </span>
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-center mt-6">
          {isRecording ? (
            <div className="flex items-center justify-center gap-2 text-red-400">
              <Circle className="h-2 w-2 animate-pulse" weight="fill" />
              <span className="text-sm font-medium">Listening...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {permissionGranted === false 
                ? 'Microphone access denied. Please allow access and refresh.'
                : 'Click to start translating your voice'
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
