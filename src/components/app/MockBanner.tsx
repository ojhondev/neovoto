import { Info } from "lucide-react";

export function MockBanner({ text }: { text: string }) {
  return (
    <div className="font-ui flex items-start gap-2.5 border border-line bg-warn-tint px-4 py-3 text-body-sm text-body">
      <Info size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-warn" />
      <span>{text}</span>
    </div>
  );
}
