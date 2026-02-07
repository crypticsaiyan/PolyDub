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
import { ArrowsLeftRight, Globe, Translate, SpeakerHigh } from "@phosphor-icons/react"
import { Separator } from "@/components/ui/separator"

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
          setPlayingVoiceId(null);
      }
  };

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex flex-col gap-6">
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

          <Separator className="bg-border/50" />

          {/* Target Languages (Multi-select) */}
          <div className="space-y-3">
            <Label 
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              <Translate className="h-3.5 w-3.5" />
              Broadcast to
            </Label>
            <div className="flex flex-wrap gap-2">
              {TTS_LANGUAGES.map((lang) => {
                const isSelected = targetLanguages.includes(lang.code)
                return (
                  <Button
                    key={lang.code}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => onToggleTargetLanguage(lang.code)}
                    disabled={disabled}
                    className={`gap-2 h-9 transition-all ${
                      isSelected ? "ring-2 ring-background ring-offset-2" : "hover:border-primary/50"
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>
                      <span className="opacity-50 font-mono mr-1 uppercase text-[10px]">{lang.code}</span>
                      {lang.name}
                    </span>
                  </Button>
                )
              })}
            </div>
            {targetLanguages.length === 0 && (
              <p className="text-xs text-amber-500 font-medium animate-pulse">
                * Select at least one language to broadcast
              </p>
            )}
          </div>

          {/* Voice Settings (Only show if target languages selected) */}
          {targetLanguages.length > 0 && onVoiceChange && (
             <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                <Label 
                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                >
                  <SpeakerHigh className="h-3.5 w-3.5" />
                  Voice Settings
                </Label>
                <div className="grid gap-3">
                   {targetLanguages.map(langCode => {
                      const langInfo = TTS_LANGUAGES.find(l => l.code === langCode)
                      const voiceOptions = VOICE_OPTIONS[langCode] || []
                      const currentVoice = targetVoices[langCode] || (voiceOptions[0]?.id || '')

                      if (voiceOptions.length === 0) return null

                      return (
                         <div key={langCode} className="flex items-center gap-2">
                            <div className="flex flex-1 items-center justify-between gap-3 p-2 rounded-lg bg-muted/40 border text-sm">
                               <div className="flex items-center gap-2">
                                  <span className="text-lg">{langInfo?.flag}</span>
                                  <span className="font-medium text-muted-foreground">{langInfo?.name}</span>
                               </div>
                               <Select
                                  value={currentVoice}
                                  onValueChange={(val) => onVoiceChange(langCode, val)}
                                  disabled={disabled}
                               >
                                  <SelectTrigger className="h-8 w-[180px] bg-background">
                                     <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                     {voiceOptions.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                           <span className="flex items-center justify-between w-full gap-2">
                                               <span>{v.name}</span>
                                               <span className="text-xs opacity-50 px-1 border rounded">{v.gender}</span>
                                           </span>
                                        </SelectItem>
                                     ))}
                                  </SelectContent>
                               </Select>
                            </div>
                            
                            <Button
                                variant="ghost" 
                                size="icon"
                                className={`h-9 w-9 shrink-0 transition-colors ${
                                    playingVoiceId === currentVoice 
                                        ? "bg-muted text-foreground" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                                disabled={disabled || (playingVoiceId !== null && playingVoiceId !== currentVoice)}
                                onClick={() => handlePreview(langCode, currentVoice, `Hello, this is ${getVoiceName(langCode, currentVoice)}.`)}
                            >
                                {playingVoiceId === currentVoice ? (
                                    <SpeakerHigh className="h-4 w-4 animate-pulse" weight="fill" />
                                ) : (
                                    <SpeakerHigh className="h-4 w-4" />
                                )}
                            </Button>
                         </div>
                      )
                   })}
                </div>
             </div>
          )}

        </div>
      </CardContent>
    </Card>
  )
}
