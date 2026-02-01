"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Terminal, Code, Play } from "@phosphor-icons/react"
import { useEffect, useState, useRef } from "react"

const CLI_SEQUENCE = {
  command: "anchor deploy ./agent",
  steps: [
    { text: "Scanning agent configuration...", delay: 600 },
    { text: "Building container image...", delay: 800 },
    { text: "Deploying to edge network...", delay: 1000 },
  ],
  status: {
    endpoint: "agent-7x9k.anchor.run",
    coldStart: "47ms",
  },
}

const AGENT_SEQUENCE = {
  lines: [
    { text: "import { Agent } from '@anchor/sdk'", delay: 80 },
    { text: "", delay: 200 },
    { text: "const agent = new Agent({", delay: 80 },
    { text: "  model: 'gpt-5.2-codex',", delay: 60 },
    { text: "  memory: true,", delay: 60 },
    { text: "  tools: ['web', 'code', 'files']", delay: 60 },
    { text: "})", delay: 100 },
    { text: "", delay: 200 },
    { text: "await agent.run('Analyze the codebase')", delay: 80 },
  ],
  outputs: [
    { text: "Agent initialized...", delay: 400 },
    { text: "Loading tools: web, code, files", delay: 300 },
    { text: "Scanning 847 files...", delay: 500 },
    { text: "Found 12 critical patterns", delay: 400 },
    { text: "Generating report...", delay: 600 },
    { text: "✓ Analysis complete in 2.3s", delay: 0 },
  ],
}

const GRID_ACTIVATION_MAP: Record<number, number[]> = {
  0: [5, 23, 47, 68, 92, 115, 138, 167, 189, 215],
  1: [12, 31, 56, 78, 103, 127, 152, 178, 201, 223, 8, 45, 89, 134, 176],
  2: [3, 19, 42, 65, 88, 112, 139, 163, 186, 209, 234, 17, 54, 97, 143, 188, 211, 237],
}

let animationStarted = false

export function HeroSection() {
  const [typedCommand, setTypedCommand] = useState("")
  const [visibleSteps, setVisibleSteps] = useState<number[]>([])
  const [showStatus, setShowStatus] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set())

  const [showAgentTerminal, setShowAgentTerminal] = useState(false)
  const [agentLines, setAgentLines] = useState<string[]>([])
  const [agentOutputs, setAgentOutputs] = useState<string[]>([])
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [lineConnectorProgress, setLineConnectorProgress] = useState(0)

  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const intervalsRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    if (animationStarted) return
    animationStarted = true

    const addTimeout = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay)
      timeoutsRef.current.push(id)
      return id
    }

    const addInterval = (fn: () => void, delay: number) => {
      const id = setInterval(fn, delay)
      intervalsRef.current.push(id)
      return id
    }

    const cursorInterval = addInterval(() => {
      setCursorVisible((v) => !v)
    }, 530)

    let charIndex = 0
    const typeCommand = () => {
      if (charIndex <= CLI_SEQUENCE.command.length) {
        setTypedCommand(CLI_SEQUENCE.command.slice(0, charIndex))
        charIndex++
        addTimeout(typeCommand, 50 + Math.random() * 30)
      } else {
        addTimeout(() => showSteps(0), 400)
      }
    }

    const activateCellsForStep = (stepIndex: number) => {
      const cells = GRID_ACTIVATION_MAP[stepIndex] || []
      cells.forEach((cellIndex, i) => {
        addTimeout(() => {
          setActiveCells((prev) => new Set([...prev, cellIndex]))
        }, i * 60)
      })
    }

    const showSteps = (stepIndex: number) => {
      if (stepIndex < CLI_SEQUENCE.steps.length) {
        setVisibleSteps((prev) => [...prev, stepIndex])
        activateCellsForStep(stepIndex)
        addTimeout(() => showSteps(stepIndex + 1), CLI_SEQUENCE.steps[stepIndex].delay)
      } else {
        addTimeout(() => {
          setShowStatus(true)
          clearInterval(cursorInterval)
          setCursorVisible(false)
          addTimeout(startAgentTerminal, 800)
        }, 500)
      }
    }

    const startAgentTerminal = () => {
      let progress = 0
      const lineInterval = addInterval(() => {
        progress += 5
        setLineConnectorProgress(progress)
        if (progress >= 100) {
          clearInterval(lineInterval)
          setShowAgentTerminal(true)
          addTimeout(typeAgentCode, 300)
        }
      }, 20)
    }

    const typeAgentCode = () => {
      let lineIndex = 0
      const lines = [...AGENT_SEQUENCE.lines]

      const typeLine = () => {
        if (lineIndex < lines.length) {
          const currentLine = lines[lineIndex]
          const currentDelay = currentLine.delay
          setAgentLines((prev) => [...prev, currentLine.text])
          lineIndex++
          addTimeout(typeLine, currentDelay)
        } else {
          addTimeout(runAgentOutputs, 400)
        }
      }
      typeLine()
    }

    const runAgentOutputs = () => {
      setIsAgentRunning(true)
      let outputIndex = 0
      const outputs = [...AGENT_SEQUENCE.outputs]

      const showOutput = () => {
        if (outputIndex < outputs.length) {
          const currentOutput = outputs[outputIndex]
          const currentDelay = currentOutput.delay
          setAgentOutputs((prev) => [...prev, currentOutput.text])
          outputIndex++
          if (outputIndex < outputs.length) {
            addTimeout(showOutput, currentDelay)
          } else {
            addTimeout(() => setIsAgentRunning(false), 300)
          }
        }
      }
      showOutput()
    }

    addTimeout(typeCommand, 800)

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
    }
  }, [])

  return (
    <section className="relative min-h-screen pb-12 overflow-hidden">
      <div className="absolute inset-0 -top-20 -left-20 -right-20 overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-10 sm:grid-cols-15 lg:grid-cols-20 gap-3 sm:gap-4 lg:gap-5 p-4 opacity-30">
          {[...Array(240)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm transition-all duration-700 ${
                activeCells.has(i)
                  ? "bg-[var(--color-keppel-500)] shadow-[0_0_30px_var(--color-keppel-500)]"
                  : "border border-[var(--color-baltic-sea-800)] bg-transparent"
              }`}
              style={{
                opacity: activeCells.has(i) ? 0.8 : 0.4,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-20">
          {/* Left column - text content */}
          <div className="lg:max-w-xl lg:min-h-screen flex flex-col justify-center pt-24 lg:pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-keppel-700)] bg-[var(--color-keppel-950)] px-3 py-1 text-xs text-[var(--color-keppel-300)] mb-8 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-keppel-400)]" />
              v2.0 now available
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-baltic-sea-50)] leading-[1.1]">
              Containers for
              <br />
              <span className="text-[var(--color-keppel-400)]">autonomous</span>
              <br />
              agents
            </h1>

            <p className="mt-6 text-lg text-[var(--color-baltic-sea-400)] max-w-md leading-relaxed">
              Deploy AI agents in isolated, secure containers with sub-50ms cold starts. Scale from zero to thousands
              instantly.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-[var(--color-keppel-500)] hover:bg-[var(--color-keppel-600)] text-[var(--color-keppel-950)] font-semibold px-6"
              >
                Start deploying
                <ArrowRight className="ml-2 h-4 w-4" weight="bold" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-[var(--color-baltic-sea-300)] hover:text-[var(--color-baltic-sea-100)] hover:bg-[var(--color-baltic-sea-900)]"
              >
                View documentation
              </Button>
            </div>
          </div>

          {/* Right column - terminals */}
          <div className="lg:flex-1 lg:max-w-2xl lg:min-h-screen flex flex-col items-center justify-center lg:pt-20">
            {/* Terminal 1 - Deploy */}
            <div className="w-full rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-baltic-sea-800)]">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[var(--color-baltic-sea-700)]" />
                  <div className="h-3 w-3 rounded-full bg-[var(--color-baltic-sea-700)]" />
                  <div className="h-3 w-3 rounded-full bg-[var(--color-baltic-sea-700)]" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-[var(--color-baltic-sea-500)] font-mono">terminal</span>
                </div>
              </div>

              <div className="p-5 font-mono text-sm">
                <div className="flex items-center gap-2 text-[var(--color-baltic-sea-300)]">
                  <span className="text-[var(--color-keppel-500)]">→</span>
                  <span className="text-[var(--color-keppel-500)]">~</span>
                  <span>
                    {typedCommand}
                    {cursorVisible && (
                      <span className="inline-block w-2 h-4 bg-[var(--color-baltic-sea-400)] ml-0.5 animate-pulse" />
                    )}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {visibleSteps.map((stepIndex) => (
                    <div
                      key={stepIndex}
                      className="flex items-center gap-2 text-[var(--color-baltic-sea-400)] animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      {stepIndex < visibleSteps.length - 1 || showStatus ? (
                        <span className="text-[var(--color-keppel-500)]">✓</span>
                      ) : (
                        <span className="inline-block h-3 w-3 border-2 border-[var(--color-keppel-500)] border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>{CLI_SEQUENCE.steps[stepIndex].text}</span>
                    </div>
                  ))}
                </div>

                {showStatus && (
                  <div className="mt-5 p-4 rounded-lg border border-[var(--color-keppel-800)] bg-[var(--color-keppel-950)] animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-2 text-[var(--color-keppel-400)] text-xs uppercase tracking-wider mb-3">
                      <Play weight="fill" className="h-3 w-3" />
                      <span>Deployed</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-baltic-sea-500)]">endpoint</span>
                        <span className="text-[var(--color-baltic-sea-200)]">{CLI_SEQUENCE.status.endpoint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-baltic-sea-500)]">cold start</span>
                        <span className="text-[var(--color-keppel-400)]">{CLI_SEQUENCE.status.coldStart}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {lineConnectorProgress > 0 && (
              <div className="relative w-px h-16 flex items-center justify-center">
                <div
                  className="absolute top-0 w-px bg-gradient-to-b from-[var(--color-keppel-500)] to-[var(--color-keppel-400)] transition-all duration-100"
                  style={{
                    height: `${lineConnectorProgress}%`,
                    boxShadow: "0 0 20px var(--color-keppel-500), 0 0 40px var(--color-keppel-600)",
                  }}
                />
                {lineConnectorProgress >= 100 && (
                  <div className="absolute -bottom-1 h-3 w-3 rounded-full bg-[var(--color-keppel-500)] animate-pulse shadow-[0_0_15px_var(--color-keppel-500)]" />
                )}
              </div>
            )}

            {/* Terminal 2 - Agent */}
            {showAgentTerminal && (
              <div
                className="w-full rounded-xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] overflow-hidden animate-in fade-in zoom-in-95 duration-500"
                style={{
                  boxShadow: "0 0 60px -10px var(--color-keppel-900)",
                }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-baltic-sea-800)]">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[var(--color-baltic-sea-700)]" />
                    <div className="h-3 w-3 rounded-full bg-[var(--color-baltic-sea-700)]" />
                    <div className="h-3 w-3 rounded-full bg-[var(--color-keppel-500)]" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-[var(--color-baltic-sea-500)] font-mono flex items-center justify-center gap-2">
                      <Code weight="bold" className="h-3 w-3" />
                      agent.ts
                    </span>
                  </div>
                </div>

                <div className="p-5 font-mono text-sm">
                  <div className="space-y-0.5">
                    {agentLines.map((line, i) => (
                      <div key={i} className="animate-in fade-in slide-in-from-left-1 duration-150">
                        {line === "" ? (
                          <div className="h-5" />
                        ) : line.startsWith("import") ? (
                          <span>
                            <span className="text-[var(--color-baltic-sea-500)]">import</span>
                            <span className="text-[var(--color-baltic-sea-300)]">
                              {" "}
                              {"{"} Agent {"}"}{" "}
                            </span>
                            <span className="text-[var(--color-baltic-sea-500)]">from</span>
                            <span className="text-[var(--color-keppel-400)]"> '@anchor/sdk'</span>
                          </span>
                        ) : line.startsWith("const") ? (
                          <span>
                            <span className="text-[var(--color-baltic-sea-500)]">const</span>
                            <span className="text-[var(--color-baltic-sea-300)]"> agent = </span>
                            <span className="text-[var(--color-baltic-sea-500)]">new</span>
                            <span className="text-[var(--color-keppel-400)]"> Agent</span>
                            <span className="text-[var(--color-baltic-sea-300)]">({"{"}</span>
                          </span>
                        ) : line.startsWith("await") ? (
                          <span>
                            <span className="text-[var(--color-baltic-sea-500)]">await</span>
                            <span className="text-[var(--color-baltic-sea-300)]"> agent.</span>
                            <span className="text-[var(--color-keppel-400)]">run</span>
                            <span className="text-[var(--color-baltic-sea-300)]">(</span>
                            <span className="text-[var(--color-keppel-400)]">'Analyze the codebase'</span>
                            <span className="text-[var(--color-baltic-sea-300)]">)</span>
                          </span>
                        ) : line.includes(":") ? (
                          <span className="text-[var(--color-baltic-sea-400)]">
                            {"  "}
                            {line.split(":")[0].trim()}
                            <span className="text-[var(--color-baltic-sea-500)]">:</span>
                            <span className="text-[var(--color-keppel-400)]">{line.split(":")[1]}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--color-baltic-sea-300)]">{line}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {agentOutputs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-baltic-sea-800)]">
                      <div className="flex items-center gap-2 text-xs text-[var(--color-baltic-sea-500)] mb-3">
                        <Terminal weight="bold" className="h-3 w-3" />
                        <span>output</span>
                        {isAgentRunning && (
                          <span className="flex gap-0.5 ml-2">
                            <span
                              className="h-1 w-1 rounded-full bg-[var(--color-keppel-500)] animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="h-1 w-1 rounded-full bg-[var(--color-keppel-500)] animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="h-1 w-1 rounded-full bg-[var(--color-keppel-500)] animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {agentOutputs.map((output, i) => (
                          <div
                            key={i}
                            className={`text-xs animate-in fade-in slide-in-from-left-1 duration-200 ${
                              output.startsWith("✓")
                                ? "text-[var(--color-keppel-400)]"
                                : "text-[var(--color-baltic-sea-400)]"
                            }`}
                          >
                            <span className="text-[var(--color-keppel-600)] mr-2">→</span>
                            {output}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
