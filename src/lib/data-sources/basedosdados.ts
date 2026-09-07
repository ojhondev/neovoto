/**
 * Cliente da Base dos Dados via BigQuery (API REST) — espelho COMPLETO do TSE:
 * candidatos, resultados por município e por zona, receitas/despesas, perfil do
 * eleitorado. 1945–2024 (inclui municipais 2024). Município já vem com código IBGE
 * (`id_municipio`), então o join com a malha é direto.
 *
 * Ativa com duas env vars (ver docs/DADOS-TSE.md §4):
 *   GCP_PROJECT_ID           — id do seu projeto no Google Cloud (billing das queries)
 *   GCP_SERVICE_ACCOUNT_KEY  — o JSON da service account (papel "BigQuery Job User")
 *
 * Sem grpc / SDK: assina um JWT com o node:crypto e chama a REST API. Zero deps novas.
 * A cota gratuita do BigQuery é 1 TB de processamento/mês — muito acima do que a
 * NeoVoto consome (uma query por candidato, filtrada por ano/UF/cargo, cacheada no Neon).
 */
import { createSign } from "node:crypto";

const DATASET = "basedosdados.br_tse_eleicoes";

type SAKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function readKey(): SAKey | null {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const k = JSON.parse(raw) as SAKey;
    return k.client_email && k.private_key ? k : null;
  } catch {
    return null;
  }
}

export function basedosdadosDisponivel(): boolean {
  return !!process.env.GCP_PROJECT_ID && !!readKey();
}

let tokenCache: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp - 60_000) return tokenCache.token;
  const key = readKey();
  if (!key) throw new Error("GCP_SERVICE_ACCOUNT_KEY ausente/inválida");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: key.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const signingInput = `${b64(header)}.${b64(claim)}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(key.private_key, "base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

type QueryRow = Record<string, string | null>;

async function query(sql: string, params: Record<string, string | number>): Promise<QueryRow[]> {
  const project = process.env.GCP_PROJECT_ID!;
  const token = await accessToken();
  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        timeoutMs: 25_000,
        maxResults: 6000,
        parameterMode: "NAMED",
        queryParameters: Object.entries(params).map(([name, value]) => ({
          name,
          parameterType: { type: typeof value === "number" ? "INT64" : "STRING" },
          parameterValue: { value: String(value) },
        })),
      }),
    },
  );
  if (!res.ok) throw new Error(`BigQuery ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as {
    schema?: { fields: { name: string }[] };
    rows?: { f: { v: string | null }[] }[];
  };
  const fields = j.schema?.fields.map((f) => f.name) ?? [];
  return (j.rows ?? []).map((r) => {
    const o: QueryRow = {};
    r.f.forEach((cell, idx) => {
      o[fields[idx]] = cell.v;
    });
    return o;
  });
}

export type BddCandidato = {
  sequencial: string;
  ano: number;
  turno: number;
  cargo: string;
  nome: string;
  nomeUrna: string;
  numero: string;
  siglaPartido: string;
  siglaUf: string;
  idMunicipio: string | null; // cargos municipais
  resultado: string | null;
};

/** Busca candidatos por nome (nome de urna ou nome). Todos os cargos, 2018–2024. */
export async function buscarCandidatos(nome: string): Promise<BddCandidato[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT sequencial, ano, turno, cargo, nome, nome_urna, numero, sigla_partido, sigla_uf, id_municipio, resultado
     FROM \`${DATASET}.candidatos\`
     WHERE ano >= 2018
       AND (UPPER(nome_urna) LIKE UPPER(@like) OR UPPER(nome) LIKE UPPER(@like))
     ORDER BY ano DESC
     LIMIT 60`,
    { like: `%${nome.trim()}%` },
  );
  return rows.map((r) => ({
    sequencial: r.sequencial ?? "",
    ano: Number(r.ano ?? 0),
    turno: Number(r.turno ?? 1),
    cargo: (r.cargo ?? "").toLowerCase(),
    nome: r.nome ?? "",
    nomeUrna: r.nome_urna ?? "",
    numero: r.numero ?? "",
    siglaPartido: r.sigla_partido ?? "",
    siglaUf: r.sigla_uf ?? "",
    idMunicipio: r.id_municipio ?? null,
    resultado: r.resultado ?? null,
  }));
}

/** Votos do candidato por município (id_municipio = código IBGE). */
export async function votacaoPorMunicipio(args: {
  sequencial: string;
  ano: number;
  turno: number;
  uf: string;
}): Promise<{ idMunicipio: string; votos: number }[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT id_municipio, SUM(votos) AS votos
     FROM \`${DATASET}.resultados_candidato_municipio\`
     WHERE ano = @ano AND turno = @turno AND sigla_uf = @uf AND sequencial = @seq
     GROUP BY id_municipio`,
    { ano: args.ano, turno: args.turno, uf: args.uf, seq: args.sequencial },
  );
  return rows
    .filter((r) => r.id_municipio)
    .map((r) => ({ idMunicipio: r.id_municipio as string, votos: Number(r.votos ?? 0) }));
}

/**
 * Votação do CAMPO POLÍTICO (partido + coligados) por município — usado para o IFET
 * quando não há histórico do próprio candidato naquele território.
 */
export async function votacaoDoPartido(args: {
  siglaPartido: string;
  ano: number;
  turno: number;
  uf: string;
  cargo: string;
}): Promise<{ idMunicipio: string; votos: number }[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT id_municipio, SUM(votos) AS votos
     FROM \`${DATASET}.resultados_candidato_municipio\`
     WHERE ano = @ano AND turno = @turno AND sigla_uf = @uf AND cargo = @cargo AND sigla_partido = @part
     GROUP BY id_municipio`,
    { ano: args.ano, turno: args.turno, uf: args.uf, cargo: args.cargo, part: args.siglaPartido },
  );
  return rows
    .filter((r) => r.id_municipio)
    .map((r) => ({ idMunicipio: r.id_municipio as string, votos: Number(r.votos ?? 0) }));
}
