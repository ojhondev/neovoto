import Link from "next/link";

/**
 * Marca NeoVoto: quadrado tinta com elipse "cédula" vazada, + logotipo.
 * O ativo enviado pelo cliente (public/brand/logo-neovoto.png) traz o wordmark
 * antigo "NeoVote"; aqui reconstruímos como "NeoVoto" em vetor.
 */
export function Logo({
  className = "",
  showWordmark = true,
  invert = false,
}: {
  className?: string;
  showWordmark?: boolean;
  invert?: boolean;
}) {
  const ink = invert ? "var(--color-paper)" : "var(--color-ink)";
  const paper = invert ? "var(--color-ink)" : "var(--color-paper)";
  return (
    <Link
      href="/"
      aria-label="NeoVoto"
      className={"inline-flex items-center gap-2.5 " + className}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="4" fill={ink} />
        <ellipse
          cx="14"
          cy="14"
          rx="6"
          ry="10.5"
          transform="rotate(-32 14 14)"
          fill={paper}
        />
      </svg>
      {showWordmark && (
        <span
          className="font-ui text-[19px] font-semibold tracking-[-0.02em]"
          style={{ color: ink }}
        >
          NeoVoto
        </span>
      )}
    </Link>
  );
}
