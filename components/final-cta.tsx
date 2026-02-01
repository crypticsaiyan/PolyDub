"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Rocket } from "@phosphor-icons/react/dist/ssr"

export function FinalCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="py-24 border-t border-[var(--color-baltic-sea-900)] overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`relative rounded-3xl border border-[var(--color-keppel-800)]/50 bg-gradient-to-br from-[var(--color-keppel-950)] via-[var(--color-baltic-sea-950)] to-[var(--color-baltic-sea-950)] p-8 lg:p-16 text-center overflow-hidden transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          style={{
            boxShadow: isVisible ? "0 0 120px -30px var(--color-keppel-600)" : "none",
            transitionProperty: "opacity, transform, box-shadow",
          }}
        >
          <div
            className={`absolute inset-0 transition-opacity duration-1000 delay-500 ${isVisible ? "opacity-10" : "opacity-0"}`}
            style={{
              backgroundImage: `radial-gradient(var(--color-keppel-400) 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full bg-[var(--color-keppel-400)]/30 transition-all duration-1000 ${
                  isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 30}%`,
                  transitionDelay: `${800 + i * 100}ms`,
                  animation: isVisible ? `float ${3 + i * 0.5}s ease-in-out infinite` : "none",
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-keppel-900)]/50 border border-[var(--color-keppel-700)] mb-6 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-90"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <Rocket weight="duotone" className="h-4 w-4 text-[var(--color-keppel-400)]" />
              <span className="text-sm font-medium text-[var(--color-keppel-300)]">1,000 free compute hours</span>
            </div>

            <h2
              className={`text-3xl md:text-5xl font-bold text-[var(--color-baltic-sea-100)] mb-4 text-balance transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-8 blur-sm"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              Ready to deploy your first agent?
            </h2>

            <p
              className={`text-lg text-[var(--color-baltic-sea-400)] max-w-xl mx-auto mb-8 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "500ms" }}
            >
              Join thousands of developers building the next generation of autonomous systems.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              <Button
                size="lg"
                className={`bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-300)] rounded-full h-12 px-8 font-semibold transition-all duration-500 hover:shadow-[0_0_30px_-5px_var(--color-keppel-400)] ${
                  isVisible ? "translate-x-0" : "-translate-x-8"
                }`}
                style={{ transitionDelay: "700ms" }}
              >
                Start building free
                <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className={`text-[var(--color-baltic-sea-300)] hover:text-[var(--color-baltic-sea-100)] hover:bg-[var(--color-baltic-sea-800)] rounded-full h-12 px-8 transition-all duration-500 ${
                  isVisible ? "translate-x-0" : "translate-x-8"
                }`}
                style={{ transitionDelay: "700ms" }}
              >
                Schedule a demo
              </Button>
            </div>

            <p
              className={`mt-6 text-sm text-[var(--color-baltic-sea-500)] transition-all duration-700 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: "800ms" }}
            >
              No credit card required · Deploy in under 60 seconds · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
