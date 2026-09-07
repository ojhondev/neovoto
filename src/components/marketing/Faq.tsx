import { Plus } from "lucide-react";

export function Faq({
  kicker,
  title,
  items,
}: {
  kicker: string;
  title: string;
  items: { q: string; a: string }[];
}) {
  return (
    <section id="faq" className="relative z-10 border-t border-ash bg-bone">
      <div className="w-full px-5 py-24 sm:px-10 lg:px-20">
        <p className="t-eyebrow mb-3">{kicker}</p>
        <h2 className="t-heading-lg max-w-2xl">{title}</h2>

        <div className="mt-10 grid gap-x-16 gap-y-2 lg:grid-cols-2">
          {items.map((it) => (
            <details
              key={it.q}
              className="group border-b border-ash py-4 [&_svg]:open:rotate-45"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <span className="font-display text-[19px] font-light text-ink">{it.q}</span>
                <Plus size={18} className="mt-1 shrink-0 text-fossil transition-transform" />
              </summary>
              <p className="mt-3 max-w-prose text-body-sm text-fossil">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
