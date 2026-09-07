import { Info } from "lucide-react";

export function MockBanner({ text }: { text: string }) {
  return (
    <div className="font-ui mb-8 flex items-start gap-2.5 rounded-[8px] border border-ash bg-paper px-4 py-3 text-body-sm text-smoke">
      <Info size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-fossil" />
      <span>{text}</span>
    </div>
  );
}
