import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getPackPage, PACK_PAGES } from "@/lib/makeicon/pack-pages";
import { PACKS } from "@/lib/makeicon/packs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return PACK_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPackPage(slug);
  if (!page) {
    return {
      title: "Pack not found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${page.title} — makeicon.dev`,
    description: page.description,
  };
}

export default async function PackPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPackPage(slug);
  if (!page) notFound();

  const query = new URLSearchParams();
  query.set("packs", page.packIds.join(","));
  const generatorHref = `/?${query.toString()}#main-content`;

  const specs = page.packIds.map((id) => PACKS[id]);
  const outputs = specs.flatMap((spec) =>
    spec.outputs.map((o) => ({
      packId: spec.id,
      kind: o.kind,
      path: o.path,
    })),
  );

  return (
    <main id="main-content" className="container py-10 sm:py-14">
      <div className="grid gap-10">
        <header className="grid gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            makeicon.dev · pack
          </div>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl italic tracking-tight sm:text-5xl">
            {page.title}
          </h1>
          <p className="max-w-[72ch] text-sm leading-6 text-muted-foreground sm:text-base">
            {page.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={generatorHref}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Generate this pack
            </Link>
            <Link
              href="/packs"
              className="rounded-full border border-border/70 bg-background/45 px-4 py-2 text-sm font-medium transition hover:bg-background/65 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              All packs
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {specs.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="rounded-full font-mono text-[11px] uppercase tracking-[0.14em]"
              >
                {s.name}
              </Badge>
            ))}
          </div>
        </header>

        <section className="grid gap-4 rounded-3xl border border-border/70 bg-background/45 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Files you’ll get
          </div>
          <div className="grid gap-2 text-sm">
            {outputs.map((o) => (
              <div
                key={`${o.packId}:${o.path}`}
                className="flex items-baseline justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12px] uppercase tracking-[0.14em]">
                    {o.path}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {o.kind}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-border/70 bg-background/45 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Sources
          </div>
          <div className="grid gap-2 text-sm">
            {page.sources.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3 underline decoration-border/60 underline-offset-4 transition hover:bg-background/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {s.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
