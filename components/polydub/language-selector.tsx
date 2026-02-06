"use client"

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
import { ArrowsLeftRight, Globe, Translate } from "@phosphor-icons/react"

interface LanguageSelectorProps {
  sourceLanguage: string
  targetLanguage: string
  onSourceLanguageChange: (lang: string) => void
  onTargetLanguageChange: (lang: string) => void
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
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
  { code: "hr", name: "Croatian", flag: "🇭🇷" },
  { code: "sk", name: "Slovak", flag: "🇸🇰" },
  { code: "th", name: "Thai", flag: "🇹🇭" }, // Nova-2 supported, keeping for completeness
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "tl", name: "Tagalog", flag: "🇵🇭" },
  { code: "fa", name: "Persian", flag: "🇮🇷" },
]

export function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  // Check if current source is a valid target language to allow swapping
  const canSwap = sourceLanguage !== "auto" && TTS_LANGUAGES.some(l => l.code === sourceLanguage)

  const handleSwapLanguages = () => {
    if (!canSwap) return
    
    const temp = sourceLanguage
    onSourceLanguageChange(targetLanguage)
    onTargetLanguageChange(temp)
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-3">
          {/* Source Language */}
          <div className="flex-1 space-y-1.5">
            <Label 
              htmlFor="source-language" 
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              <Globe className="h-3.5 w-3.5" />
              From
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
                    disabled={lang.code === targetLanguage}
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

          {/* Swap Button */}
          <div className="pt-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapLanguages}
              disabled={!canSwap || disabled}
              className="rounded-full hover:bg-accent/10"
              title={canSwap ? "Swap languages" : "Cannot swap (Target does not support this Source language)"}
            >
              <ArrowsLeftRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Target Language */}
          <div className="flex-1 space-y-1.5">
            <Label 
              htmlFor="target-language" 
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              <Translate className="h-3.5 w-3.5" />
              To
            </Label>
            <Select 
              value={targetLanguage} 
              onValueChange={onTargetLanguageChange}
              disabled={disabled}
            >
              <SelectTrigger id="target-language" className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {TTS_LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
