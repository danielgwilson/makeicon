import Link from "next/link";
import { PACK_PAGES } from "@/lib/makeicon/pack-pages";
import { PACKS } from "@/lib/makeicon/packs";

export const metadata = {
  title: "Icon packs",
  description: "Workflow-specific icon packs for real deployments.",
};

export default function PacksIndexPage() {
  return (
    <main id="main-content" className="container py-10 sm:py-14">
      <div className="grid gap-8">
        <header className="grid gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            makeicon.dev
          </div>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl italic tracking-tight sm:text-5xl">
            Icon packs
          </h1>
          <p className="max-w-[72ch] text-sm leading-6 text-muted-foreground sm:text-base">
            Pick a workflow. Get the exact files, filenames, and sizes you need.
            Each pack includes references so you can trust what you ship.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open generator
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PACK_PAGES.map((p) => (
            <Link
              key={p.slug}
              href={`/packs/${p.slug}`}
              className="group rounded-3xl border border-border/70 bg-background/45 p-5 shadow-[0_18px_70px_hsl(var(--foreground)/0.05)] transition hover:bg-background/65 hover:shadow-[0_22px_90px_hsl(var(--foreground)/0.08)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="grid gap-2">
                <div className="text-balance font-[family-name:var(--font-body)] text-lg font-semibold tracking-tight">
                  {p.title}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {p.description}
                </div>
                <div className="pt-1 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/80">
                  {p.packIds.map((id) => PACKS[id].name).join(" · ")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
