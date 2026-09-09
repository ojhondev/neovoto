import Link from "next/link";
import Image from "next/image";
import logoLight from "../../../public/brand/logo-light.png";
import logoDark from "../../../public/brand/logo-dark.png";
import markLight from "../../../public/brand/mark-light.png";
import markDark from "../../../public/brand/mark-dark.png";

/**
 * Marca oficial NeoVoto. Duas artes: `logo-light` (marca preta, p/ fundo claro) e
 * `logo-dark` (marca branca, p/ fundo escuro). A troca é por CSS via `[data-theme]`
 * — sem flash, sem JS. Ver `.logo-light` / `.logo-dark` em globals.css.
 * `markOnly` usa só o símbolo "N" (rail recolhido, favicon, avatares).
 */
export function Logo({
  className = "",
  height = 22,
  markOnly = false,
}: {
  className?: string;
  height?: number;
  markOnly?: boolean;
}) {
  const w = (src: { width: number; height: number }) =>
    Math.round((src.width / src.height) * height);

  const light = markOnly ? markLight : logoLight;
  const dark = markOnly ? markDark : logoDark;

  return (
    <Link href="/" aria-label="NeoVoto" className={"inline-flex " + className}>
      <Image src={light} alt="NeoVoto" height={height} width={w(light)} priority className="logo-light" />
      <Image src={dark} alt="NeoVoto" height={height} width={w(dark)} priority className="logo-dark" />
    </Link>
  );
}
