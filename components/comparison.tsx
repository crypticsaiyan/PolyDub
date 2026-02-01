"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X, Minus } from "@phosphor-icons/react/dist/ssr"

const FEATURES = [
  { name: "Sub-100ms cold starts", anchor: true, kubernetes: false, lambda: "partial" },
  { name: "GPU acceleration", anchor: true, kubernetes: true, lambda: false },
  { name: "Zero config deployment", anchor: true, kubernetes: false, lambda: "partial" },
  { name: "Built-in observability", anchor: true, kubernetes: false, lambda: "partial" },
  { name: "Auto-scaling to zero", anchor: true, kubernetes: "partial", lambda: true },
  { name: "Agent-native primitives", anchor: true, kubernetes: false, lambda: false },
  { name: "Multi-agent orchestration", anchor: true, kubernetes: false, lambda: false },
  { name: "Global edge deployment", anchor: true, kubernetes: "partial", lambda: true },
]

function FeatureCell({ value, isVisible, delay }: { value: boolean | "partial"; isVisible: boolean; delay: number }) {
  const baseClasses = `transition-all duration-500 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"}`

  if (value === true) {
    return (
      <div className="flex justify-center">
        <div
          className={`h-6 w-6 rounded-full bg-[var(--color-keppel-900)] flex items-center justify-center ${baseClasses}`}
          style={{ transitionDelay: `${delay}ms` }}
        >
          <Check weight="bold" className="h-4 w-4 text-[var(--color-keppel-400)]" />
        </div>
      </div>
    )
  }
  if (value === "partial") {
    return (
      <div className="flex justify-center">
        <div
          className={`h-6 w-6 rounded-full bg-[var(--color-baltic-sea-800)] flex items-center justify-center ${baseClasses}`}
          style={{ transitionDelay: `${delay}ms` }}
        >
          <Minus weight="bold" className="h-4 w-4 text-[var(--color-baltic-sea-400)]" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-center">
      <div
        className={`h-6 w-6 rounded-full bg-[var(--color-baltic-sea-900)] flex items-center justify-center ${baseClasses}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <X weight="bold" className="h-4 w-4 text-[var(--color-baltic-sea-600)]" />
      </div>
    </div>
  )
}

export function Comparison() {
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
      <div className="mx-auto max-w-[1000px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
        >
          <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">
            Comparison
          </span>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl text-balance">
            Why teams choose Anchor
          </h2>
        </div>

        <div
          className={`rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] overflow-hidden transition-all duration-700 ease-out ${
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
          }`}
          style={{ boxShadow: "var(--bento-shadow)", transitionDelay: "200ms" }}
        >
          <div className="overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-baltic-sea-800)]">
                  <th className="text-left p-4 lg:p-6 text-sm font-medium text-[var(--color-baltic-sea-400)]">
                    Feature
                  </th>
                  <th className="p-4 lg:p-6 text-sm font-semibold text-[var(--color-keppel-400)]">Anchor</th>
                  <th className="p-4 lg:p-6 text-sm font-medium text-[var(--color-baltic-sea-400)]">Kubernetes</th>
                  <th className="p-4 lg:p-6 text-sm font-medium text-[var(--color-baltic-sea-400)]">Lambda</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-[var(--color-baltic-sea-800)]/50 transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                    }`}
                    style={{ transitionDelay: `${300 + i * 60}ms` }}
                  >
                    <td className="p-4 lg:p-6 text-sm text-[var(--color-baltic-sea-300)]">{feature.name}</td>
                    <td className="p-4 lg:p-6">
                      <FeatureCell value={feature.anchor} isVisible={isVisible} delay={400 + i * 60} />
                    </td>
                    <td className="p-4 lg:p-6">
                      <FeatureCell value={feature.kubernetes} isVisible={isVisible} delay={450 + i * 60} />
                    </td>
                    <td className="p-4 lg:p-6">
                      <FeatureCell value={feature.lambda} isVisible={isVisible} delay={500 + i * 60} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
