# Dados eleitorais — como cobrir todos os cargos apesar do bloqueio do TSE

## 1. O problema

O TSE publica dados abertos, mas o **edge (Akamai) bloqueia qualquer requisição de IP
fora do Brasil** — data centers dos EUA/UE incluídos. Retorno é `403 Access Denied`.
Confirmado em 2026-09-07 para:

| Host | Uso | Status de servidor |
|---|---|---|
| `dadosabertos.tse.jus.br` | arquivos CSV/ZIP (CKAN) | 403 |
| `divulgacandcontas.tse.jus.br` | API REST de candidatos/contas | 403 |
| `cepesp.io` | API acadêmica (FGV) sobre o TSE | 403 |
| `resultados.tse.jus.br` | apuração em tempo real | 403 |

A NeoVoto roda na Vercel (fora do Brasil) → **não dá para falar com o TSE direto**.

## 2. A solução: fontes-espelho acessíveis + camada de ingestão

O TSE é dado **público**; vários projetos o reempacotam em lugares sem bloqueio.
A NeoVoto lê desses espelhos e guarda o recorte do candidato no Neon.

| Fonte | Cobertura | Cargos | Acesso | Papel na NeoVoto |
|---|---|---|---|---|
| **brasil.io** — dataset `eleicoes-brasil`, tabela `candidatos` | 1996–2022 | **todos** (presidente, governador, senador, dep. federal/estadual/distrital, prefeito, vereador) | REST, **token gratuito** | Busca de candidato em todos os cargos no onboarding. `src/lib/data-sources/brasilio.ts` |
| **Base dos Dados** — `br_tse_eleicoes` (BigQuery) | 1994–2024 (inclui municipais 2024) + votação por **seção** | todos | BigQuery público, **service account GCP grátis** (1 TB/mês) | **Votação por município (choropleth do Mapa de Calor).** Fase 2.5 |

> **IMPORTANTE (verificado 2026-09-07):** o brasil.io **desativou a tabela `votacao`** da
> API (retorna 404 — eles bloqueiam tabelas grandes iteráveis). Só sobrou `candidatos`.
> Ou seja: o brasil.io serve o **cadastro** do candidato (existiu, cargo, ano, partido,
> resultado), mas **não** os votos por município. Para o mapa de calor real, o caminho é a
> **Base dos Dados / BigQuery** (§4). O código já está pronto: `ingestVotacao` tenta o
> brasil.io, recebe [] e a plataforma segue mostrando a base territorial (população).

Além disso: o rate limit do brasil.io no plano gratuito é **agressivo** (bloqueia após
poucas requisições, por dezenas de minutos). Por isso a NeoVoto cacheia toda busca no Neon
(`candidate_search_cache`) e nunca chama o brasil.io no caminho de renderização.
| **Câmara dos Deputados** — dados abertos | mandato atual | dep. federal | REST, sem chave | Enriquecimento: votações nominais, proposições, despesas de gabinete |
| **Senado Federal** — dados abertos | mandato atual | senador | REST, sem chave | Enriquecimento: senadores em exercício, matérias, votações |
| **IBGE** | — | — | REST, sem chave | Malhas territoriais e indicadores socioeconômicos |

> Câmara/Senado **não** têm votação por município nem dados de deputado estadual/prefeito/
> vereador — por isso o brasil.io (ou Base dos Dados) é obrigatório para cobrir todos os cargos.

### Como a ingestão funciona (sem bloqueio, sem terminal)

1. No onboarding o usuário escolhe o candidato (qualquer cargo) → a busca bate no brasil.io.
2. Ao confirmar, um Server Action puxa a **votação por município** daquele candidato no
   brasil.io e grava em cache (Neon + revalidação da fetch).
3. As ferramentas (Mapa de Calor, Cenários, Matriz Ideológica, Coligações) leem esse cache.
4. Nada é consultado ao vivo por request de usuário — o request path nunca toca o TSE.

Enquanto o token não está configurado, tudo funciona com **Câmara + Senado + IBGE** e o
Mapa de Calor mostra a base territorial real (população do Censo 2022). A camada de votação
**liga sozinha** quando a variável de ambiente aparece.

## 3. Passo a passo — token gratuito do brasil.io

1. Acesse **https://brasil.io/auth/register/** e crie uma conta (e-mail + senha). É grátis.
2. Confirme o e-mail (link enviado pelo brasil.io).
3. Entre em **https://brasil.io/auth/tokens-api/** (menu do usuário → “Tokens da API”).
4. Clique em **“Criar novo token”**. Copie o valor — algo como
   `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`.
5. Me mande esse token **por aqui** (ou adicione você mesmo no painel da Vercel:
   projeto `neovoto` → **Settings → Environment Variables** → `Name` = `BRASILIO_API_TOKEN`,
   `Value` = o token, ambientes Production + Preview + Development → **Save**).
6. Eu adiciono ao `.env.local` local e à Vercel, faço um redeploy, e a busca por candidato
   passa a cobrir **todos os cargos** e o Mapa de Calor passa a colorir por **votação real**.

Limites do token grátis: ~1.000 requisições/hora, ~10 mil linhas por página. Suficiente —
a NeoVoto pagina e cacheia por candidato.

> Referência oficial: https://blog.brasil.io/2020/10/31/nossa-api-sera-obrigatoriamente-autenticada/

## 4. Base dos Dados (BigQuery) — a fonte definitiva de votação por município

O brasil.io serve só o **cadastro** do candidato (não a votação — a tabela `votacao`
foi desativada). A **Base dos Dados** tem o espelho **completo** do TSE no BigQuery
público — votação por município e por seção, receitas/despesas, perfil do eleitorado,
1945–2024 (inclui municipais de 2024). E o melhor: **`id_municipio` já é o código IBGE**,
então o join com a malha é direto (sem crosswalk TSE↔IBGE).

O cliente já está pronto (`src/lib/data-sources/basedosdados.ts`) — usa a REST API do
BigQuery com um JWT assinado pelo `node:crypto` (sem SDK, sem grpc). Liga sozinho quando
as duas env vars aparecerem.

> **ATIVO desde 2026-09-07.** `GCP_PROJECT_ID` + `GCP_SERVICE_ACCOUNT_KEY` configurados
> (Production + Preview + Development) e verificados ao vivo: `buscarCandidatos` traz o
> histórico multi-cargo (ex. Boulos: prefeito 2024/2020, dep. federal 2022, presidente
> 2018) e `votacaoPorMunicipio` de Tabata Amaral 2022 = 645 municípios / 337.873 votos.
> Schema real: a tabela `candidatos` **não tem `turno`** nem resultado de urna (só o
> cadastro; campo `situacao` = deferido/indeferido); `resultados_candidato_municipio` usa
> **`sequencial_candidato`** (não `sequencial`).

### Passo a passo (uma vez, ~10 minutos)

1. **Conta Google Cloud.** Acesse **https://console.cloud.google.com/** com uma conta
   Google. Se for a primeira vez, aceite os termos. **Não precisa cadastrar cartão** para
   consultar dados públicos dentro da cota gratuita (se pedir, pode pular / usar o
   "sandbox" do BigQuery).
2. **Criar um projeto.** Topo da tela → seletor de projeto → **"Novo projeto"** → nome
   ex. `neovoto-dados` → **Criar**. Anote o **ID do projeto** (ex. `neovoto-dados-123456`).
3. **Ativar a API do BigQuery.** Menu → **APIs e serviços → Biblioteca** → busque
   **"BigQuery API"** → **Ativar**. (Costuma já vir ativada.)
4. **Criar a service account.** Menu → **IAM e administrador → Contas de serviço** →
   **"Criar conta de serviço"** → nome `neovoto-bq` → **Criar e continuar** → em "Conceder
   acesso", papel **"BigQuery Job User"** (`roles/bigquery.jobUser`) → **Concluir**.
5. **Gerar a chave JSON.** Na lista de contas de serviço, clique na `neovoto-bq` → aba
   **Chaves** → **Adicionar chave → Criar nova chave → JSON** → baixa um arquivo `.json`.
6. **Me mande** o conteúdo desse JSON e o **ID do projeto** (pode colar aqui — eu ponho
   como secret na Vercel e no `.env.local`, nunca no repositório). **Ou** você mesmo, no
   painel da Vercel (projeto `neovoto` → **Settings → Environment Variables**):
   - `GCP_PROJECT_ID` = o ID do projeto
   - `GCP_SERVICE_ACCOUNT_KEY` = o JSON inteiro (cole numa linha só)
   - ambientes: Production + Preview + Development → **Save**
7. Eu faço um redeploy. A partir daí:
   - a busca de candidato no onboarding cobre **todos os cargos** com dados melhores;
   - o **Mapa de Calor colore por votação real** do candidato por município;
   - o **IFET** ganha o pilar de histórico eleitoral (hoje com peso 0);
   - abre caminho para receitas/despesas, perfil do eleitorado e votação por seção.

### Custo

As queries são cobradas contra a **cota gratuita de 1 TB de processamento por mês** do
BigQuery. Uma consulta da NeoVoto é filtrada por `ano` + `sigla_uf` + `sequencial` e roda
sobre partições pequenas — cada candidato consome alguns MB. O resultado é cacheado no
Neon (`electoral_results`), então a mesma candidatura não repete a query. Fica **muito
abaixo** da cota gratuita mesmo com dezenas de campanhas.

### Tabelas usadas

| Tabela (`basedosdados.br_tse_eleicoes.*`) | Uso |
|---|---|
| `candidatos` | busca por nome, todos os cargos |
| `resultados_candidato_municipio` | votação por município (choropleth, IFET) |
| `resultados_candidato_municipio_zona` | votação por zona (Fase 3) |
| `despesas_candidato` / `receitas_candidato` | fundo e gasto (Coligações, Cenários) |
| `perfil_eleitorado_municipio` | perfil do eleitorado agregado (Matriz Ideológica) |

## 5. Nunca

- Burlar o bloqueio do TSE com proxy anônimo, VPN de terceiros ou scraping do site logado.
- Coletar dado de pessoa natural (eleitor). Só candidatos/eleitos e agregados. Ver `LGPD.md`.
