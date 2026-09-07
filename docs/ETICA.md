# Ética — o aprendizado da Cambridge Analytica

> Este documento é parte do projeto de produto. A NeoVoto foi desenhada **pela negativa**
> do caso Cambridge Analytica: cada decisão de arquitetura responde a um erro concreto
> daquele caso.

## 1. O que aconteceu no caso Cambridge Analytica (resumo factual)

- **2014–2015:** um app de "quiz de personalidade" (*thisisyourdigitallife*, do pesquisador
  Aleksandr Kogan) coletou dados de ~270 mil pessoas que o instalaram **e**, pela API do
  Facebook da época, dados de seus amigos — chegando a **estimados 50–87 milhões de perfis**,
  a maioria sem qualquer consentimento.
- Esses dados alimentaram **modelos psicográficos** (traços "OCEAN": abertura,
  conscienciosidade, extroversão, amabilidade, neuroticismo) atribuídos a **indivíduos**.
- Os modelos foram usados para **microdirecionar** anúncios políticos explorando
  vulnerabilidades emocionais (medo, raiva), em campanhas nos EUA (2016) e no referendo
  do Brexit.
- **Março/2018:** reportagens de *The Guardian*, *The New York Times* e *Channel 4* expõem
  o esquema a partir do denunciante Christopher Wylie. Facebook perde bilhões em valor de
  mercado; a Cambridge Analytica encerra as atividades; FTC multa o Facebook em US$ 5 bi
  (2019); ICO (Reino Unido) multa o Facebook em £500 mil.

### Os erros centrais

| # | Erro | Natureza |
|---|---|---|
| 1 | **Coleta sem consentimento informado** | As pessoas achavam que participavam de pesquisa acadêmica; dados de amigos foram coletados sem que soubessem. |
| 2 | **Perfil psicográfico individual** | Traços de personalidade atribuídos a pessoas nomeadas, para prever e influenciar comportamento. |
| 3 | **Microdirecionamento manipulativo** | Mensagens desenhadas para explorar vulnerabilidades psicológicas específicas de cada alvo. |
| 4 | **Opacidade total** | Eleitores não sabiam que eram alvo, por quem, nem com base em quê. |
| 5 | **Mistura com desinformação** | O direcionamento amplificava conteúdo enganoso; efeito descrito como "catástrofe democrática". |
| 6 | **Origem dos dados lavada** | Dados de terceiros repassados/revendidos, dificultando rastrear a cadeia. |

## 2. Como a NeoVoto responde a cada erro

| Erro CA | Resposta de arquitetura da NeoVoto |
|---|---|
| 1. Coleta sem consentimento | **Somente dados abertos oficiais** publicados sob a Lei de Acesso à Informação. Nenhuma coleta de dados de pessoa natural. Lista de fontes fechada e versionada (`FONTES-DE-DADOS.md`). |
| 2. Perfil psicográfico individual | **A menor unidade de análise é territorial** (seção, zona, bairro, município, região). Não há entidade "eleitor" no modelo de dados. Não se infere personalidade, religião, orientação — nada de art. 11 da LGPD sobre indivíduos. |
| 3. Microdirecionamento manipulativo | A NeoVoto **não produz nem dispara mensagens**. Suas saídas são decisões de **estratégia** (onde alocar recurso, com quem coligar, que agenda priorizar). Não há integração com plataformas de anúncio nem exportação de "públicos". |
| 4. Opacidade | Toda métrica exibida traz **fonte, recorte temporal e método**. Relatórios saem com ficha técnica. O código de cálculo dos cenários é documentado. |
| 5. Desinformação | Aderência às Resoluções do TSE nº 23.610/2019 (com alterações de 2024) e 23.732/2024: **proibido deepfake**, proibido conteúdo sintético de pessoas, proibida simulação de diálogo com candidato, rótulo obrigatório em qualquer uso de IA. A NeoVoto não gera conteúdo eleitoral voltado ao público. |
| 6. Origem lavada | Cadeia de proveniência explícita: cada dataset ingerido registra origem, URL, data de coleta e licença (`data-sources/catalog.ts` + tabelas de staging). |

## 3. Princípios operacionais

1. **Agregação como padrão.** Se um número puder identificar ou singularizar uma pessoa
   natural, ele não entra.
2. **Dado de agente público ≠ dado de cidadão.** Votações, propostas, patrimônio declarado
   e mandatos de candidatos e eleitos são públicos por lei e tratados no interesse público.
3. **Decisão, não persuasão.** O produto ajuda a decidir; não ajuda a manipular.
4. **Transparência radical.** Preferimos mostrar a incerteza (faixas, margens) a projetar
   falsa precisão.
5. **Reversibilidade.** Usuários da plataforma podem exportar e eliminar seus dados.
6. **Recusa explícita.** Pedidos de uso que violem estes princípios são recusados e
   registrados.

## 4. Leitura de referência

- The Guardian / Observer — "The Cambridge Analytica Files" (2018).
- Bipartisan Policy Center — "History of the Cambridge Analytica Controversy".
- Frontiers in Communication (2020) — "Psychological Operations in Digital Political
  Campaigns: Assessing Cambridge Analytica's Psychographic Profiling and Targeting".
- FTC (2019) e ICO (2018) — decisões e multas.
- TSE — Resoluções 23.610/2019 e 23.732/2024 (IA e enfrentamento à desinformação).
