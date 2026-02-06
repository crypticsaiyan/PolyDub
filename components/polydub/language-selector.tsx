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
  targetLanguages: string[]
  onSourceLanguageChange: (lang: string) => void
  onToggleTargetLanguage: (lang: string) => void
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
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "tl", name: "Tagalog", flag: "🇵🇭" },
  { code: "fa", name: "Persian", flag: "🇮🇷" },
  { code: "be", name: "Belarusian", flag: "🇧🇾" },
  { code: "bn", name: "Bengali", flag: "🇧🇩" },
  { code: "bs", name: "Bosnian", flag: "🇧🇦" },
  { code: "ca", name: "Catalan", flag: "🏳️" }, 
  { code: "et", name: "Estonian", flag: "🇪🇪" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "lv", name: "Latvian", flag: "🇱🇻" },
  { code: "lt", name: "Lithuanian", flag: "🇱🇹" },
  { code: "mk", name: "Macedonian", flag: "🇲🇰" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "sr", name: "Serbian", flag: "🇷🇸" },
  { code: "sl", name: "Slovenian", flag: "🇸🇮" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
]

export function LanguageSelector({
  sourceLanguage,
  targetLanguages,
  onSourceLanguageChange,
  onToggleTargetLanguage,
  disabled = false,
}: LanguageSelectorProps) {
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

          {/* Target Languages (Multi-select) */}
          <div className="space-y-2">
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
        </div>
      </CardContent>
    </Card>
  )
}
