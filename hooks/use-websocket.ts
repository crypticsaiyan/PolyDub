"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { TranscriptEntry } from "@/components/polydub/transcript-view"

interface UseWebSocketOptions {
  url: string
  sourceLanguage: string
  targetLanguages: string[]
  onTranscript: (entry: TranscriptEntry) => void
  onPartialTranscript: (partial: { original: string; translated?: string }) => void
  onAudioData: (audio: ArrayBuffer) => void
}

interface UseWebSocketReturn {
  connect: (sampleRate?: number) => void
  disconnect: () => void
  sendAudio: (chunk: ArrayBuffer) => void
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  error: string | null
}

export function useWebSocket({
  url,
  sourceLanguage,
  targetLanguages,
  onTranscript,
  onPartialTranscript,
  onAudioData,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const connect = useCallback((sampleRate?: number) => {
    cleanup()
    setConnectionStatus('connecting')
    setError(null)

    try {
      const wsUrl = new URL(url)
      wsUrl.searchParams.set('source', sourceLanguage)
      // Send comma-separated list of target languages
      wsUrl.searchParams.set('targets', targetLanguages.join(','))
      if (sampleRate) {
        wsUrl.searchParams.set('sample_rate', sampleRate.toString())
      }
      
      const ws = new WebSocket(wsUrl.toString())
      wsRef.current = ws

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setConnectionStatus('connected')
        setError(null)
      }

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason)
        setConnectionStatus('disconnected')
        
        if (event.code !== 1000) {
          setError(`Connection closed (${event.code}${event.reason ? ': ' + event.reason : ''})`)
        }
        
        wsRef.current = null
      }

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event)
        setError('Connection error')
        setConnectionStatus('disconnected')
      }

      ws.onmessage = (event) => {
        // Handle binary audio data
        if (event.data instanceof ArrayBuffer) {
          onAudioData(event.data)
          return
        }

        // Handle JSON messages
        try {
          const message = JSON.parse(event.data)
          
          switch (message.type) {
            case 'transcript':
              // Final transcript with translation
              onTranscript({
                id: message.id || crypto.randomUUID(),
                original: message.original,
                translated: message.translated,
                timestamp: message.timestamp || Date.now(),
                sourceLanguage: message.sourceLanguage || sourceLanguage,
                targetLanguage: message.targetLanguage || 'multi', // fallbacks
              })
              break
              
            case 'partial':
              // Partial/interim transcript
              onPartialTranscript({
                original: message.original,
                translated: message.translated,
              })
              break
              
            case 'error':
              console.error('[WebSocket] Server error:', message.message)
              setError(message.message)
              break
              
            default:
              console.log('[WebSocket] Unknown message type:', message.type)
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e)
        }
      }
    } catch (e) {
      console.error('[WebSocket] Failed to connect:', e)
      setError('Failed to connect')
      setConnectionStatus('disconnected')
    }
  }, [url, sourceLanguage, targetLanguages, onTranscript, onPartialTranscript, onAudioData, cleanup])

  const disconnect = useCallback(() => {
    cleanup()
    setConnectionStatus('disconnected')
  }, [cleanup])

  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    connect,
    disconnect,
    sendAudio,
    connectionStatus,
    error,
  }
}
