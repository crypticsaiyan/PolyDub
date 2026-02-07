"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Microphone,
  Translate,
  SpeakerHigh,
  ArrowRight,
  Waveform,
  Globe,
  Lightning,
} from "@phosphor-icons/react"

export function LandingPage() {
  return (
    <div className="flex-1 w-full bg-[var(--color-baltic-sea-950)] text-[var(--color-baltic-sea-100)]">
      <div className="h-16" />

      <main>
        {/* Hero */}
        <section className="relative isolate border-b border-[var(--color-baltic-sea-800)] overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover -z-20"
          >
            <source src="/bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[var(--color-baltic-sea-950)]/50 -z-10" />
          <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12 py-20">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-6 text-sm font-medium tracking-wide text-[var(--color-keppel-400)] uppercase">
                Global Communication Platform
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-[var(--color-baltic-sea-50)] leading-[1.12]">
                Connect in any language.
                <br />
                <span className="text-[var(--color-keppel-400)]">Live.</span>
              </h1>
              <p className="mt-6 text-lg text-[var(--color-baltic-sea-200)] max-w-2xl mx-auto leading-relaxed">
                PolyDub powers seamless cross-language communication. Whether you're broadcasting to the world or collaborating with a team, our AI translates and dubs your voice in real-time.
              </p>
              
              <div className="mt-12 grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
                 {/* Option 1: Broadcast */}
                 <div className="group relative rounded-2xl bg-[var(--color-baltic-sea-900)]/10 backdrop-blur-md border border-[var(--color-baltic-sea-700)] p-8 hover:border-[var(--color-keppel-500)] transition-all hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-keppel-500)]/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)] mb-5 mx-auto group-hover:bg-[var(--color-keppel-500)] group-hover:text-[var(--color-keppel-950)] transition-colors">
                       <SpeakerHigh className="h-6 w-6" weight="fill" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--color-baltic-sea-50)] mb-2">Broadcast</h3>
                    <p className="text-sm text-[var(--color-baltic-sea-300)] mb-6 leading-relaxed">
                       One-to-many live translation. Perfect for keynote speeches, webinars, and events.
                    </p>
                    <Button 
                      asChild 
                      className="w-full bg-[var(--color-keppel-600)] hover:bg-[var(--color-keppel-500)] text-[var(--color-keppel-50)] hover:text-[var(--color-keppel-950)] font-semibold transition-all shadow-lg shadow-[var(--color-keppel-900)]/20 relative z-10"
                    >
                       <Link href="/app">
                          Start Broadcast <ArrowRight className="ml-2 h-4 w-4" />
                       </Link>
                    </Button>
                 </div>

                 {/* Option 2: Rooms */}
                 <div className="group relative rounded-2xl bg-[var(--color-baltic-sea-900)]/10 backdrop-blur-md border border-[var(--color-baltic-sea-700)] p-8 hover:border-[var(--color-keppel-500)] transition-all hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-keppel-500)]/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)] mb-5 mx-auto group-hover:bg-[var(--color-keppel-500)] group-hover:text-[var(--color-keppel-950)] transition-colors">
                       <Globe className="h-6 w-6" weight="fill" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--color-baltic-sea-50)] mb-2">Rooms</h3>
                    <p className="text-sm text-[var(--color-baltic-sea-300)] mb-6 leading-relaxed">
                       Many-to-many multilingual meetings. Collaborate with video and real-time dubbing.
                    </p>
                    <Button 
                      asChild 
                      className="w-full bg-[var(--color-keppel-600)] hover:bg-[var(--color-keppel-500)] text-[var(--color-keppel-50)] hover:text-[var(--color-keppel-950)] font-semibold transition-all shadow-lg shadow-[var(--color-keppel-900)]/20 relative z-10"
                    >
                       <Link href="/rooms">
                          Join a Room <ArrowRight className="ml-2 h-4 w-4" />
                       </Link>
                    </Button>
                    
                 </div>
              </div>

            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 lg:py-32 border-b border-[var(--color-baltic-sea-800)]">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <p className="text-center text-sm font-medium tracking-wide text-[var(--color-keppel-400)] uppercase mb-3">
              How it works
            </p>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-100)] sm:text-3xl mb-16">
              Three steps from speech to translated audio
            </h2>
            <div className="grid gap-12 sm:grid-cols-3 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)]">
                  <Microphone className="h-7 w-7" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">Speak</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)] leading-relaxed">
                  Pick source and target languages, then speak into your mic. No scripts—just talk.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)]">
                  <Translate className="h-7 w-7" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">Translate</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)] leading-relaxed">
                  Speech is transcribed and translated in real time with Lingo.dev and Deepgram.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-baltic-sea-800)] text-[var(--color-keppel-400)]">
                  <SpeakerHigh className="h-7 w-7" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">Listen</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)] leading-relaxed">
                  Translated speech is spoken back with natural AI voice so others hear it live.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stack */}
        <section className="py-24 lg:py-32 border-b border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)]/30">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <p className="text-center text-sm font-medium tracking-wide text-[var(--color-keppel-400)] uppercase mb-3">
              Built for real-time
            </p>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-[var(--color-baltic-sea-100)] sm:text-3xl mb-14">
              Powered by Lingo.dev and Deepgram
            </h2>
            <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
              <div className="rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)] mb-4">
                  <Waveform className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">Deepgram</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)]">
                  Real-time speech-to-text and text-to-speech with Aura voices.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)] mb-4">
                  <Globe className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">Lingo.dev</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)]">
                  Translation that keeps context and tone so output sounds natural.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)] mb-4">
                  <Lightning className="h-5 w-5 text-[var(--color-keppel-400)]" weight="fill" />
                </div>
                <h3 className="font-semibold text-[var(--color-baltic-sea-100)]">WebSockets</h3>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)]">
                  Streaming pipeline for low-latency speech in and audio out.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="hidden" />
    </div>
  )
}
