"use client"

import { useEffect, useRef, useState } from "react"
import { Code, GitBranch, Rocket } from "@phosphor-icons/react/dist/ssr"

const STEPS = [
  {
    icon: Code,
    number: "01",
    title: "Define your agent",
    description: "Write your agent logic in Python or TypeScript. Use our SDK or bring your own framework.",
  },
  {
    icon: GitBranch,
    number: "02",
    title: "Push to Git",
    description: "Connect your repository. Every push triggers an automatic build and deployment.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Scale infinitely",
    description: "Your agent goes live instantly. We handle scaling, monitoring, and global distribution.",
  },
]

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
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

  useEffect(() => {
    if (isVisible) {
      STEPS.forEach((_, i) => {
        setTimeout(() => setActiveStep(i), 400 + i * 300)
      })
    }
  }, [isVisible])

  return (
    <section ref={ref} className="py-24 border-t border-[var(--color-baltic-sea-900)] overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
        >
          <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl text-balance">
            From code to production in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`relative transition-all duration-700 ease-out ${
                activeStep >= i ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-95"
              }`}
            >
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden md:block absolute top-10 left-[60%] h-px bg-gradient-to-r from-[var(--color-keppel-600)] to-transparent transition-all duration-1000 ease-out origin-left ${
                    activeStep > i ? "w-[80%] opacity-100" : "w-0 opacity-0"
                  }`}
                  style={{ transitionDelay: "200ms" }}
                />
              )}

              <div className="flex flex-col items-start">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-[var(--color-baltic-sea-900)] border border-[var(--color-baltic-sea-800)] flex items-center justify-center transition-all duration-500 ${
                      activeStep >= i
                        ? "border-[var(--color-keppel-700)] shadow-[0_0_20px_-5px_var(--color-keppel-600)]"
                        : ""
                    }`}
                  >
                    <step.icon
                      weight="duotone"
                      className={`h-7 w-7 transition-colors duration-500 ${activeStep >= i ? "text-[var(--color-keppel-400)]" : "text-[var(--color-baltic-sea-600)]"}`}
                    />
                  </div>
                  <span
                    className={`text-5xl font-bold transition-all duration-500 ${
                      activeStep >= i ? "text-[var(--color-keppel-800)]" : "text-[var(--color-baltic-sea-800)]"
                    }`}
                  >
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-baltic-sea-100)] mb-2">{step.title}</h3>
                <p className="text-[var(--color-baltic-sea-400)]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
