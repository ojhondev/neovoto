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

type BqResp = {
  jobReference?: { jobId: string; location?: string };
  pageToken?: string;
  schema?: { fields: { name: string }[] };
  rows?: { f: { v: string | null }[] }[];
};

async function query(sql: string, params: Record<string, string | number>): Promise<QueryRow[]> {
  const project = process.env.GCP_PROJECT_ID!;
  const token = await accessToken();
  const auth = { Authorization: `Bearer ${token}` };

  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        timeoutMs: 25_000,
        maxResults: 20_000,
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
  const first = (await res.json()) as BqResp;
  const fields = first.schema?.fields.map((f) => f.name) ?? [];
  const rows: BqResp["rows"] = [...(first.rows ?? [])];

  // pagina o resto (agregados por UF podem passar de 20k linhas)
  let pageToken = first.pageToken;
  const jobId = first.jobReference?.jobId;
  const location = first.jobReference?.location;
  let guard = 0;
  while (pageToken && jobId && guard++ < 20) {
    const u = new URL(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries/${jobId}`,
    );
    u.searchParams.set("pageToken", pageToken);
    u.searchParams.set("maxResults", "20000");
    if (location) u.searchParams.set("location", location);
    const r = await fetch(u, { headers: auth });
    if (!r.ok) break;
    const j = (await r.json()) as BqResp;
    if (j.rows) rows.push(...j.rows);
    pageToken = j.pageToken;
  }

  return rows.map((r) => {
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
  cargo: string;
  nome: string;
  nomeUrna: string;
  numero: string;
  siglaPartido: string;
  siglaUf: string;
  idMunicipio: string | null; // cargos municipais
  situacao: string | null;
};

/**
 * Busca candidatos por nome (nome de urna ou nome). Todos os cargos, 2018+.
 * A tabela `candidatos` não tem `turno` nem resultado da urna — só o cadastro.
 */
export async function buscarCandidatos(nome: string): Promise<BddCandidato[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT sequencial, ano, cargo, nome, nome_urna, numero, sigla_partido, sigla_uf, id_municipio, situacao
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
    cargo: (r.cargo ?? "").toLowerCase(),
    nome: r.nome ?? "",
    nomeUrna: r.nome_urna ?? "",
    numero: r.numero ?? "",
    siglaPartido: r.sigla_partido ?? "",
    siglaUf: r.sigla_uf ?? "",
    idMunicipio: r.id_municipio ?? null,
    situacao: r.situacao ?? null,
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
     WHERE ano = @ano AND turno = @turno AND sigla_uf = @uf AND sequencial_candidato = @seq
     GROUP BY id_municipio`,
    { ano: args.ano, turno: args.turno, uf: args.uf, seq: args.sequencial },
  );
  return rows
    .filter((r) => r.id_municipio)
    .map((r) => ({ idMunicipio: r.id_municipio as string, votos: Number(r.votos ?? 0) }));
}

/**
 * Votação por PARTIDO por município num pleito (nominais + legenda).
 * Base da Matriz Ideológica e do módulo de Coligações. `id_municipio` = IBGE.
 */
export async function votacaoPartidoPorMunicipio(args: {
  ano: number;
  turno: number;
  uf: string;
  cargo: string;
}): Promise<{ idMunicipio: string; sigla: string; votos: number }[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT id_municipio, sigla_partido, SUM(COALESCE(votos_nominais,0) + COALESCE(votos_legenda,0)) AS votos
     FROM \`${DATASET}.resultados_partido_municipio\`
     WHERE ano = @ano AND turno = @turno AND sigla_uf = @uf AND cargo = @cargo
     GROUP BY id_municipio, sigla_partido`,
    { ano: args.ano, turno: args.turno, uf: args.uf, cargo: args.cargo },
  );
  return rows
    .filter((r) => r.id_municipio && r.sigla_partido)
    .map((r) => ({
      idMunicipio: r.id_municipio as string,
      sigla: (r.sigla_partido as string).toUpperCase(),
      votos: Number(r.votos ?? 0),
    }));
}

/**
 * Votação por PARTIDO agregada por UF num pleito NACIONAL (Presidência) —
 * nominais + legenda. Base dos módulos territoriais quando a disputa é o Brasil
 * inteiro. Retorna ~27 × nº de partidos linhas (leve).
 */
export async function votacaoPartidoNacionalPorUF(args: {
  ano: number;
  turno: number;
  cargo: string;
}): Promise<{ uf: string; sigla: string; votos: number }[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT sigla_uf, sigla_partido, SUM(COALESCE(votos_nominais,0) + COALESCE(votos_legenda,0)) AS votos
     FROM \`${DATASET}.resultados_partido_municipio\`
     WHERE ano = @ano AND turno = @turno AND cargo = @cargo
     GROUP BY sigla_uf, sigla_partido`,
    { ano: args.ano, turno: args.turno, cargo: args.cargo },
  );
  return rows
    .filter((r) => r.sigla_uf && r.sigla_partido)
    .map((r) => ({
      uf: (r.sigla_uf as string).toUpperCase(),
      sigla: (r.sigla_partido as string).toUpperCase(),
      votos: Number(r.votos ?? 0),
    }));
}

/** Votos do candidato agregados por UF num pleito nacional (id = sigla da UF). */
export async function votacaoCandidatoNacionalPorUF(args: {
  sequencial: string;
  ano: number;
  turno: number;
}): Promise<{ uf: string; votos: number }[]> {
  if (!basedosdadosDisponivel()) return [];
  const rows = await query(
    `SELECT sigla_uf, SUM(votos) AS votos
     FROM \`${DATASET}.resultados_candidato_municipio\`
     WHERE ano = @ano AND turno = @turno AND sequencial_candidato = @seq
     GROUP BY sigla_uf`,
    { ano: args.ano, turno: args.turno, seq: args.sequencial },
  );
  return rows
    .filter((r) => r.sigla_uf)
    .map((r) => ({ uf: (r.sigla_uf as string).toUpperCase(), votos: Number(r.votos ?? 0) }));
}

/**
 * Menor total de votos entre os ELEITOS para o cargo na UF — a "barra de
 * entrada" real de uma eleição proporcional. Usado pelos Cenários.
 */
export async function votosCorteEleito(args: {
  ano: number;
  turno: number;
  uf: string;
  cargo: string;
}): Promise<number | null> {
  if (!basedosdadosDisponivel()) return null;
  const rows = await query(
    `SELECT MIN(v) AS corte FROM (
       SELECT sequencial_candidato, SUM(votos) AS v
       FROM \`${DATASET}.resultados_candidato_municipio\`
       WHERE ano = @ano AND turno = @turno AND sigla_uf = @uf AND cargo = @cargo
         AND LOWER(resultado) LIKE '%eleito%'
         AND LOWER(resultado) NOT LIKE '%nao%'
       GROUP BY sequencial_candidato
     )`,
    { ano: args.ano, turno: args.turno, uf: args.uf, cargo: args.cargo },
  );
  const c = Number(rows[0]?.corte ?? 0);
  return c > 0 ? c : null;
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
