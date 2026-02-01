"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Lightning } from "@phosphor-icons/react/dist/ssr"

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for side projects and experimentation",
    features: [
      "1,000 compute hours/month",
      "3 concurrent agents",
      "Community support",
      "Basic observability",
      "Shared infrastructure",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For teams shipping production agents",
    features: [
      "10,000 compute hours/month",
      "25 concurrent agents",
      "Priority support",
      "Advanced tracing & logs",
      "Dedicated resources",
      "Custom domains",
      "Team collaboration",
    ],
    cta: "Start trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced needs",
    features: [
      "Unlimited compute",
      "Unlimited agents",
      "24/7 dedicated support",
      "SLA guarantee",
      "Private infrastructure",
      "SOC 2 compliance",
      "Custom integrations",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
]

export function Pricing() {
  const [isVisible, setIsVisible] = useState(false)
  const [featuresVisible, setFeaturesVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setTimeout(() => setFeaturesVisible(true), 600)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={ref} className="py-24 border-t border-[var(--color-baltic-sea-900)] overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
        >
          <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">Pricing</span>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-[var(--color-baltic-sea-400)]">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-end">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border transition-all duration-700 ease-out hover:-translate-y-2 ${
                isVisible ? "opacity-100 translate-y-0 scale-100" : `opacity-0 translate-y-24 scale-90`
              } ${
                plan.highlighted
                  ? "border-[var(--color-keppel-700)] bg-gradient-to-b from-[var(--color-keppel-950)] to-[var(--color-baltic-sea-950)] md:-translate-y-4"
                  : "border-[var(--color-baltic-sea-800)] bg-[var(--color-baltic-sea-950)]"
              }`}
              style={{
                transitionDelay: `${i === 1 ? 100 : i === 0 ? 200 : 300}ms`,
                boxShadow: plan.highlighted ? "0 0 60px -20px var(--color-keppel-700)" : "var(--bento-shadow)",
              }}
            >
              {plan.highlighted && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] text-xs font-semibold rounded-full flex items-center gap-1 transition-all duration-500 ${
                    isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"
                  }`}
                  style={{ transitionDelay: "500ms" }}
                >
                  <Lightning weight="fill" className="h-3 w-3" />
                  Most popular
                </div>
              )}

              <div className="p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-[var(--color-baltic-sea-100)]">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[var(--color-baltic-sea-100)]">{plan.price}</span>
                  <span className="text-[var(--color-baltic-sea-500)]">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-baltic-sea-400)]">{plan.description}</p>

                <Button
                  className={`w-full mt-6 rounded-full h-11 transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-300)] hover:shadow-[0_0_20px_-5px_var(--color-keppel-400)]"
                      : "bg-[var(--color-baltic-sea-800)] text-[var(--color-baltic-sea-200)] hover:bg-[var(--color-baltic-sea-700)]"
                  }`}
                >
                  {plan.cta}
                </Button>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, fi) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-3 text-sm transition-all duration-500 ${
                        featuresVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      }`}
                      style={{ transitionDelay: `${fi * 50}ms` }}
                    >
                      <Check
                        weight="bold"
                        className={`h-5 w-5 shrink-0 ${plan.highlighted ? "text-[var(--color-keppel-400)]" : "text-[var(--color-baltic-sea-500)]"}`}
                      />
                      <span className="text-[var(--color-baltic-sea-300)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
