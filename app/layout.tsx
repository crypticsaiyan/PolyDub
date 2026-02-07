import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LingoProvider } from "@lingo.dev/compiler/react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-heading"
})

export const metadata: Metadata = {
  title: "PolyDub | Real-Time Video Dubbing",
  description:
    "Real-time video dubbing that preserves background audio while translating vocals. Upload, translate, and share dubbed videos instantly.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${spaceGrotesk.variable} min-h-screen flex flex-col`}>
        <LingoProvider>
          <Header />
            {children}
          <Footer />
        </LingoProvider>
        <Analytics />
      </body>
    </html>
  )
}
