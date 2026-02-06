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

// Languages supported by both Deepgram and Lingo.dev
const LANGUAGES = [
  { code: "auto", name: "Auto-detect", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
]

// Target languages (excludes auto-detect)
const TARGET_LANGUAGES = LANGUAGES.filter(lang => lang.code !== "auto")

export function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  const handleSwapLanguages = () => {
    // Can't swap if source is auto-detect
    if (sourceLanguage === "auto") return
    
    const temp = sourceLanguage
    onSourceLanguageChange(targetLanguage)
    onTargetLanguageChange(temp)
  }

  const canSwap = sourceLanguage !== "auto"

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
                {LANGUAGES.map((lang) => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code}
                    disabled={lang.code === targetLanguage}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
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
              title={canSwap ? "Swap languages" : "Cannot swap when using auto-detect"}
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
                {TARGET_LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
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
