import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/brand/logo-neovoto.png";

/** Marca oficial NeoVoto (public/brand/logo-neovoto.png): quadrado tinta + elipse
 *  "cédula" vazada + logotipo "NeoVoto". Em fundo escuro usamos filtro de inversão. */
export function Logo({
  className = "",
  height = 26,
  invert = false,
  markOnly = false,
}: {
  className?: string;
  height?: number;
  invert?: boolean;
  markOnly?: boolean;
}) {
  if (markOnly) {
    return (
      <Link href="/" aria-label="NeoVoto" className={"inline-flex " + className}>
        <svg width={height} height={height} viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="4" fill={invert ? "var(--color-paper)" : "var(--color-ink)"} />
          <ellipse
            cx="14"
            cy="14"
            rx="6"
            ry="10.5"
            transform="rotate(-32 14 14)"
            fill={invert ? "var(--color-ink)" : "var(--color-paper)"}
          />
        </svg>
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="NeoVoto" className={"inline-flex " + className}>
      <Image
        src={logo}
        alt="NeoVoto"
        height={height}
        width={Math.round((logo.width / logo.height) * height)}
        priority
        style={invert ? { filter: "invert(1) brightness(2)" } : undefined}
      />
    </Link>
  );
}
