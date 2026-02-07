"use client"

import * as React from "react"
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
  const { locale, setLocale } = useLingoContext()
  const [isPending, startTransition] = React.useTransition()

  const onSelectChange = (nextLocale: string) => {
    startTransition(() => {
      setLocale(nextLocale as any)
    })
  }

  return (
    <Select value={locale} onValueChange={onSelectChange} disabled={isPending}>
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
        <SelectItem value="hi">हिन्दी</SelectItem>
        <SelectItem value="ar">العربية</SelectItem>
        <SelectItem value="ko">한국어</SelectItem>
        <SelectItem value="tr">Türkçe</SelectItem>
        <SelectItem value="vi">Tiếng Việt</SelectItem>
        <SelectItem value="pl">Polski</SelectItem>
        <SelectItem value="uk">Українська</SelectItem>
      </SelectContent>
    </Select>
  )
}
