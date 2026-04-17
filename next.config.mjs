import { withLingo } from '@lingo.dev/compiler/next';
process.env.LINGODOTDEV_API_KEY = process.env.LINGO_API_KEY;

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

const lingoConfig = {
  sourceLocale: "en",
  targetLocales: ["es", "fr", "de", "it", "nl", "ja", "pt", "ko", "tr", "vi", "pl", "zh"],
  buildMode: "cache-only",
};

const useLingo = process.env.NODE_ENV === "production";

export default useLingo ? withLingo(nextConfig, lingoConfig) : nextConfig;
