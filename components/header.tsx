"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Lightning } from "@phosphor-icons/react/dist/ssr"
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

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/broadcast">Broadcast</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/rooms">Rooms</Link>
          </Button>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  )
}
