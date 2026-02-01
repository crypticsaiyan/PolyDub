"use client"

import { Cube, Lightning } from "@phosphor-icons/react/dist/ssr"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-100)]">
              <Cube weight="fill" className="h-5 w-5 text-[var(--color-baltic-sea-950)]" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-baltic-sea-950)] bg-[var(--color-keppel-400)]" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)]">
            PolyDub
          </span>
        </div>

        {/* Hackathon Badge */}
        <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5">
          <Lightning className="h-4 w-4 text-accent" weight="fill" />
          <span className="text-sm font-medium text-accent">Lingo.dev Hackathon</span>
        </div>
      </div>
    </header>
  )
}
