/** Faixa full-bleed chartreuse com frase editorial + duas trilhas de pílulas rolando. */
export function Marquee({
  line,
  rowA,
  rowB,
}: {
  line: string;
  rowA: string[];
  rowB: string[];
}) {
  return (
    <section className="overflow-hidden bg-chartreuse py-20">
      <p className="mx-auto max-w-4xl px-5 text-center font-display text-[clamp(1.6rem,4vw,2.6rem)] font-light leading-tight tracking-[-0.03em] text-ink">
        {line}
      </p>
      <div className="mt-12 space-y-3">
        <MarqueeRow items={rowA} direction="left" />
        <MarqueeRow items={rowB} direction="right" />
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  direction,
}: {
  items: string[];
  direction: "left" | "right";
}) {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <ul
        className="flex shrink-0 items-center gap-3 pr-3"
        style={{
          animation: `marquee-${direction} 42s linear infinite`,
        }}
      >
        {doubled.map((it, i) => (
          <li
            key={i}
            className="font-ui whitespace-nowrap rounded-[999px] border border-ink/10 bg-paper px-4 py-2 text-body-sm text-ink"
          >
            {it}
          </li>
        ))}
      </ul>
      <ul
        aria-hidden="true"
        className="flex shrink-0 items-center gap-3 pr-3"
        style={{ animation: `marquee-${direction} 42s linear infinite` }}
      >
        {doubled.map((it, i) => (
          <li
            key={i}
            className="font-ui whitespace-nowrap rounded-[999px] border border-ink/10 bg-paper px-4 py-2 text-body-sm text-ink"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
