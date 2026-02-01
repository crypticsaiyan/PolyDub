"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Cube, CaretRight } from "@phosphor-icons/react/dist/ssr"

const CONFIGS = [
  {
    name: "research-assistant",
    runtime: "python3.12",
    memory: "2gb",
    min: "0",
    max: "100",
    tools: '["web", "file", "code"]',
  },
  {
    name: "code-reviewer",
    runtime: "node20",
    memory: "4gb",
    min: "1",
    max: "50",
    tools: '["github", "code", "slack"]',
  },
  {
    name: "data-analyst",
    runtime: "python3.12",
    memory: "8gb",
    min: "0",
    max: "200",
    tools: '["sql", "charts", "file"]',
  },
  {
    name: "customer-support",
    runtime: "bun1.1",
    memory: "1gb",
    min: "5",
    max: "500",
    tools: '["email", "crm", "docs"]',
  },
  {
    name: "content-writer",
    runtime: "deno2.0",
    memory: "2gb",
    min: "0",
    max: "25",
    tools: '["web", "image", "seo"]',
  },
]

export function TerminalDemo() {
  const [configIndex, setConfigIndex] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const cycleRef = useRef<NodeJS.Timeout | null>(null)
  const [bulletsVisible, setBulletsVisible] = useState([false, false, false])
  const bulletsSectionRef = useRef<HTMLDivElement>(null)
  const bulletsAnimatedRef = useRef(false)

  const config = CONFIGS[configIndex]

  // Build the full string we're typing
  const fullText = `${config.name}|${config.runtime}|${config.memory}|${config.min}|${config.max}|${config.tools}`
  const totalChars = fullText.length

  // Get displayed value for each field based on typedChars
  const getFieldValue = (fieldIndex: number): string => {
    const parts = fullText.split("|")
    let charsBefore = 0
    for (let i = 0; i < fieldIndex; i++) {
      charsBefore += parts[i].length + 1 // +1 for delimiter
    }
    const fieldStart = charsBefore
    const fieldEnd = charsBefore + parts[fieldIndex].length

    if (typedChars <= fieldStart) return ""
    if (typedChars >= fieldEnd) return parts[fieldIndex]
    return parts[fieldIndex].slice(0, typedChars - fieldStart)
  }

  const getCursorField = (): number => {
    const parts = fullText.split("|")
    let charsBefore = 0
    for (let i = 0; i < parts.length; i++) {
      const fieldEnd = charsBefore + parts[i].length
      if (typedChars <= fieldEnd) return i
      charsBefore = fieldEnd + 1
    }
    return -1
  }

  // Single typing effect
  useEffect(() => {
    if (isComplete) return

    if (typedChars < totalChars) {
      animationRef.current = setTimeout(
        () => {
          setTypedChars((prev) => prev + 1)
        },
        100 + Math.random() * 50,
      ) // 100-150ms per char
    } else {
      setIsComplete(true)
    }

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current)
    }
  }, [typedChars, totalChars, isComplete])

  // Cycle to next config after completion
  useEffect(() => {
    if (!isComplete) return

    cycleRef.current = setTimeout(() => {
      setConfigIndex((prev) => (prev + 1) % CONFIGS.length)
      setTypedChars(0)
      setIsComplete(false)
    }, 3000) // Wait 3 seconds before cycling

    return () => {
      if (cycleRef.current) clearTimeout(cycleRef.current)
    }
  }, [isComplete])

  useEffect(() => {
    if (!bulletsSectionRef.current || bulletsAnimatedRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !bulletsAnimatedRef.current) {
            bulletsAnimatedRef.current = true
            // Stagger the bullet animations
            setTimeout(() => setBulletsVisible((prev) => [true, prev[1], prev[2]]), 0)
            setTimeout(() => setBulletsVisible((prev) => [prev[0], true, prev[2]]), 200)
            setTimeout(() => setBulletsVisible((prev) => [prev[0], prev[1], true]), 400)
          }
        })
      },
      { threshold: 0.3 },
    )

    observer.observe(bulletsSectionRef.current)
    return () => observer.disconnect()
  }, [])

  const cursorField = getCursorField()
  const showCursor = !isComplete

  const renderValue = (fieldIndex: number, isString = true) => {
    const value = getFieldValue(fieldIndex)
    const hasCursor = showCursor && cursorField === fieldIndex
    const colorClass = isString ? "text-[var(--color-keppel-300)]" : "text-[var(--color-keppel-400)]"

    return (
      <span className={colorClass}>
        {isString ? `"${value}"` : value}
        {hasCursor && (
          <span className="inline-block w-[2px] h-[1em] bg-[var(--color-keppel-400)] ml-px animate-pulse" />
        )}
      </span>
    )
  }

  return (
    <section className="py-24 border-t border-[var(--color-baltic-sea-900)]">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20">
          {/* Code block - left */}
          <div className="flex-1">
            <div
              className="rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-900)] overflow-hidden"
              style={{ boxShadow: "var(--bento-shadow)" }}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-baltic-sea-800)] px-4 py-3 bg-[var(--color-baltic-sea-950)]/50">
                <div className="flex items-center gap-3">
                  <Cube weight="fill" className="h-4 w-4 text-[var(--color-baltic-sea-500)]" />
                  <span className="text-xs text-[var(--color-baltic-sea-500)] font-mono">agent.config.ts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {CONFIGS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (animationRef.current) clearTimeout(animationRef.current)
                        if (cycleRef.current) clearTimeout(cycleRef.current)
                        setConfigIndex(i)
                        setTypedChars(0)
                        setIsComplete(false)
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === configIndex
                          ? "w-4 bg-[var(--color-keppel-400)]"
                          : "w-1.5 bg-[var(--color-baltic-sea-600)] hover:bg-[var(--color-baltic-sea-500)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-5 font-mono text-sm overflow-x-auto">
                <pre className="text-[var(--color-baltic-sea-400)]">
                  <code>
                    <span className="text-[var(--color-baltic-sea-500)]">{"// Define your agent"}</span>
                    {"\n"}
                    <span className="text-[var(--color-keppel-400)]">export default</span>{" "}
                    <span className="text-[var(--color-baltic-sea-200)]">defineAgent</span>
                    {"({"}
                    {"\n"}
                    {"  "}
                    <span className="text-[var(--color-baltic-sea-300)]">name</span>: {renderValue(0)},{"\n"}
                    {"  "}
                    <span className="text-[var(--color-baltic-sea-300)]">runtime</span>: {renderValue(1)},{"\n"}
                    {"  "}
                    <span className="text-[var(--color-baltic-sea-300)]">memory</span>: {renderValue(2)},{"\n"}
                    {"  "}
                    <span className="text-[var(--color-baltic-sea-300)]">scaling</span>: {"{"}
                    {"\n"}
                    {"    "}
                    <span className="text-[var(--color-baltic-sea-300)]">min</span>: {renderValue(3, false)},{"\n"}
                    {"    "}
                    <span className="text-[var(--color-baltic-sea-300)]">max</span>: {renderValue(4, false)},{"\n"}
                    {"  "}
                    {"}"},{"\n"}
                    {"  "}
                    <span className="text-[var(--color-baltic-sea-300)]">tools</span>: {renderValue(5, false)},{"\n"}
                    {"})"}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* CTA content - right */}
          <div className="lg:max-w-md">
            <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">
              Get started
            </span>
            <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl">
              Deploy in under 60 seconds
            </h2>
            <p className="mt-4 text-lg text-[var(--color-baltic-sea-400)]">
              Define your agent, push to git, and watch it go live. No YAML, no Kubernetes, no complexity.
            </p>

            <div ref={bulletsSectionRef} className="mt-8 space-y-4">
              {["1,000 free compute hours", "No credit card required", "Deploy from GitHub in one click"].map(
                (text, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 transition-all duration-500 ease-out"
                    style={{
                      opacity: bulletsVisible[index] ? 1 : 0,
                      transform: bulletsVisible[index] ? "translateX(0)" : "translateX(40px)",
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-keppel-950)] border border-[var(--color-keppel-800)]">
                      <CaretRight weight="bold" className="h-4 w-4 text-[var(--color-keppel-400)]" />
                    </div>
                    <span className="text-[var(--color-baltic-sea-300)]">{text}</span>
                  </div>
                ),
              )}
            </div>

            <div className="mt-10">
              <Button
                size="lg"
                className="bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-300)] rounded-full h-12 px-6"
              >
                Start building
                <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
