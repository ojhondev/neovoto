import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getDictionary } from "@/lib/i18n";
import { getReport } from "@/lib/report";
import type { ReportContent } from "@/lib/report";
import { PrintButton } from "@/components/app/PrintButton";

export const metadata: Metadata = { title: "Relatório NeoVoto" };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://neovoto.vercel.app";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { locale, t } = await getDictionary();
  const row = await getReport(code);
  if (!row) notFound();

  const conteudo = row.conteudo as unknown as ReportContent;
  const rel = conteudo.relatorio;
  const verifyUrl = `${SITE}/verificar/${row.code}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, width: 120 });

  return (
    <div className="report mx-auto max-w-3xl">
      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          .report { max-width: 100% !important; }
          main { padding: 0 !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <PrintButton label={t.relatorio.print} />
      </div>

      {/* cabeçalho */}
      <div className="flex items-start justify-between gap-6 border-b border-ash pb-6">
        <div>
          <p className="t-eyebrow">{t.motor.name}</p>
          <h1 className="t-heading-lg mt-1">{t.relatorio.title}</h1>
          <p className="font-ui mt-2 text-body-sm text-fossil">
            {t.relatorio.forCandidate}: <span className="text-ink">{rel.candidato}</span>
            {rel.cargo ? ` · ${rel.cargo}` : ""}
            {rel.uf ? ` · ${rel.uf}` : ""}
          </p>
          <p className="font-ui mt-1 text-caption text-pebble">
            {t.relatorio.generatedAt} {new Date(row.generatedAt).toLocaleString(locale)} · {t.relatorio.code} {row.code}
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="h-[104px] w-[104px]" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="font-ui mt-1 text-[10px] text-pebble">{t.relatorio.verifyTitle}</p>
        </div>
      </div>

      {/* resumo executivo */}
      <section className="mt-6">
        <h2 className="t-heading text-[20px]">{t.relatorio.execSummary}</h2>
        <p className="mt-2 text-body text-ink">{rel.resumoExecutivo}</p>
      </section>

      {/* seções */}
      {rel.secoes.map((s) => (
        <section key={s.chave} className="mt-6">
          <h2 className="t-heading text-[20px]">{s.titulo}</h2>
          <div className="mt-2 space-y-2">
            {s.paragrafos.map((p, i) => (
              <p key={i} className="text-body-sm text-smoke">
                {p}
              </p>
            ))}
          </div>
          {s.itens && s.itens.length > 0 && (
            <ul className="font-ui mt-3 flex flex-wrap gap-1.5">
              {s.itens.map((it) => (
                <li key={it.label} className="rounded-[4px] bg-sand px-2 py-1 text-[12px] text-smoke">
                  {it.label}
                  {it.valor && <span className="text-pebble"> · {it.valor}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* recortes da equipe */}
      {conteudo.recortes.length > 0 && (
        <section className="mt-6">
          <h2 className="t-heading text-[20px]">{t.relatorio.clipsTitle}</h2>
          <ul className="mt-3 space-y-3">
            {conteudo.recortes.map((r, i) => (
              <li key={i}>
                <p className="font-ui text-caption uppercase tracking-wider text-pebble">{r.modulo}</p>
                <p className="font-ui text-body text-ink">{r.titulo}</p>
                <p className="text-body-sm text-fossil">{r.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="font-ui mt-8 border-t border-ash pt-4 text-caption text-pebble">
        {t.relatorio.disclaimer} · {rel.version}
      </p>
    </div>
  );
}
