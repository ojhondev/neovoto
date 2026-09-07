/**
 * Motivo de marca: globo em matriz de pontos (chartreuse).
 * Único elemento decorativo de escala do sistema — usado como fundo de quebra de seção.
 */
export function PixelGlobe({
  className = "",
  size = 560,
}: {
  className?: string;
  size?: number;
}) {
  const cells = 26;
  const step = size / cells;
  const r = size / 2;
  const dots: { x: number; y: number; o: number }[] = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const x = i * step + step / 2;
      const y = j * step + step / 2;
      const dx = x - r;
      const dy = y - r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;
      // "meridianos/paralelos": modula opacidade para dar volume
      const lat = Math.abs(dy) / r;
      const lon = Math.abs(dx) / r;
      const edge = 1 - dist / r;
      const o = 0.28 + 0.6 * edge * (0.5 + 0.5 * Math.cos((lon + lat) * Math.PI));
      dots.push({ x, y, o: Math.min(1, Math.max(0.15, o)) });
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={step * 0.32}
          fill="var(--color-chartreuse)"
          opacity={d.o}
        />
      ))}
    </svg>
  );
}
