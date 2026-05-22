import type { SiteConfig } from "@/lib/config";

export function Footer({ config }: { config: SiteConfig }) {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
        <p>
          © {new Date().getFullYear()} {config.brand.name}. {config.copy.footerNote}
        </p>
        {config.features.showAttribution ? (
          <p className="flex items-center gap-2">
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {config.copy.poweredByLabel}
            </span>
          </p>
        ) : null}
      </div>
    </footer>
  );
}
