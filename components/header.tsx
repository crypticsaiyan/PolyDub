"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { List, X } from "@phosphor-icons/react/dist/ssr"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/vod", label: "Studio" },
  { href: "/broadcast", label: "Broadcast" },
  { href: "/rooms", label: "Rooms" },
]

export function Header() {
  const pathname = usePathname()
  const isLanding = pathname === "/" || pathname === "/en" || pathname?.match(/^\/[a-z]{2}$/)
  const headerDark = isLanding
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const headerClass = headerDark
    ? "fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)]/90 backdrop-blur-md"
    : "fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"

  return (
    <header className={headerClass}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8 transition-all duration-300 group-hover:scale-110">
            <Image
              src="/logo.svg"
              alt="PolyDub Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-heading">
            PolyDub
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Button key={href} variant="ghost" asChild>
              <Link href={href}>{label}</Link>
            </Button>
          ))}
          <LocaleSwitcher />
        </div>

        {/* Mobile nav trigger */}
        <div className="flex md:hidden items-center gap-2">
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen(o => !o)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t ${
            headerDark
              ? "border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)]/95"
              : "border-border bg-background/95"
          } backdrop-blur-md`}
        >
          <nav className="flex flex-col px-6 py-2 gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Button
                key={href}
                variant="ghost"
                asChild
                className="justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
