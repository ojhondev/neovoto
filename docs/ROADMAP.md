# NeoVoto — Roadmap

## Fase 0 — Fundação  ✅ (esta entrega)

- Scaffold Next.js 16 + TS + Tailwind v4 + Drizzle + Neon.
- Sistema visual "Maze" (tokens, tipografia, componentes, movimento).
- Bilíngue PT/EN (dicionários + troca por cookie).
- Landing editorial + páginas de Ética e de Fontes de dados.
- Painel com as **6 ferramentas obrigatórias** como stubs navegáveis (dados ilustrativos
  no formato da API real).
- Modelo de dados de fundação (organizações, usuários, sessões, análises, `audit_log`).
- Biblioteca de auth (scrypt + sessão assinada) — pronta, UI ainda stub.
- Docs: PRD, Arquitetura, Ética, LGPD, Fontes de dados, Design, Roadmap.
- Infra: repositório GitHub, projeto Vercel, Postgres Neon, deploy de produção.

## Fase 1 — Ingestão de dados oficiais

- Clientes tipados: IBGE (localidades, malhas, agregados), Câmara (v2), Senado.
- Ingestor TSE (resultados + candidatos + coligações) com proveniência.
- Tabelas `stg_*` + rotina de agregação por território.
- `drizzle-kit` migrations para o schema analítico.
- Página de status das fontes conectada ao banco (não mais estática).

## Fase 2 — Mapa de Influência ponta-a-ponta

- Rede real a partir de resultados + coligações + mandatos.
- Território sobre malha GeoJSON do IBGE.
- Filtros: UF/município, cargo, janela de eleições.
- Exportação com ficha técnica.

## Fase 3 — Demais ferramentas com dados reais

- Mapa de Calor (choropleth por zona/município, comparação de turnos).
- Matriz Ideológica (pesos de partido editáveis + ajuste IBGE).
- Coligações (ganho marginal com desconto de sobreposição).
- Mapa de Propostas (classificação temática + agenda legislativa).

## Fase 4 — Cenários Estatísticos

- Motor de cenários parametrizado pelo objetivo (método proprietário).
- Análise de sensibilidade e comparação objetivo × base.
- Ficha técnica e versionamento de modelo.

## Fase 5 — Contas, multi-tenant e LGPD operacional

- Auth completa (cadastro, convites, papéis).
- Direitos do titular (export, correção, eliminação).
- RIPD por fonte; política de privacidade e de subprocessadores publicadas.
- Headers de segurança / CSP.

## Fase 6 — Beta com piloto

- Onboarding de uma campanha/mandato piloto por UF.
- Relatórios PDF.
- Telemetria de uso (agregada, sem PII).

---

### Convenções (de `dev.md`)

- Commits pequenos, em português, no imperativo, descrevendo comportamento.
- Rebrand/copy em commits separados de schema/lógica.
- `git push` + `npx vercel@latest --prod` obrigatório ao concluir tarefa que altere código.
- Tudo no disco A:.
