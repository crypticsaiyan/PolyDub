"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Cube, Lightning } from "@phosphor-icons/react/dist/ssr"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { Button } from "@/components/ui/button"

export function Header() {
  const pathname = usePathname()
  const isLanding = pathname === "/" || pathname === "/en" || pathname?.match(/^\/[a-z]{2}$/)
  const headerDark = isLanding

  return (
    <header
      className={
        headerDark
          ? "fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)]/90 backdrop-blur-md"
          : "fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-100)]">
              <Cube weight="fill" className="h-5 w-5 text-[var(--color-baltic-sea-950)]" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-baltic-sea-950)] bg-[var(--color-keppel-400)]" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)]">
            PolyDub
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {isLanding && (
            <Button
              asChild
              size="sm"
              className="bg-[var(--color-keppel-500)] hover:bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] font-medium rounded-lg"
            >
              <Link href="/app">Try PolyDub</Link>
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-keppel-800)] bg-[var(--color-keppel-950)]/50 px-4 py-1.5">
            <Lightning className="h-4 w-4 text-[var(--color-keppel-400)]" weight="fill" />
            <span className="text-sm font-medium text-[var(--color-keppel-400)]">Lingo.dev Hackathon</span>
          </div>
        </div>
      </div>
    </header>
  )
}
