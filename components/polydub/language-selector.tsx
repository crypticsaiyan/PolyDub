"use client"

import { useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowsLeftRight, Globe, Translate, SpeakerHigh, Link as LinkIcon, Copy, Check, X } from "@phosphor-icons/react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface LanguageSelectorProps {
  sourceLanguage: string
  targetLanguages: string[]
  targetVoices?: Record<string, string>
  onSourceLanguageChange: (lang: string) => void
  onToggleTargetLanguage: (lang: string) => void
  onVoiceChange?: (lang: string, voiceId: string) => void
  disabled?: boolean
}

// Target Languages (Deepgram Aura-2)
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
export const VOICE_OPTIONS: Record<string, { id: string; name: string; gender: 'M' | 'F' }[]> = {
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

// Source Languages (Deepgram Nova-3)
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

export function LanguageSelector({
  sourceLanguage,
  targetLanguages,
  targetVoices = {},
  onSourceLanguageChange,
  onToggleTargetLanguage,
  onVoiceChange,
  disabled = false,
}: LanguageSelectorProps) {

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  
  // Helper to get voice name
  const getVoiceName = (lang: string, voiceId?: string) => {
      const options = VOICE_OPTIONS[lang] || []
      const found = options.find(v => v.id === voiceId)
      return found ? found.name : "Default"
  }

  const handlePreview = async (lang: string, voiceId: string, text: string) => {
      if (playingVoiceId) return; // Prevent multiple plays
      setPlayingVoiceId(voiceId);
      
      try {
          const res = await fetch('/api/tts-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, voiceId, lang })
          });
          
          if (!res.ok) throw new Error('Failed to fetch audio');
          
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
              setPlayingVoiceId(null);
              URL.revokeObjectURL(audioUrl);
          };
          
          await audio.play();
          
      } catch (e) {
          console.error("Preview failed", e);
          setPlayingVoiceId(null)      }
  };

  const copyLink = (langCode: string) => {
    const url = `${window.location.origin}/audio/${langCode}`
    navigator.clipboard.writeText(url)
    toast.success(`${langCode.toUpperCase()} link copied`)
  }

  return (
    <Card>
      <CardContent className="p-4">

        <div className="grid gap-6 lg:grid-cols-12 items-start h-full">
          
          {/* Left Column: Selections (Span 5) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            {/* Source Language */}
            <div className="space-y-2">
              <Label 
                htmlFor="source-language" 
                className="text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <Globe className="h-3.5 w-3.5" />
                I am speaking
              </Label>
              <Select 
                value={sourceLanguage} 
                onValueChange={onSourceLanguageChange}
                disabled={disabled}
              >
                <SelectTrigger id="source-language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {STT_LANGUAGES.map((lang) => (
                    <SelectItem 
                      key={lang.code} 
                      value={lang.code}
                    >
                      <span className="flex items-center gap-2">
                         <span className="text-base">{lang.flag}</span>
                         <span className="truncate">{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-border/50 lg:hidden" />

            {/* Target Languages */}
             <div className="space-y-2 flex-1">
                 <Label 
                   className="text-xs text-muted-foreground flex items-center gap-1.5"
                 >
                   <Translate className="h-3.5 w-3.5" />
                   Broadcast Languages
                 </Label>
                 <div className="flex flex-wrap gap-2">
                   {TTS_LANGUAGES.map((lang) => {
                     const isSelected = targetLanguages.includes(lang.code)
                     return (
                       <div
                         key={lang.code}
                         onClick={() => onToggleTargetLanguage(lang.code)}
                         className={`
                           cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                           ${isSelected 
                             ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm" 
                             : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                           }
                         `}
                       >
                         <span>{lang.flag}</span>
                         <span>{lang.name}</span>
                         {isSelected && <Check className="h-3 w-3" weight="bold" />}
                       </div>
                     )
                   })}
                 </div>
             </div>
          </div>



          {/* Right Column: Configuration (Span 7) */}
          <div className="lg:col-span-8 h-full flex flex-col">
             <Label 
               className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"
             >
               <LinkIcon className="h-3.5 w-3.5" />
               Channel Configuration
             </Label>
             
             {targetLanguages.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 flex-1 overflow-hidden">
                   <ScrollArea className="h-[280px]">
                      <div className="divide-y divide-border/50">
                        {targetLanguages.map(langCode => {
                             const langInfo = TTS_LANGUAGES.find(l => l.code === langCode)
                             const voiceOptions = VOICE_OPTIONS[langCode] || []
                             const currentVoice = targetVoices[langCode] || (voiceOptions[0]?.id || '')
                             const url = typeof window !== 'undefined' ? `${window.location.origin}/audio/${langCode}` : ''

                             if (!langInfo) return null

                             return (
                                <div key={langCode} className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 text-sm hover:bg-muted/50 transition-colors items-center">
                                   {/* Language Info */}
                                   <div className="flex items-center gap-2 w-24 shrink-0">
                                      <span className="text-lg">{langInfo.flag}</span>
                                      <span className="font-medium text-muted-foreground text-xs">{langInfo.name}</span>
                                   </div>

                                   {/* Voice Select */}
                                   {onVoiceChange && voiceOptions.length > 0 && (
                                     <div className="flex items-center gap-1.5">
                                        <Select
                                            value={currentVoice}
                                            onValueChange={(val) => onVoiceChange(langCode, val)}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger className="h-7 w-[140px] bg-background text-xs border-muted-foreground/20">
                                               <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                               {voiceOptions.map(v => (
                                                  <SelectItem key={v.id} value={v.id} className="text-xs">
                                                     <span>{v.name}</span>
                                                  </SelectItem>
                                               ))}
                                            </SelectContent>
                                        </Select>
                                        
                                        <Button
                                            variant="ghost" 
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                            disabled={disabled || (playingVoiceId !== null && playingVoiceId !== currentVoice)}
                                            onClick={() => handlePreview(langCode, currentVoice, `Hello, this is ${getVoiceName(langCode, currentVoice)}.`)}
                                        >
                                            <SpeakerHigh className={`h-3.5 w-3.5 ${playingVoiceId === currentVoice ? "animate-pulse text-accent" : ""}`} weight={playingVoiceId === currentVoice ? "fill" : "regular"} />
                                        </Button>
                                     </div>
                                   )}

                                   {/* Link Copy */}
                                   <div className="flex items-center gap-1 pl-3 border-l ml-auto">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 font-mono"
                                        onClick={() => copyLink(langCode)}
                                      >
                                        <span>/audio/{langCode}</span>
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                   </div>
                                </div>
                             )
                        })}
                      </div>
                   </ScrollArea>
                </div>
             ) : (
               <div className="flex flex-col items-center justify-center p-8 h-[280px] rounded-lg border border-dashed bg-muted/20 text-muted-foreground text-sm text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Translate className="h-5 w-5 opacity-50" />
                  </div>
                  <p>Select languages on the left<br/>to configure channels</p>
               </div>
             )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
