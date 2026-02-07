import { GithubLogo } from "@phosphor-icons/react/dist/ssr"

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-baltic-sea-800)] py-8 mt-auto bg-[var(--color-baltic-sea-950)]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 flex flex-col items-center justify-center gap-4">

        <a
          href="https://github.com/cryptosaiyan/PolyDub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-baltic-sea-800)] hover:border-[var(--color-keppel-700)] hover:bg-[var(--color-keppel-950)] transition-colors text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] text-sm font-medium"
          aria-label="GitHub"
        >
          <GithubLogo weight="fill" className="h-5 w-5" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  )
}
