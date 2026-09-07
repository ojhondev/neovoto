import { Check, Circle } from "lucide-react";

/**
 * Estado honesto para um módulo ainda sem motor próprio: diz o que ele vai
 * computar, de qual dado oficial, e o que já está pronto vs. o que falta.
 * Substitui a visualização ilustrativa (que passava impressão de resultado real).
 */
export function ModuloRoadmap({
  pergunta,
  entrega,
  etapas,
}: {
  pergunta: string;
  entrega: string;
  etapas: { label: string; feito: boolean }[];
}) {
  return (
    <div className="card">
      <p className="t-eyebrow mb-1">Em construção</p>
      <p className="text-body text-ink">{pergunta}</p>
      <p className="mt-2 text-body-sm text-fossil">{entrega}</p>

      <ul className="font-ui mt-5 space-y-2 text-body-sm">
        {etapas.map((e) => (
          <li key={e.label} className="flex items-start gap-2.5">
            {e.feito ? (
              <Check size={15} className="mt-0.5 shrink-0 text-olive" />
            ) : (
              <Circle size={15} className="mt-0.5 shrink-0 text-pebble" />
            )}
            <span className={e.feito ? "text-smoke" : "text-pebble"}>{e.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
