# NeoVoto — Fontes de dados (somente abertas e oficiais)

> Regra inegociável: a NeoVoto usa **exclusivamente** dados abertos publicados por órgãos
> oficiais. Sem raspagem de redes sociais, sem data brokers, sem bases de terceiros.
> A implementação viva deste catálogo está em `src/lib/data-sources/catalog.ts`.

## 1. TSE — Portal de Dados Abertos

- **Base:** https://dadosabertos.tse.jus.br (CKAN)
- **Acesso:** portal CKAN com download de arquivos CSV/ZIP por ano e UF. O host aplica
  proteção anti-bot (Akamai) — a ingestão deve usar um cliente com *user-agent* de
  navegador e *rate limit* respeitoso, ou o mirror de arquivos brutos quando disponível.
- **Licença:** dados abertos sob a LAI; uso livre com citação da fonte.
- **Conjuntos relevantes:**
  - **Resultados** (`resultados-YYYY`): detalhe da apuração por município e zona/seção;
    votação nominal e por partido; votação por seção eleitoral; boletim de urna.
  - **Candidatos** (`candidatos-YYYY`): dados de candidatura, **coligações**, bens
    declarados, **redes sociais**, **propostas de governo** (arquivo de proposta), cargo,
    situação.
  - **Prestação de contas** (`prestacao-de-contas-eleitorais-YYYY`): receitas, despesas,
    doações, **fundo partidário** e **fundo especial**.
  - **Perfil do eleitorado** (`eleitorado-*`): por município/zona, faixa etária, grau de
    instrução, gênero — **agregado**.
  - **Filiados** (`filiados-partidos`): quantitativo por partido/município — agregado.
  - **Divulgação de resultados** (apuração): https://resultados.tse.jus.br — arquivos
    durante a totalização.

### Campos-chave para a NeoVoto

| Ferramenta | Dataset TSE | Campos |
|---|---|---|
| Mapa de Influência | Resultados + Candidatos | `SG_UF`, `CD_MUNICIPIO`, `NR_ZONA`, `SG_PARTIDO`, `NM_COLIGACAO`, `DS_COMPOSICAO_COLIGACAO`, `QT_VOTOS_NOMINAIS` |
| Mapa de Calor | Resultados | votos por `NR_ZONA` / `CD_MUNICIPIO`, `QT_APTOS`, `QT_COMPARECIMENTO` |
| Matriz Ideológica | Resultados (por partido) | `SG_PARTIDO`, `QT_VOTOS_LEGENDA`, `QT_VOTOS_NOMINAIS` por região |
| Mapa de Propostas | Candidatos (proposta de governo) | arquivo PDF/txt de proposta + `DS_CARGO` |
| Cenários | Resultados (série histórica) + Prestação de contas | votação por ano + `VR_FUNDO_PARTIDARIO` |
| Coligações | Candidatos (coligações/federações) | `DS_COMPOSICAO_COLIGACAO`, `TP_AGREMIACAO`, `NM_FEDERACAO` |

## 2. IBGE — Serviço de Dados

- **Localidades:** https://servicodados.ibge.gov.br/api/v1/localidades
  - `/estados`, `/mesorregioes`, `/microrregioes`, `/municipios`, `/distritos`,
    `/regioes-imediatas`, `/regioes-intermediarias`.
  - REST JSON, sem chave, CORS aberto. **Testado e funcional.**
- **Malhas:** https://servicodados.ibge.gov.br/api/v3/malhas
  - GeoJSON/TopoJSON por UF, mesorregião, município. Parâmetro `formato=application/vnd.geo+json`.
  - Usado para os choropleths do Mapa de Calor e o território do Mapa de Influência.
- **Agregados (SIDRA):** https://servicodados.ibge.gov.br/api/v3/agregados
  - Censo 2022, projeções populacionais, PIB municipal, PNAD Contínua — recortes agregados.
  - Indicadores para a Matriz Ideológica (renda, escolaridade, urbanização) e para os Cenários.
- **Licença:** dados abertos, uso livre.

## 3. Câmara dos Deputados — Dados Abertos

- **Base:** https://dadosabertos.camara.leg.br/api/v2 (REST; JSON/XML/CSV)
- **Recursos:** `/deputados`, `/partidos`, `/blocos`, `/frentes`, `/proposicoes`
  (com `temas`, `keywords`, `autores`, `tramitacoes`), `/votacoes` (com `votos` e
  `orientacoes` de bancada), `/orgaos`, `/legislaturas`, `/eventos`.
- **Uso na NeoVoto:** mandatos e blocos para o Mapa de Influência; temas de proposições e
  votações para o Mapa de Propostas (o que está em pauta, por autoria/região).
- **Licença:** dados abertos, uso livre. Sem chave; *rate limit* recomendado.

## 4. Senado Federal — Dados Abertos

- **Base:** https://legis.senado.leg.br/dadosabertos (REST XML, boa parte com JSON via `?format=json`)
- **Endpoints:** `/senador/lista/atual`, `/senador/{codigo}`, `/materia/...`,
  `/votacao/...`, `/composicao/...`.
- **Uso:** senadores em exercício e votações nominais para o Mapa de Influência;
  matérias legislativas para o Mapa de Propostas. **Endpoint testado e funcional.**
- **Licença:** dados abertos, uso livre.

## 5. Portal da Transparência (CGU)

- **Base:** https://api.portaldatransparencia.gov.br (REST JSON; **exige chave gratuita**
  via cadastro de e-mail)
- **Uso:** emendas parlamentares e execução, transferências a municípios — sinal de
  capilaridade/entrega para o Mapa de Influência e o Mapa de Propostas.
- **Licença:** dados abertos; respeitar limites de requisição da chave.

## 6. Padrão de ingestão

1. **Cliente por fonte** em `src/lib/data-sources/<fonte>/` — tipagem forte da resposta.
2. **Mock no formato real** em `src/lib/mock/` enquanto a fonte não está conectada
   (ambiente "mockado primeiro" — trocar o mock pela integração sem mudar a arquitetura).
3. **Staging no Postgres**: tabelas `stg_*` por dataset, com colunas de proveniência
   (`_source`, `_source_url`, `_collected_at`, `_dataset_version`).
4. **Transformação** para tabelas analíticas agregadas por território.
5. **Nunca** consultar a fonte ao vivo por request de usuário — só pelo pipeline.

## 7. Checklist antes de adicionar uma fonte

- [ ] É um órgão oficial e o dado é publicado como dado aberto?
- [ ] A licença permite uso analítico e redistribuição de derivados agregados?
- [ ] O dado é agregado ou, se granular, não identifica pessoa natural?
- [ ] RIPD atualizado (`docs/RIPD.md`)?
- [ ] Cliente tipado + mock + proveniência implementados?
- [ ] Entrada correspondente em `data-sources/catalog.ts` e nesta página?
