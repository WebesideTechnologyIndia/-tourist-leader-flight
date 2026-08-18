import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/** Shared shell for static content / policy pages (Header + hero + card + Footer). */
export function InfoPage({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <section className="bg-gradient-to-br from-brand-dark to-brand py-14 text-center text-white">
          <Icon size={44} className="mx-auto" />
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-2 max-w-xl px-4 text-white/90">{subtitle}</p>}
        </section>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="space-y-4 rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm ring-1 ring-slate-100 sm:p-8">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** A titled block inside an InfoPage. */
export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold text-slate-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** A simple bullet list. */
export function InfoList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
