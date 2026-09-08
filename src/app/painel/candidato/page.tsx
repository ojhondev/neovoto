import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getGeoUF } from "@/lib/data-sources/geo";
import { getApoiadoresSugeridos, getBaseCandidato } from "@/lib/intel/base-candidato-load";
import { BaseTerritorialEditor } from "@/components/app/BaseTerritorialEditor";
import { trocarCandidato, adicionarApoioSugerido } from "./actions";

export const metadata: Metadata = { title: "Candidato" };

export default async function CandidatoPage() {
  const { locale, t } = await getDictionary();
  const candidacy = await getCurrentCandidacy();
  if (!candidacy) redirect("/onboarding");
  const perfil = perfilFrom(candidacy);
  if (!perfil) redirect("/onboarding");

  const objectiveLabel =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ??
    candidacy.objective;

  const uf = (perfil.uf || candidacy.uf || "").toUpperCase();
  const geo = uf ? await getGeoUF(uf).catch(() => []) : [];
  const nomeByCode = new Map(geo.map((g) => [g.code, g.nome]));
  const base = uf ? await getBaseCandidato(candidacy, perfil).catch(() => null) : null;
  const anchorNome =
    (candidacy.anchorIbge && nomeByCode.get(candidacy.anchorIbge)) ||
    candidacy.birthMunicipio ||
    base?.ancora?.nome ||
    null;
  const extrasNomes = ((candidacy.baseIbge as string[] | null) ?? [])
    .map((c) => nomeByCode.get(c))
    .filter((v): v is string => !!v);

  const apoiadores = await getApoiadoresSugeridos(candidacy, perfil).catch(() => []);
  const apoiosAtuais = ((candidacy.apoios as { nome: string; uf: string; cargo: string }[] | null) ?? []);

  return (
    <>
      <div className="flex flex-wrap items-start gap-5">
        {perfil.foto && (
          <Image
            src={perfil.foto}
            alt={perfil.nome}
            width={96}
            height={128}
            unoptimized
            className="h-32 w-24 shrink-0 rounded-[8px] border border-ash object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow mb-1">{perfil.casa}</p>
          <h1 className="t-heading-lg">{perfil.nome}</h1>
          {perfil.nomeCompleto && perfil.nomeCompleto !== perfil.nome && (
            <p className="font-ui text-body-sm text-fossil">{perfil.nomeCompleto}</p>
          )}
          <p className="font-ui mt-1 text-body-sm text-fossil">
            {perfil.partido}
            {perfil.uf ? `-${perfil.uf}` : ""}
          </p>
          <p className="font-ui mt-2 inline-block rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
            {t.dash.objectiveLabel}: {objectiveLabel}
          </p>
        </div>
        <form action={trocarCandidato} className="shrink-0">
          <button type="submit" className="btn btn-ghost">
            <RefreshCw size={14} /> {t.dash.changeCandidate}
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="t-heading text-[22px]">{t.dash.profile}</h2>
          <dl className="font-ui mt-3 space-y-1.5 text-body-sm">
            {[
              [t.dash.situation, perfil.situacao],
              [t.dash.education, perfil.escolaridade],
              [t.dash.born, perfil.nascimento],
              ["E-mail", perfil.email],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-pebble">{k}</dt>
                  <dd className="text-right text-smoke">{v}</dd>
                </div>
              ))}
          </dl>
        </section>

        {perfil.territorio && (
          <section className="card">
            <h2 className="t-heading text-[22px]">{t.dash.territory}</h2>
            <dl className="font-ui mt-3 space-y-1.5 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-pebble">UF</dt>
                <dd className="text-smoke">{perfil.territorio.ufNome}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pebble">{t.dash.region}</dt>
                <dd className="text-smoke">{perfil.territorio.regiao}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pebble">{t.dash.municipalities}</dt>
                <dd className="text-smoke">{perfil.territorio.municipios}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {uf && (
        <div className="mt-4">
          <BaseTerritorialEditor
            dict={t.baseEditor}
            municipios={geo.map((g) => g.nome).sort((a, b) => a.localeCompare(b))}
            anchorNome={anchorNome}
            extrasNomes={extrasNomes}
          />
        </div>
      )}

      {(apoiadores.length > 0 || apoiosAtuais.length > 0) && (
        <section className="card mt-4">
          <h2 className="t-heading text-[22px]">{t.apoiadores.title}</h2>
          <p className="mt-2 text-body-sm text-fossil">{t.apoiadores.body}</p>

          {apoiosAtuais.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {apoiosAtuais.map((a, i) => (
                <li
                  key={`${a.nome}-${i}`}
                  className="font-ui rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke"
                >
                  {a.nome}
                  {a.uf ? ` (${a.uf})` : ""}
                </li>
              ))}
            </ul>
          )}

          {apoiadores.filter((a) => !a.jaEApoio).length > 0 && (
            <>
              <p className="t-eyebrow mt-4">{t.apoiadores.suggested}</p>
              <ul className="mt-2 divide-y divide-ash">
                {apoiadores
                  .filter((a) => !a.jaEApoio)
                  .map((a) => (
                    <li key={a.sequencial} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="font-ui block truncate text-body-sm text-ink">{a.nome}</span>
                        <span className="font-ui block text-caption text-fossil">
                          {a.cargoLabel} · {perfil.partido} · {a.ano} ·{" "}
                          {a.votosRegiao.toLocaleString(locale)} {t.apoiadores.votesInRegion}
                        </span>
                      </span>
                      <form action={adicionarApoioSugerido} className="shrink-0">
                        <input type="hidden" name="externalId" value={a.sequencial} />
                        <input type="hidden" name="nome" value={a.nome} />
                        <input type="hidden" name="uf" value={uf} />
                        <input type="hidden" name="cargo" value={a.cargo} />
                        <button type="submit" className="btn btn-ghost text-caption">
                          {t.apoiadores.add}
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      )}

      {perfil.proposicoes && perfil.proposicoes.recentes.length > 0 && (
        <section className="card mt-4">
          <h2 className="t-heading text-[22px]">{t.dash.recent}</h2>
          <ul className="mt-3 divide-y divide-ash">
            {perfil.proposicoes.recentes.map((r) => (
              <li key={r.titulo} className="font-ui py-2.5 text-body-sm">
                <span className="text-ink">{r.titulo}</span>
                <span className="text-fossil"> — {r.ementa}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {perfil.frentes.length > 0 && (
        <section className="card mt-4">
          <h2 className="t-heading text-[22px]">
            {t.dash.fronts} ({perfil.frentes.length})
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {perfil.frentes.map((f) => (
              <li
                key={f.id}
                className="font-ui rounded-[4px] bg-sand px-2.5 py-1 text-caption text-smoke"
              >
                {f.titulo}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="font-ui mt-8 text-caption text-pebble">
        {t.dash.refreshedAt} {new Date(candidacy.refreshedAt).toLocaleDateString(locale)} ·{" "}
        {t.dash.sourcesNote}
      </p>
      <Link href="/painel" className="btn btn-ghost mt-4">
        ← {t.common.dashboard}
      </Link>
    </>
  );
}
