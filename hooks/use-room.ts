"use client"

import React, { useState, useCallback, useRef } from "react"
import { RoomMember, TranscriptMessage } from "@/types/room"

interface UseRoomOptions {
  url: string
  roomId: string
  userId: string
  sourceLanguage: string
  targetLanguage: string
  voiceId?: string
  onTranscript: (msg: TranscriptMessage) => void
  onVideoFrame: (userId: string, blob: Blob) => void
  onMemberJoined: (member: RoomMember) => void
  onMemberLeft: (userId: string) => void
}

export function useRoom({
  url,
  roomId,
  userId,
  sourceLanguage,
  targetLanguage,
  voiceId,
  onTranscript,
  onVideoFrame,
  onMemberJoined,
  onMemberLeft,
}: UseRoomOptions) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [error, setError] = useState<string | null>(null)

  const audioWsRef = useRef<WebSocket | null>(null)
  const videoWsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const nextStartTimeRef = useRef<number>(0)

  const enableAudio = useCallback(async () => {
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    } catch (e) {
        console.error("Audio Enable Failed", e);
    }
  }, []);

  const connect = useCallback(() => {
    setStatus('connecting')
    setError(null)

    // 1. Audio/Control Socket
    const audioUrl = new URL(url)
    audioUrl.searchParams.set('role', 'member')
    audioUrl.searchParams.set('room', roomId)
    audioUrl.searchParams.set('user', userId)
    audioUrl.searchParams.set('source', sourceLanguage)
    audioUrl.searchParams.set('target', targetLanguage)
    if (voiceId) audioUrl.searchParams.set('voice', voiceId)

    const audioWs = new WebSocket(audioUrl.toString())
    audioWs.binaryType = 'arraybuffer'
    audioWsRef.current = audioWs

    audioWs.onopen = () => {
      console.log('[Room] Audio Connected')
      setStatus('connected')
    }

    // Track the current TTS session's encoding metadata
    const pcmMeta: { sampleRate: number } = { sampleRate: 24000 }

    audioWs.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data)
          switch (msg.type) {
            case 'transcript':
            case 'partial':
              onTranscript(msg)
              break
            case 'user-joined':
              onMemberJoined({ userId: msg.userId, sourceLanguage: msg.sourceLanguage })
              break
            case 'user-left':
              onMemberLeft(msg.userId)
              break
            case 'room-state':
              if (Array.isArray(msg.participants)) {
                 msg.participants.forEach((p: any) => onMemberJoined(p))
              }
              break
            case 'tts-start':
              pcmMeta.sampleRate = msg.sampleRate ?? 24000
              break
            case 'tts-end':
              break
            case 'error':
              console.error('[Room] Server Error:', msg.message)
              setError(msg.message)
              break
          }
        } catch (e) { console.error(e) }
      } else if (event.data instanceof ArrayBuffer) {
        playPCMChunk(event.data, pcmMeta.sampleRate, audioContextRef, nextStartTimeRef)
      }
    }
    
    audioWs.onclose = () => {
       console.log('[Room] Audio Disconnected')
       setStatus('disconnected')
    }

    // 2. Video Socket
    const videoUrl = new URL(url)
    videoUrl.searchParams.set('role', 'member-video')
    videoUrl.searchParams.set('room', roomId)
    videoUrl.searchParams.set('user', userId)

    const videoWs = new WebSocket(videoUrl.toString())
    videoWsRef.current = videoWs
    
    videoWs.onopen = () => console.log('[Room] Video Connected')
    
    videoWs.onmessage = (event) => {
        if (typeof event.data === 'string') {
            try {
                const msg = JSON.parse(event.data)
                if (msg.type === 'video-frame' && msg.data) {
                    const byteCharacters = atob(msg.data)
                    const byteNumbers = new Array(byteCharacters.length)
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i)
                    }
                    const byteArray = new Uint8Array(byteNumbers)
                    const blob = new Blob([byteArray], { type: 'image/jpeg' })
                    onVideoFrame(msg.userId, blob)
                }
            } catch (e) { console.error('Video decode error', e) }
        }
    }

  }, [url, roomId, userId, sourceLanguage, targetLanguage, voiceId, onTranscript, onMemberJoined, onMemberLeft, onVideoFrame])

  const disconnect = useCallback(() => {
    audioWsRef.current?.close()
    videoWsRef.current?.close()
    setStatus('disconnected')
  }, [])

  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (audioWsRef.current?.readyState === WebSocket.OPEN) {
       audioWsRef.current.send(chunk)
    }
  }, [])

  const sendVideoFrame = useCallback((blob: Blob) => {
      if (videoWsRef.current?.readyState === WebSocket.OPEN) {
          blob.arrayBuffer().then(buffer => {
             videoWsRef.current?.send(buffer)
          })
      }
  }, [])

  const setPeerVoice = useCallback((peerId: string, voiceId: string) => {
    if (audioWsRef.current?.readyState === WebSocket.OPEN) {
        audioWsRef.current.send(JSON.stringify({
            type: 'set-voice-preference',
            peerId,
            voiceId
        }));
    }
  }, [])

  return {
    connect,
    disconnect,
    enableAudio,
    sendAudio,
    sendVideoFrame,
    setPeerVoice,
    status,
    error
  }
}

function playPCMChunk(
    data: ArrayBuffer,
    sampleRate: number,
    audioContextRef: React.MutableRefObject<AudioContext | null>,
    nextStartTimeRef: React.MutableRefObject<number>
) {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    try {
        const numSamples = data.byteLength / 2;
        const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        const view = new DataView(data);
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = view.getInt16(i * 2, true) / 32768;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    } catch (e) {
        console.error("[Room] PCM Playback Error", e);
    }
}
