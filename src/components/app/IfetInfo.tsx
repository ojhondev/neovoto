import { Info } from "@/components/app/Info";
import { getDictionary } from "@/lib/i18n";

/** Balão "o que é IFET?" — usar em qualquer lugar que cite o índice. */
export async function IfetInfo({ side }: { side?: "top" | "bottom" }) {
  const { t } = await getDictionary();
  return (
    <Info label="IFET" side={side}>
      {t.common.ifetExplainer}
    </Info>
  );
}
