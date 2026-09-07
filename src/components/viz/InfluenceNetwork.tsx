import { influenceMapMock } from "@/lib/mock/influence-map";

/**
 * Rede de influência sobre um território estilizado (não é tile de mapa real).
 * Nós = atores políticos, arestas = vínculo/transferência de voto, cor = intensidade.
 * Inspiração visual: o exemplo de "mapa de influência" enviado pelo cliente.
 */
export function InfluenceNetwork({
  compact = false,
  withCallouts = true,
}: {
  compact?: boolean;
  withCallouts?: boolean;
}) {
  const { nodes, edges, callouts } = influenceMapMock;
  const W = 640;
  const H = compact ? 320 : 420;

  const color = (v: number) =>
    v > 0.72
      ? "var(--color-negative)"
      : v > 0.5
        ? "#c9772f"
        : v > 0.32
          ? "#c9a227"
          : "var(--color-olive)";

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-ash bg-map-bg">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rede de influência (ilustrativa)">
        {/* malha de fundo */}
        <g opacity="0.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * W) / 12} y1={0} x2={(i * W) / 12} y2={H} stroke="var(--color-ash)" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * H) / 8} x2={W} y2={(i * H) / 8} stroke="var(--color-ash)" />
          ))}
        </g>

        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from)!;
          const b = nodes.find((n) => n.id === e.to)!;
          const ax = a.x * W;
          const ay = a.y * H;
          const bx = b.x * W;
          const by = b.y * H;
          // ponto de controle perpendicular ao segmento, para um arco suave
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.hypot(dx, dy) || 1;
          const bow = Math.min(60, len * 0.22);
          const mx = (ax + bx) / 2 + (-dy / len) * bow;
          const my = (ay + by) / 2 + (dx / len) * bow;
          return (
            <path
              key={i}
              d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
              fill="none"
              stroke={color(e.intensity)}
              strokeWidth={1 + e.intensity * 3}
              strokeLinecap="round"
              opacity={0.8}
            />
          );
        })}

        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x * W} cy={n.y * H} r={6 + n.weight * 16} fill={color(n.heat)} opacity={0.22} />
            <circle cx={n.x * W} cy={n.y * H} r={4 + n.weight * 7} fill="var(--color-paper)" stroke={color(n.heat)} strokeWidth={2} />
          </g>
        ))}
      </svg>

      {withCallouts &&
        callouts.map((c, i) => (
          <div
            key={i}
            className="pointer-events-none absolute hidden rounded-[6px] border border-ash bg-paper px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:block"
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: "translate(-50%,-130%)" }}
          >
            <span className="font-ui text-[12px] font-medium text-ink">{c.label}</span>
            <span className="font-ui ml-2 text-[11px] uppercase tracking-wider text-fossil">{c.metric}</span>
          </div>
        ))}
    </div>
  );
}
