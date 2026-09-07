import Link from "next/link";
import Image from "next/image";
import logoLight from "../../../public/brand/logo-light.png";
import logoDark from "../../../public/brand/logo-dark.png";

/**
 * Marca oficial NeoVoto. Duas artes: clara (logotipo tinta) e escura (quadrado
 * chartreuse + logotipo branco). A troca é por CSS via [data-theme] — sem flash.
 * Ver `.logo-light` / `.logo-dark` em globals.css.
 */
export function Logo({
  className = "",
  height = 26,
  markOnly = false,
}: {
  className?: string;
  height?: number;
  markOnly?: boolean;
}) {
  if (markOnly) {
    return (
      <Link href="/" aria-label="NeoVoto" className={"inline-flex " + className}>
        <svg width={height} height={height} viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="4" className="fill-ink" />
          <ellipse cx="14" cy="14" rx="6" ry="10.5" transform="rotate(-32 14 14)" className="fill-bone" />
        </svg>
      </Link>
    );
  }

  const w = (src: { width: number; height: number }) =>
    Math.round((src.width / src.height) * height);

  return (
    <Link href="/" aria-label="NeoVoto" className={"inline-flex " + className}>
      <Image src={logoLight} alt="NeoVoto" height={height} width={w(logoLight)} priority className="logo-light" />
      <Image src={logoDark} alt="NeoVoto" height={height} width={w(logoDark)} priority className="logo-dark" />
    </Link>
  );
}
