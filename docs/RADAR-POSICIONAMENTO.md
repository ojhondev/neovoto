# Radar de Posicionamento — motor de recomendação de tema/agenda

> Decisão do usuário (sessão 7): a NeoVoto deve **gerar os temas que o candidato deve
> abordar** — políticos e do dia a dia (ex.: "impeachment de ministro do STF") — cruzando
> histórico eleitoral, contexto regional, **contexto em tempo real** e eixo ideológico,
> para **maximizar tendência de crescimento de popularidade** e, com isso, de eleição.

Esta é a evolução com dados reais do **Mapa de Propostas** (5ª ferramenta obrigatória).

## 1. O que entrega

Para a candidatura ativa e o recorte territorial (UF → região → município):

1. **Radar de temas** — o que está em alta agora, de onde vem o sinal (Congresso, STF,
   imprensa, tendências), e o quão quente está em cada região-força do candidato.
2. **Alinhamento** — para cada tema, se posicionar-se **a favor / contra / com ressalva**
   está alinhado ao eixo ideológico do candidato e ao voto observado nas suas regiões.
3. **Lacunas** — temas quentes nas regiões onde ele é forte (IFET alto) sobre os quais ele
   **não tem posição pública registrada**.
4. **Recomendação de direção (qualitativa)** — ex.: *"Assumir a defesa da autonomia do STF
   tende a reforçar sua base no Sudeste (regiões IFET 80+, voto histórico do campo 62%) e a
   te desgastar no agro do Centro-Oeste. Se entrar, entre pelo enquadramento institucional,
   não partidário."* **Sem número de percepção. Uso interno. Não publicável.**

## 2. Enquadramento — ética e lei (não negociável)

- **Cabe nos princípios atuais** (`ETICA.md` §2, linha 3): a saída é *decisão de estratégia
  de agenda*, que já é uso permitido. A NeoVoto **não gera nem dispara mensagem a eleitor**,
  não monta público de anúncio, não infere nada sobre indivíduos.
- **Unidade de análise = território e tema.** Nunca a pessoa. Tendência social entra
  **agregada por tópico e por região** (volume/velocidade de um assunto), nunca conteúdo
  ou perfil de quem publicou. Nada de art. 11 da LGPD sobre cidadão.
- **Lei 9.504/1997 (arts. 33–35):** a recomendação é **qualitativa e interna**. A plataforma
  **não estima intenção de voto nem delta de percepção em número** e marca todo relatório
  como "apoio interno à decisão — divulgação pública pode configurar pesquisa não
  registrada". Sem ranking público, sem "candidato X% vs Y%".
- **Resoluções TSE 23.610/2019 e 23.732/2024:** o texto da recomendação é gerado por LLM
  apenas para **explicar/classificar** o cruzamento de dados — nunca cria peça de campanha,
  nunca simula terceiros, e a saída leva rótulo de uso de IA.
- **Proveniência:** cada tema no radar cita a fonte, a data e a janela (`data-sources`).

## 3. Fontes de dados por camada

| Camada | Fonte | Acesso | Papel |
|---|---|---|---|
| **Institucional** | Câmara (proposições em tramitação, ordem do dia, temas, votações nominais, frentes), Senado (matérias, agenda) | REST, sem chave — **já integrado** | Espinha dorsal: o que o poder público está de fato discutindo |
| **Institucional** | Agenda de julgamentos do STF (pauta), Diário Oficial da União | REST/feed público | Temas jurídico-institucionais (ex.: julgamento com repercussão) |
| **Imprensa** | Agência Brasil / EBC (RSS), agregadores de manchete de veículos grandes, **Google Trends** (`trends.google.com`, séries públicas) | RSS / API pública | Tema puramente midiático que não está em pauta no Congresso |
| **Tendências sociais** | APIs oficiais de produto: X/Twitter *trends* (não timeline de pessoas), YouTube *trending*, Google Trends por UF | **API oficial — exige credencial do usuário** (algumas pagas) | Velocidade de um assunto por região; **só o tópico agregado**, zero conteúdo/pessoa |
| **Histórico + regional** | Base dos Dados / TSE (votação do candidato e do campo por município), IBGE (perfil socioeconômico) | **já integrado** | Onde o candidato é forte e como aquela região vota — pesa a recomendação |
| **Ideológico** | Escala de partido transparente e editável + votações nominais da Câmara (posição revelada) | interno + Câmara | Eixo do candidato para checar alinhamento do tema |

> **Regra mantida:** nenhuma raspagem de timeline/perfil de pessoa natural; nenhum dado
> pessoal; só APIs oficiais de produto e feeds públicos. "Tendência social" = qual assunto
> sobe, não quem falou.

## 4. Pipeline

```
ingest  →  classificação de tema  →  saliência regional  →  alinhamento  →  lacuna  →  recomendação
(camadas    (taxonomia fixa de       (peso por região       (eixo do        (o que ele    (LLM explica o
 acima)      ~40 temas; NLP +         IFET × volume do       candidato ×     não cobra)    cruzamento;
             LLM classifica)          tema na região)        voto da região)               nunca prevê nº)
```

- **Taxonomia de tema** (`src/lib/intel/temas.ts`): lista fechada e versionada (~40 temas —
  economia/custo de vida, segurança, saúde, STF/instituições, agro, meio ambiente, costumes,
  educação, corrupção, etc.). Cada item ingerido é classificado num ou mais temas.
- **Saliência regional** `S(tema, regiao)` = volume normalizado × velocidade (derivada) ×
  peso IFET da região. Série temporal com decaimento (`w(t)=e^{-λt}`).
- **Alinhamento** `A(tema, direção)` = distância entre a direção proposta e (eixo do
  candidato, voto observado da região). Qualitativo: alinhado / neutro / tensão.
- **Lacuna** = tema com `S` alto nas regiões IFET-alto do candidato **e** sem posição
  registrada dele (proposição, voto nominal, proposta de governo).
- **Recomendação** = template + LLM: recebe {tema, saliência por região, alinhamento,
  lacuna, eixo} e redige o parágrafo de direção. Temperatura baixa, sem inventar dado,
  saída sempre com as fontes anexadas. **O LLM não pontua nem prevê — só verbaliza.**

## 5. Motor (código)

- v1 **heurístico + LLM-classificador** em TypeScript, dentro do Vercel — sem serviço
  Python. Classificação e redação via LLM (Claude), resto é aritmética explicável.
- v2 (se necessário) — validação estatística da saliência (backtesting: o tema que subiu
  antecedeu movimento no voto?) migra para o serviço Python do doc de estratégia (sessão 4).

## 6. Faseamento

| Fase | Escopo | Depende de |
|---|---|---|
| **1 — Institucional** | Radar só com Câmara + Senado + STF/DOU. Taxonomia de tema, saliência por região (IFET), lacuna vs. atividade legislativa do candidato, recomendação qualitativa via LLM. Vira a tela real do Mapa de Propostas. | credencial de LLM (Claude API key) |
| **2 — Imprensa** | + camada de manchete (Agência Brasil RSS, Google Trends). Cobre tema midiático. | — (feeds públicos) |
| **3 — Tendências sociais** | + X/Twitter trends por UF, YouTube trending. Velocidade fina do assunto. | credencial do usuário (X API — tier pago; YouTube API key) |
| **4 — Validação** | Backtesting da saliência contra movimento de voto histórico. Serviço Python. | infra Python (Modal/Fly) |

## 7. Onde vive na plataforma

Rota `/painel/mapa-de-propostas` — hoje stub. Passa a mostrar o Radar. O nome público
continua "Mapa de Propostas"; internamente é o Radar de Posicionamento.
