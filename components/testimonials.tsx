"use client"

import { useEffect, useRef, useState } from "react"

const TESTIMONIALS_ROW_1 = [
  {
    quote:
      "We migrated 47 agents from our custom Kubernetes setup to Anchor in a weekend. Cold starts went from 8 seconds to under 50ms.",
    author: "Sarah Chen",
    role: "Platform Lead",
    company: "Nexus AI",
    avatar: "SC",
  },
  {
    quote:
      "The observability alone is worth it. We finally understand what our agents are actually doing in production.",
    author: "Marcus Webb",
    role: "CTO",
    company: "Automate.io",
    avatar: "MW",
  },
  {
    quote:
      "Anchor lets us focus on agent logic instead of infrastructure. Our deployment time went from hours to seconds.",
    author: "Priya Sharma",
    role: "Engineering Manager",
    company: "DataFlow",
    avatar: "PS",
  },
  {
    quote: "Finally, infrastructure that actually understands what agents need. The auto-scaling is magic.",
    author: "James Liu",
    role: "Founder",
    company: "AgentStack",
    avatar: "JL",
  },
  {
    quote: "We went from managing 12 different services to one Anchor config file. Incredible developer experience.",
    author: "Elena Rodriguez",
    role: "Staff Engineer",
    company: "ScaleAI",
    avatar: "ER",
  },
]

const TESTIMONIALS_ROW_2 = [
  {
    quote: "Our agents handle 10x more requests with Anchor's intelligent caching. Performance is unreal.",
    author: "David Park",
    role: "VP Engineering",
    company: "Synth Labs",
    avatar: "DP",
  },
  {
    quote: "The git-native workflow means our whole team can ship agent updates without touching infrastructure.",
    author: "Aisha Patel",
    role: "Tech Lead",
    company: "Cortex",
    avatar: "AP",
  },
  {
    quote: "Anchor's GPU acceleration cut our inference costs by 60%. The ROI was immediate.",
    author: "Michael Torres",
    role: "ML Platform Lead",
    company: "DeepMind Labs",
    avatar: "MT",
  },
  {
    quote: "Security and compliance baked in from day one. Our enterprise clients love it.",
    author: "Rachel Kim",
    role: "Security Lead",
    company: "TrustAI",
    avatar: "RK",
  },
  {
    quote: "From prototype to production in minutes, not months. Anchor changed how we build.",
    author: "Tom Anderson",
    role: "CEO",
    company: "BuildFast",
    avatar: "TA",
  },
]

function TestimonialCard({
  testimonial,
  onMouseEnter,
  onMouseLeave,
}: {
  testimonial: (typeof TESTIMONIALS_ROW_1)[0]
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex-shrink-0 w-[350px] md:w-[400px] rounded-2xl border border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)] p-6 hover:border-[var(--color-keppel-800)] transition-colors duration-300"
      style={{ boxShadow: "var(--bento-shadow)" }}
    >
      <p className="text-[var(--color-baltic-sea-300)] leading-relaxed text-sm">{testimonial.quote}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--color-keppel-600)] to-[var(--color-keppel-800)] flex items-center justify-center text-xs font-bold text-[var(--color-keppel-100)]">
          {testimonial.avatar}
        </div>
        <div>
          <div className="font-medium text-[var(--color-baltic-sea-200)] text-sm">{testimonial.author}</div>
          <div className="text-xs text-[var(--color-baltic-sea-500)]">
            {testimonial.role}, {testimonial.company}
          </div>
        </div>
      </div>
    </div>
  )
}

function MarqueeRow({
  testimonials,
  direction = "left",
  speed = 30,
}: {
  testimonials: typeof TESTIMONIALS_ROW_1
  direction?: "left" | "right"
  speed?: number
}) {
  const [isPaused, setIsPaused] = useState(false)
  const duplicated = [...testimonials, ...testimonials]

  return (
    <div className="relative flex overflow-hidden">
      {/* Gradient masks on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[var(--background)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />

      <div
        className="flex gap-6 py-4"
        style={{
          animation: `scroll-${direction} ${speed}s linear infinite`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {duplicated.map((testimonial, i) => (
          <TestimonialCard
            key={`${testimonial.author}-${i}`}
            testimonial={testimonial}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          />
        ))}
      </div>
    </div>
  )
}

export function Testimonials() {
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
      {/* Section header */}
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
        >
          <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl text-balance">
            Loved by builders worldwide
          </h2>
        </div>
      </div>

      <div
        className={`space-y-6 transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDelay: "300ms" }}
      >
        <MarqueeRow testimonials={TESTIMONIALS_ROW_1} direction="left" speed={40} />
        <MarqueeRow testimonials={TESTIMONIALS_ROW_2} direction="right" speed={45} />
      </div>
    </section>
  )
}
