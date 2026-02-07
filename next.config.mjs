import { withLingo } from '@lingo.dev/compiler/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withLingo(nextConfig, {
  sourceLocale: "en",
  targetLocales: ["es", "fr", "de", "it", "nl", "ja", "pt", "hi", "ar", "ko", "tr", "vi", "pl", "uk", "zh"]
});
