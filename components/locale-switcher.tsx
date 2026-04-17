"use client"

import { useLingoContext } from "@lingo.dev/compiler/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe } from "@phosphor-icons/react"

const LOCALE_ABBR: Record<string, string> = {
  en: "Eng", es: "Esp", fr: "Fra", de: "Deu", it: "Ita",
  nl: "Nld", ja: "Jpn", pt: "Por", zh: "Zho", ko: "Kor",
  vi: "Vie", pl: "Pol",
}

export function LocaleSwitcher() {
  const { locale, sourceLocale, setLocale, isLoading } = useLingoContext()

  const onSelectChange = async (nextLocale: string) => {
    if (nextLocale === locale) return

    const isSourceToTargetSwitch = locale === sourceLocale && nextLocale !== sourceLocale
    await setLocale(nextLocale as any)

    // Work around a Lingo dev-mode stale hash cache issue after selecting source locale.
    if (isSourceToTargetSwitch) {
      window.location.reload()
    }
  }

  return (
    <Select value={locale} onValueChange={onSelectChange} disabled={isLoading}>
      <SelectTrigger className="sm:w-[140px] h-9 px-2 sm:px-3 gap-1.5 sm:gap-2">
        <Globe className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />
        {/* Mobile: 3-char abbreviation only (no globe, auto width) */}
        <span className="sm:hidden text-xs font-semibold">
          {LOCALE_ABBR[locale ?? ""] ?? locale?.toUpperCase() ?? "---"}
        </span>
        {/* Desktop: full language name */}
        <span className="hidden sm:inline">
          <SelectValue placeholder="Language" />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="de">Deutsch</SelectItem>
        <SelectItem value="it">Italiano</SelectItem>
        <SelectItem value="nl">Nederlands</SelectItem>
        <SelectItem value="ja">日本語</SelectItem>
        <SelectItem value="pt">Português</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
        <SelectItem value="ko">한국어</SelectItem>
        <SelectItem value="vi">Tiếng Việt</SelectItem>
        <SelectItem value="pl">Polski</SelectItem>
      </SelectContent>
    </Select>
  )
}
