"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useRoom } from "@/hooks/use-room"
import { TranscriptMessage } from "@/types/room"
import { TranscriptView, TranscriptEntry } from "@/components/polydub/transcript-view"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, VideoCamera, VideoCameraSlash, Microphone, MicrophoneSlash, Globe, Translate, SpeakerHigh } from "@phosphor-icons/react"
import { Label } from "@/components/ui/label"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

// Polyfill for randomUUID in insecure contexts (mobile dev)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- CONSTANTS ---

// Source Languages (Deepgram Nova-3) - Expanded
const STT_LANGUAGES = [
  { code: "auto", name: "Auto-detect", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
]

// Target Languages (Deepgram Aura-2) - Expanded
const TTS_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
]

// Available Voices per Language
const VOICE_OPTIONS: Record<string, { id: string; name: string; gender: 'M' | 'F' }[]> = {
  en: [
    { id: 'aura-2-thalia-en', name: 'Thalia (US)', gender: 'F' },
    { id: 'aura-2-andromeda-en', name: 'Andromeda (US)', gender: 'F' },
    { id: 'aura-2-apollo-en', name: 'Apollo (US)', gender: 'M' },
    { id: 'aura-2-arcas-en', name: 'Arcas (US)', gender: 'M' },
  ],
  es: [
    { id: 'aura-2-celeste-es', name: 'Celeste (CO)', gender: 'F' },
    { id: 'aura-2-estrella-es', name: 'Estrella (MX)', gender: 'F' },
    { id: 'aura-2-nestor-es', name: 'Nestor (ES)', gender: 'M' },
  ],
  fr: [
    { id: 'aura-2-agathe-fr', name: 'Agathe (FR)', gender: 'F' },
    { id: 'aura-2-hector-fr', name: 'Hector (FR)', gender: 'M' },
  ],
  de: [
    { id: 'aura-2-viktoria-de', name: 'Viktoria (DE)', gender: 'F' },
    { id: 'aura-2-julius-de', name: 'Julius (DE)', gender: 'M' },
  ],
  it: [
    { id: 'aura-2-livia-it', name: 'Livia (IT)', gender: 'F' },
    { id: 'aura-2-dionisio-it', name: 'Dionisio (IT)', gender: 'M' },
  ],
  ja: [
    { id: 'aura-2-fujin-ja', name: 'Fujin (JP)', gender: 'M' },
    { id: 'aura-2-izanami-ja', name: 'Izanami (JP)', gender: 'F' },
  ],
  nl: [
    { id: 'aura-2-rhea-nl', name: 'Rhea (NL)', gender: 'F' },
    { id: 'aura-2-sander-nl', name: 'Sander (NL)', gender: 'M' },
    { id: 'aura-2-beatrix-nl', name: 'Beatrix (NL)', gender: 'F' },
  ],
}

// Generate a consistent color for a user ID
const getUserColor = (userId?: string) => {
    if (!userId) return "hsl(var(--muted-foreground))";
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 65%)`; // Vibrant but readable on dark
};

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  
  // Fix Hydration Mismatch for specific random ID
  const [userId, setUserId] = useState<string>("")
  useEffect(() => setUserId(generateUUID().slice(0, 8)), [])

  const [sourceLang, setSourceLang] = useState("auto")
  const [targetLang, setTargetLang] = useState("en")
  const [targetVoice, setTargetVoice] = useState<string>("")
  
  // Auto-select first voice when target lang changes
  useEffect(() => {
      const voices = VOICE_OPTIONS[targetLang] || [];
      if (voices.length > 0) {
          setTargetVoice(voices[0].id);
      } else {
          setTargetVoice("");
      }
  }, [targetLang]);

  const [isConnected, setIsConnected] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [partialWait, setPartialWait] = useState<{ original: string; translated?: string; color?: string } | undefined>()
  
  const videoRefs = useRef<Map<string, HTMLImageElement>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const handleTranscript = useCallback((msg: TranscriptMessage) => {
     const userColor = getUserColor(msg.userId);

     if (msg.type === 'transcript') {
        const entry: TranscriptEntry = {
            id: generateUUID(),
            userId: msg.userId,
            original: msg.original,
            translated: msg.translated || '',
            timestamp: msg.timestamp,
            sourceLanguage: msg.sourceLanguage || 'unknown',
            targetLanguage: targetLang,
            color: userColor
        }
        setTranscripts(prev => [...prev, entry])
        setPartialWait(undefined)
     } else if (msg.type === 'partial') {
        setPartialWait({ 
            original: msg.original, 
            translated: msg.translated,
            color: userColor 
        })
     }
  }, [targetLang])

  const handleVideoFrame = useCallback((senderId: string, blob: Blob) => {
     const img = videoRefs.current.get(senderId)
     if (img) {
         const oldUrl = img.getAttribute('data-blob-url')
         if (oldUrl) URL.revokeObjectURL(oldUrl)
             
         const url = URL.createObjectURL(blob)
         img.src = url
         img.setAttribute('data-blob-url', url)
     }
  }, [])

  const handleMemberJoined = useCallback((member: any) => {
     setMembers(prev => {
         if (!prev.includes(member.userId)) return [...prev, member.userId]
         return prev
     })
  }, [])
  
  const handleMemberLeft = useCallback((id: string) => {
     setMembers(prev => prev.filter(m => m !== id))
  }, [])

  const { connect, disconnect, enableAudio, sendAudio, sendVideoFrame, setPeerVoice, status, error } = useRoom({
    url: WS_URL,
    roomId,
    userId,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    voiceId: targetVoice,
    onTranscript: handleTranscript,
    onVideoFrame: handleVideoFrame,
    onMemberJoined: handleMemberJoined,
    onMemberLeft: handleMemberLeft
  })
  
  const registerVideoRef = (id: string, el: HTMLImageElement | null) => {
      if (el) videoRefs.current.set(id, el)
      else videoRefs.current.delete(id)
  }

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled
            setIsMicOn(audioTrack.enabled)
        }
    }
  }, [])

  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled
            setIsCamOn(videoTrack.enabled)
        }
    }
  }, [])

  // Cleanup media on unmount
  useEffect(() => {
     return () => {
         if (localStreamRef.current) {
             localStreamRef.current.getTracks().forEach(track => track.stop())
         }
     }
  }, [])

  const toggleMedia = async () => {
    if (isConnected) {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop())
            localStreamRef.current = null
        }
        setIsConnected(false)
        setIsMicOn(true)
        setIsCamOn(true)
        disconnect()
    } else {
        try {
            await enableAudio();

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Media access is not supported in this browser or context. Please use HTTPS or localhost.");
                setIsConnected(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } } 
            })
            localStreamRef.current = stream
            setIsConnected(true)
            connect()

            const audioContext = new AudioContext({ 
                sampleRate: 16000,
                latencyHint: 'interactive'
            });
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = (e) => {
                 if (!localStreamRef.current?.active) {
                     processor.disconnect();
                     source.disconnect();
                     audioContext.close();
                     return;
                 }
                 const inputData = e.inputBuffer.getChannelData(0);
                 const buffer = new ArrayBuffer(inputData.length * 2);
                 const view = new DataView(buffer);
                 for (let i = 0; i < inputData.length; i++) {
                     const s = Math.max(-1, Math.min(1, inputData[i]));
                     view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                 }
                 sendAudio(buffer);
            };

            const videoTrack = stream.getVideoTracks()[0]
            const videoEl = document.createElement('video') // internal invisible element
            videoEl.srcObject = stream
            videoEl.muted = true
            videoEl.play()
            
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            const videoLoop = setInterval(() => {
               if (!localStreamRef.current?.active) {
                   clearInterval(videoLoop)
                   return
               }
               if (videoEl.readyState >= 2 && ctx) {
                   canvas.width = 320
                   canvas.height = 240
                   ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
                   canvas.toBlob((blob) => {
                       if (blob) sendVideoFrame(blob)
                   }, 'image/jpeg', 0.6)
               }
            }, 100)
            
        } catch (e: any) {
            console.error("Failed to access media", e)
            let msg = "Could not access camera/microphone"
            if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
                msg = "Camera/Mic is being used by another application or tab."
            } else if (e.name === 'NotAllowedError') {
                msg = "Permission denied. Please allow camera/mic access."
            } else if (e.name === 'AbortError') {
                msg = "Media request was aborted. Please try again."
            } else if (e.name === 'NotSupportedError') {
                msg = "Your device does not support the required audio sample rate (16kHz).";
            }
            alert(msg)
            setIsConnected(false)
        }
    }
  }

  if (!userId) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground pt-16">
       {/* Room Toolbar - Enhanced */}
       <div className="border-b px-4 py-3 bg-card/80 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-sm">
           <div className="flex flex-wrap items-center justify-between gap-4">
               
               {/* Left Group: Identity & Controls */}
               <div className="flex items-center gap-6">
                   {/* Room Info */}
                   <div className="flex items-center gap-3 pr-6 border-r border-border/50">
                       <div className="flex flex-col">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Room</span>
                           <span className="font-mono text-base font-bold text-primary leading-none">{roomId}</span>
                       </div>
                   </div>

                   {/* Language Configuration */}
                   <div className="flex flex-wrap items-center gap-4">
                       
                       {/* Source Language (Input) */}
                       <div className="flex flex-col gap-1">
                           <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                              <Globe className="h-3 w-3" /> Speaking (Input)
                           </Label>
                           <Select value={sourceLang} onValueChange={setSourceLang} disabled={isConnected}>
                               <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary/50 border-0 focus:ring-1 focus:ring-primary/20">
                                   <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                   {STT_LANGUAGES.map(l => (
                                       <SelectItem key={l.code} value={l.code} className="text-xs">
                                           <span className="mr-2">{l.flag}</span> {l.name}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>

                       {/* Target Language (Output) */}
                       <div className="flex flex-col gap-1">
                           <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                              <Translate className="h-3 w-3" /> Listening (Output)
                           </Label>
                           <Select value={targetLang} onValueChange={setTargetLang} disabled={isConnected}>
                               <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary/50 border-0 focus:ring-1 focus:ring-primary/20">
                                   <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                   {TTS_LANGUAGES.map(l => (
                                       <SelectItem key={l.code} value={l.code} className="text-xs">
                                           <span className="mr-2">{l.flag}</span> {l.name}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>

                   </div>
               </div>
               
               {/* Right Group: Actions */}
               <div className="flex items-center gap-3 ml-auto">
                   {isConnected && (
                       <div className="flex items-center gap-1 mr-2 border-r pr-3 border-border/40">
                           <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-9 rounded-full transition-colors ${!isMicOn ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'hover:bg-secondary'}`}
                                onClick={toggleMic}
                                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                           >
                               {isMicOn ? <Microphone weight="fill" className="h-5 w-5" /> : <MicrophoneSlash weight="regular" className="h-5 w-5" />}
                           </Button>
                           <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-9 rounded-full transition-colors ${!isCamOn ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'hover:bg-secondary'}`}
                                onClick={toggleCam}
                                title={isCamOn ? "Turn Off Camera" : "Turn On Camera"}
                           >
                               {isCamOn ? <VideoCamera weight="fill" className="h-5 w-5" /> : <VideoCameraSlash weight="regular" className="h-5 w-5" />}
                           </Button>
                       </div>
                   )}
               
                   <Button 
                        variant={isConnected ? "destructive" : "default"}
                        onClick={toggleMedia}
                        size="sm"
                        className={`gap-2 font-semibold shadow-sm transition-all min-w-[120px] ${isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                   >
                       {/* Icon only on Join */}
                       {!isConnected && <VideoCamera weight="bold" />}
                       {isConnected ? "Leave Room" : "Join Room"}
                   </Button>
               </div>
           </div>
       </div>
       
       <main className="flex-1 overflow-hidden flex flex-col md:flex-row bg-background relative">
           {/* Video Grid */}
           <div className="flex-1 p-4 overflow-y-auto bg-slate-950/20">
               {error && (
                   <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded border border-destructive/30 text-sm font-medium flex items-center justify-center">
                       Error: {error}
                   </div>
               )}
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                   {/* Local User */}
                   <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/20 shadow-lg relative group">
                       <video 
                           ref={(el) => {
                               if (el && localStreamRef.current) {
                                   el.srcObject = localStreamRef.current
                               }
                           }}
                           autoPlay 
                           muted 
                           playsInline
                           className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
                       />
                       {/* Audio Visualizer Overlay */}
                       {isConnected && isMicOn && (
                          <div className="absolute top-2 right-2 flex gap-0.5 items-end h-3">
                              <div className="w-1 bg-green-500/80 rounded-full animate-pulse h-full"></div>
                              <div className="w-1 bg-green-500/80 rounded-full animate-pulse h-2/3 animation-delay-75"></div>
                              <div className="w-1 bg-green-500/80 rounded-full animate-pulse h-1/2 animation-delay-150"></div>
                          </div>
                       )}
                       {!isConnected && (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 bg-secondary/10 backdrop-blur-[2px] p-4 text-center">
                               <VideoCamera className="w-12 h-12 mb-2 opacity-30" />
                               <p className="text-sm font-medium">Camera Off</p>
                               <p className="text-xs opacity-70 mt-1">Join to start streaming</p>
                           </div>
                       )}
                       <div className="absolute bottom-2 left-2 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white/90 font-medium flex items-center gap-1.5 border border-white/10"
                            style={{ backgroundColor: getUserColor(userId) }}>
                           {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>}
                           You {sourceLang !== 'auto' ? `(${sourceLang})` : ''}
                       </div>
                   </div>
                   
                   {/* Remote Users */}
                   {members.map((mId) => (
                       <div key={mId} className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border/20 shadow-lg relative group">
                           <img 
                               ref={(el) => registerVideoRef(mId, el)}
                               className="w-full h-full object-cover"
                               alt={`User ${mId}`}
                           />
                           
                           {/* Placeholder underneath image */}
                           <div className="absolute inset-0 flex items-center justify-center -z-10 bg-zinc-900">
                               <User className="w-12 h-12 text-zinc-800" />
                           </div>
                           
                           {/* Name Label */}
                           <div className="absolute bottom-2 left-2 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white/90 font-medium border border-white/10"
                                style={{ backgroundColor: getUserColor(mId) }}>
                               User {mId.slice(0,4)}
                           </div>
                           
                           {/* Voice Selector Overlay (Visible on Hover) */}
                           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Select 
                                    onValueChange={(val) => setPeerVoice(mId, val)} 
                                    disabled={!isConnected}
                               >
                                   <SelectTrigger className="w-[120px] h-7 text-[10px] bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 focus:ring-0">
                                       <div className="flex items-center gap-1.5 overflow-hidden">
                                           <SpeakerHigh className="h-3 w-3 shrink-0" />
                                           <span className="truncate">Set Voice</span>
                                       </div>
                                   </SelectTrigger>
                                   <SelectContent>
                                       {(VOICE_OPTIONS[targetLang] || []).map(v => (
                                           <SelectItem key={v.id} value={v.id} className="text-xs">
                                               <span>{v.name}</span>
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
           
           {/* Transcripts Sidebar */}
           <div className="w-full md:w-80 lg:w-96 border-l border-border/60 bg-card/60 backdrop-blur-xl flex flex-col shrink-0 z-30 h-[40vh] md:h-auto shadow-[-4px_0_16px_rgba(0,0,0,0.1)]">
               <div className="flex-1 overflow-hidden relative">
                   <div className="absolute inset-0">
                       <TranscriptView 
                           entries={transcripts}
                           isListening={isConnected}
                           currentPartial={partialWait}
                       />
                   </div>
               </div>
           </div>
       </main>
    </div>
  )
}
