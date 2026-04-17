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
      <SelectTrigger className="w-[140px] h-9 gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Language" />
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
