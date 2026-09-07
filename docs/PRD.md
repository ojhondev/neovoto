# NeoVoto — PRD (Product Requirements Document)

> Plataforma de **inteligência política baseada em evidência**. Ajuda partidos,
> candidaturas e mandatos a tomar melhores decisões de **estratégia eleitoral** e de
> **governabilidade**, correlacionando **dados abertos oficiais** — dentro da LGPD e
> sem repetir os erros da Cambridge Analytica.

- **Repositório:** https://github.com/ojhondev/neovoto
- **Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Neon (Postgres) · Vercel
- **Idiomas:** Português (padrão) e Inglês — bilíngue desde a fundação
- **Design:** sistema "Maze" (papel cor de osso, serifa editorial, marca-texto chartreuse) — ver `DESIGN.md`
- **Fase atual:** Fundação (scaffold + design + infra + ferramentas como stubs navegáveis com dados ilustrativos)

---

## 1. Problema

Campanhas e gabinetes decidem alocação de recursos, formação de alianças e prioridades
de agenda com base em intuição, pesquisa cara e pontual, e leitura enviesada de território.
Os dados que permitiriam decidir melhor **existem e são públicos** (TSE, IBGE, Câmara,
Senado, Portal da Transparência), mas estão dispersos, em formatos difíceis e sem
ferramenta que os correlacione de forma auditável.

Ao mesmo tempo, o mercado de "dados políticos" carrega o trauma da Cambridge Analytica:
coleta não consentida, perfis psicográficos individuais e microdirecionamento manipulativo.
Qualquer produto sério nesse espaço precisa ser **desenhado pela negativa** desse caso.

## 2. Objetivo do produto

Dar a quem decide uma **camada analítica única** sobre a realidade eleitoral e territorial,
com seis ferramentas que partem dos mesmos dados oficiais e se conectam entre si:

1. **Mapa de Influência** — quem move o eleitorado num território e como as forças se conectam.
2. **Matriz Ideológica por Região** — como cada região se posiciona em eixos temáticos.
3. **Mapa de Calor de Influência do Candidato/Coligação** — onde se é forte, fraco ou disputado.
4. **Mapa de Propostas** — cruza as propostas da candidatura com os temas que mobilizam cada eleitorado.
5. **Cenários Estatísticos** — motor que correlaciona dados para aproximar resultados, a partir do objetivo declarado.
6. **Coligações** — simula composições e mede o efeito de cada aliança no território.

## 3. Não-objetivos (o que a NeoVoto **não** faz)

- Não cria perfis psicológicos/psicográficos de eleitores individuais.
- Não coleta dados de redes sociais de pessoas naturais.
- Não compra, enriquece ou revende bases de dados pessoais.
- Não gera nem dispara mensagens a eleitores; não produz propaganda nem conteúdo sintético de pessoas.
- Não faz microdirecionamento baseado em vulnerabilidades emocionais.
- Não substitui pesquisa de opinião — complementa com dado observável.

Ver `ETICA.md` e `LGPD.md`.

## 4. Personas

| Persona | Uso principal |
|---|---|
| **Coordenação de campanha** | Alocação de recursos, prioridade territorial, leitura de cenário |
| **Estrategista / cientista político** | Modelagem de cenários, matriz ideológica, mapa de influência |
| **Articulação política / partido** | Simulação de coligações e federações, ganho marginal de alianças |
| **Gabinete de mandato** | Mapa de propostas x demanda regional, acompanhamento de agenda legislativa |

## 5. Requisitos funcionais por ferramenta

### 5.1 Mapa de Influência
- Entrada: recorte (UF / município / região), cargo, janela temporal (uma ou mais eleições).
- Constrói rede: nós = lideranças, mandatos, partidos, coligações; arestas = vínculo formal (coligação/federação), votação conjunta histórica, proximidade territorial.
- Dimensiona nós por peso eleitoral e arestas por força do vínculo.
- Destaca: bases a disputar, pontes entre blocos, dependências.
- Saída: visualização interativa + tabela + exportação com ficha técnica.

### 5.2 Matriz Ideológica por Região
- Agrega votação por partido por região (TSE) e aplica pesos ideológicos de partido **transparentes e editáveis**.
- Ajusta pelo contexto socioeconômico (IBGE: renda, escolaridade, urbanização).
- Projeta regiões em eixos (ex.: econômico × costumes) — **sem inferência sobre indivíduos**.
- Saída: dispersão de regiões, distância candidatura↔região, clusters.

### 5.3 Mapa de Calor de Influência
- Entrada: cargo, turno, recorte territorial, eleição(ões).
- Votação normalizada por eleitorado apto, por seção/zona/município.
- Compara turnos e eleições: bolsões de crescimento e de perda.
- Saída: choropleth sobre malha IBGE + ranking de prioridade territorial.

### 5.4 Mapa de Propostas
- Importa **propostas de governo** registradas no TSE (dataset de candidatos).
- Classifica por tema (vocabulário controlado).
- Coleta temas em tramitação na Câmara e no Senado, com região de origem.
- Aproxima ênfase da candidatura × demanda observável por tema e região.
- Saída: matriz tema × ênfase × demanda; lacunas e sobreposições.

### 5.5 Cenários Estatísticos
- Usuário declara o **objetivo** (ex.: vencer no 1º turno; eleger N cadeiras; ampliar bancada).
- Motor monta modelo: histórico eleitoral + contexto IBGE + composição de coligações + (quando houver) fundo e tempo de propaganda.
- Simulação de Monte Carlo variando premissas (comparecimento, transferência de voto, cenário nacional).
- Saída: distribuição de resultado (p10/mediana/p90) por cenário, análise de sensibilidade, comparação objetivo × base. **Cada cenário declara fontes, período e margem.**

### 5.6 Coligações
- Seleção de partidos/federações candidatos à composição.
- Soma votação histórica, bases municipais, fundo partidário, tempo de propaganda.
- Desconta **sobreposição de base** para estimar ganho marginal real.
- Saída: comparação lado a lado, ganho marginal por partido, efeito em TV/fundo.

## 6. Requisitos não-funcionais

- **Bilíngue** (PT/EN) em toda a superfície — dicionários versionados, troca por cookie.
- **LGPD by design**: minimização, registro de operações (`audit_log`), retenção limitada, RIPD. Base legal dos usuários = execução de contrato.
- **Somente APIs/datasets oficiais** — lista fechada em `FONTES-DE-DADOS.md`. Sem scraping de redes sociais, sem brokers.
- **Auditabilidade**: toda métrica exibida rastreável até fonte, recorte e método.
- **Conformidade eleitoral**: aderente às resoluções do TSE sobre IA e desinformação (sem deepfake, sem conteúdo sintético de pessoas, sem simulação de diálogo com candidato).
- **Acessibilidade**: contraste AA, `prefers-reduced-motion`, navegação por teclado.
- **Performance**: dados oficiais ingeridos em pipeline próprio (staging no Postgres), não consultados ao vivo por request.

## 7. Métricas de sucesso

- Tempo para produzir uma leitura territorial acionável: de dias para minutos.
- Nº de decisões de alocação/aliança apoiadas por relatório NeoVoto por ciclo.
- Cobertura territorial (UFs/municípios com dados ingeridos).
- Zero incidentes de tratamento de dado sensível de pessoa natural.

## 8. Roadmap resumido

Ver `ROADMAP.md`. Fundação → ingestão TSE/IBGE → 1 ferramenta ponta-a-ponta (Mapa de
Influência) → demais ferramentas → auth/multi-tenant → cenários com Monte Carlo → beta com piloto.
