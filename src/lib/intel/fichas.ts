/**
 * Ficha metodológica versionada de cada motor — o que a plataforma faz, como foi
 * validado (ou não), as fontes e os limites conhecidos. Renderizada por
 * <FichaMetodologica> na tela de cada ferramenta.
 */
export type StatusFicha = "validado" | "calibrado" | "heuristico";

export type Ficha = {
  chave: string;
  versao: string;
  status: StatusFicha;
  metodo: string;
  validacao: string;
  intervalo: string;
  fontes: string[];
  limites: string[];
};

type L = (pt: boolean) => Ficha;

export const FICHAS: Record<string, L> = {
  ifet: (pt) => ({
    chave: "ifet",
    versao: "IFET v2 · Base do Candidato v1",
    status: "calibrado",
    metodo: pt
      ? "Dois eixos: peso do território (população, renda, disputabilidade) × alcance do candidato (histórico próprio, cidade-base + região imediata do IBGE, rede de mandatos do partido, apoios). Agregação por média geométrica não-compensatória — alcance baixo derruba a prioridade por mais populoso que o município seja."
      : "Two axes: territorial weight (population, income, contestability) × candidate reach (own history, home city + IBGE immediate region, party's elected network, endorsements). Non-compensatory geometric mean — low reach drags priority down regardless of population.",
    validacao: pt
      ? "Backtest (SP/MG/RS, dep. estadual 2022, docs/BACKTEST-METODOS.md §C): o alcance construído só com dado ≤2020 prevê onde o candidato performa acima da média (share) com precisão@10 de 4 a 6× a do ranking por população. NÃO prevê contagem bruta de votos — por isso é motor de targeting."
      : "Backtest (SP/MG/RS, state deputy 2022, §C): reach built only from ≤2020 data predicts where the candidate over-performs (share) with precision@10 4–6× the population baseline. Does not predict raw vote counts.",
    intervalo: pt
      ? "Confiança do alcance por município (alta / média / baixa / sem sinal); municípios sem sinal do candidato aparecem vazados no mapa."
      : "Per-municipality reach confidence (high / medium / low / none); municipalities with no candidate signal render hollow.",
    fontes: [
      "IBGE — Censo 2022 (população), PIB dos Municípios, regiões imediatas + centroides",
      "TSE / Base dos Dados — votação do candidato e do partido por município",
      "Bolognesi, Ribeiro & Codato (2022) — escala ideológica de partido",
    ],
    limites: pt
      ? [
          "As camadas da Base (âncora, rede do partido, decaimento por distância) ainda não foram isoladas uma da outra no backtest.",
          "Base sintética (candidato sem nenhum histórico) não é backtestável — marcada como baixa confiança.",
          "Emendas e transferências ao município (Portal da Transparência) ainda não entram.",
        ]
      : [
          "The Base's layers (anchor, party network, distance decay) haven't been isolated in the backtest.",
          "Synthetic base (candidate with no history at all) isn't backtestable — flagged low confidence.",
          "Parliamentary amendments and transfers to the municipality aren't in yet.",
        ],
  }),

  matriz: (pt) => ({
    chave: "matriz",
    versao: "Matriz v3",
    status: "validado",
    metodo: pt
      ? "Posição do município = média das posições dos partidos ponderada pelo voto no 1º turno presidencial de 2022. Eixo econômico: ajuste ±0,06 por PIB per capita. Eixo de costumes: ajuste mínimo por escolaridade, urbanização e idade do eleitorado (TSE)."
      : "Municipality position = vote-weighted average of party positions in the 2022 1st-round presidential vote. Economic axis: ±0.06 GDP-per-capita adjustment. Social axis: minimal adjustment for electorate education, urbanisation and age (TSE).",
    validacao: pt
      ? "Backtest (§A e §E): a posição prevê o 2º turno presidencial de 2022 com R² 0,93 mesmo out-of-time (posição de 2018 → resultado de 2022). O ajuste de renda mantém o R²; adicionar escolaridade no eixo econômico foi testado e PIOROU — descartado."
      : "Backtest (§A, §E): position predicts the 2022 2nd round with R² 0.93 even out-of-time. The income adjustment keeps R²; adding education to the economic axis was tested and made it worse — dropped.",
    intervalo: pt
      ? "O eixo econômico é validado; o ajuste de costumes é achado clássico de comportamento político mas NÃO backtestável contra o voto presidencial — entra pequeno e rotulado como tal."
      : "The economic axis is validated; the social-values adjustment is a classic behavioural finding but NOT backtestable against presidential vote — kept small and labelled.",
    fontes: [
      "TSE / Base dos Dados — 1º turno presidencial 2022 por partido e município",
      "TSE — perfil do eleitorado (escolaridade, faixa etária) · IBGE — PIB",
      "Bolognesi, Ribeiro & Codato (2022) — survey de especialistas",
    ],
    limites: pt
      ? [
          "O eixo de costumes segue comprimido (o método aditivo não abre a distribuição); a ordenação relativa vale, o valor absoluto não.",
          "Só o pleito presidencial — municípios sem disputa presidencial competitiva ficam pouco espalhados.",
        ]
      : [
          "The social-values axis stays compressed; relative ordering holds, absolute value doesn't.",
          "Presidential race only.",
        ],
  }),

  influencia: (pt) => ({
    chave: "influencia",
    versao: "Rede de Pessoas v1 · Rede de Partidos v1",
    status: "heuristico",
    metodo: pt
      ? "Rede de mandatos: cada deputado federal da UF posicionado pelo ponto ideal (1º componente da matriz de concordância) das ~30 votações nominais recentes do plenário; aresta = concordância ≥ 75%. Rede de partidos (contexto): voto proporcional, eixo ideológico e sobreposição de base (cosseno dos perfis geográficos)."
      : "Mandate network: each federal deputy placed by ideal point over ~30 recent nominal floor votes; edge = agreement ≥ 75%. Party network (context): proportional vote, ideology axis and base overlap (cosine of geographic profiles).",
    validacao: pt
      ? "Não validado por backtest — é leitura direta de dado oficial (a concordância de voto é o dado, não uma estimativa). A escala ideológica de partido é calibrada por Bolognesi 2022."
      : "Not backtested — it's a direct read of official data (vote agreement is the data, not an estimate). The party ideology scale is calibrated by Bolognesi 2022.",
    intervalo: pt
      ? "Ano eleitoral tem poucas votações nominais; com menos de ~10 a rede não é mostrada. Deputado com menos de 30% de presença fica de fora."
      : "Election years have few nominal votes; below ~10 the network isn't shown. Deputies below 30% attendance are excluded.",
    fontes: [
      "Câmara dos Deputados — votações nominais do plenário (últimos ~18 meses)",
      "TSE / Base dos Dados — votação por partido e município",
      "Câmara — composição das bancadas · NeoVoto — escala ideológica de partido",
    ],
    limites: pt
      ? [
          "Só a bancada FEDERAL — deputados estaduais não têm API aberta unificada de votação nominal.",
          "A rede de partidos usa sobreposição geográfica, não afinidade ideológica (backtest §B: PSOL–PL dá +0,20 no proporcional).",
          "Coligações majoritárias e o histórico de votação conjunta plurianual ainda não entram no grafo.",
        ]
      : [
          "Federal delegation only — state deputies have no unified open roll-call API.",
          "The party network uses geographic overlap, not ideological affinity.",
          "Majority coalitions and multi-year joint-voting history aren't in the graph yet.",
        ],
  }),

  cenarios: (pt) => ({
    chave: "cenarios",
    versao: "Cenários v3 (Monte Carlo calibrado)",
    status: "validado",
    metodo: pt
      ? "4.000 simulações de Monte Carlo sobre um modelo de crescimento lognormal (mediana 0,90×, sd(log) 0,62) calibrado no voto real, mais fatores menores de maré nacional, comparecimento e execução. Saída: distribuição p10–p90 + chance de eleger condicional às premissas."
      : "4,000 Monte Carlo simulations over a lognormal growth model (median 0.90×, sd(log) 0.62) calibrated on real vote, plus minor factors for national mood, turnout and execution. Output: p10–p90 distribution + chance to get elected conditional on assumptions.",
    validacao: pt
      ? "Backtest (§D, 496 candidatos a dep. estadual 2018→2022): o IC 80% cobriu 76% dos resultados reais, o PIT é quase plano, a mediana é não-viesada e a 'chance de eleger' bate a taxa-base (Brier 0,11 vs 0,20; ρ 0,94)."
      : "Backtest (§D, 496 state-deputy candidates 2018→2022): the 80% CI covered 76% of real outcomes, near-flat PIT, unbiased median, and the 'chance to get elected' beats the base rate (Brier 0.11 vs 0.20; ρ 0.94).",
    intervalo: pt
      ? "Toda a saída é distribuição (p10 / mediana / p90) + probabilidade. Candidato sem histórico no cargo: base sintética, faixa muito mais larga e marcada como de baixa confiança."
      : "All output is a distribution (p10 / median / p90) + probability. No history for the office: synthetic base, much wider range, flagged low confidence.",
    fontes: [
      "TSE / Base dos Dados — votação do candidato e do partido por município",
      "NeoVoto — IFET (prioridade territorial) · Base do Candidato (alcance)",
      "IBGE — população (estimativa de eleitorado)",
    ],
    limites: pt
      ? [
          "O nível de um candidato proporcional uma eleição à frente é pouco previsível — por isso as faixas são largas de propósito.",
          "Base sintética (first-timer) não é calibrável — não há eleição anterior comparável.",
          "Fundo partidário e tempo de propaganda ainda não entram como premissa.",
        ]
      : [
          "An individual proportional candidate's level one election ahead is hard to predict — hence the wide ranges.",
          "Synthetic base (first-timer) isn't calibratable.",
          "Party fund and broadcast time aren't assumptions yet.",
        ],
  }),

  partidos: (pt) => ({
    chave: "partidos",
    versao: "Correlação de base v1",
    status: "calibrado",
    metodo: pt
      ? "Correlação de Pearson entre os perfis geográficos de voto dos partidos (share por município) no 1º turno presidencial de 2022. Positivo = disputam a mesma base; negativo = bases opostas. Complementada com a afinidade da escala Bolognesi."
      : "Pearson correlation between parties' geographic vote profiles (share by municipality) in the 2022 1st-round presidential vote. Positive = same base; negative = opposite. Complemented with Bolognesi-scale affinity.",
    validacao: pt
      ? "Backtest (§B): com o pleito presidencial a correlação é direcionalmente correta (PT–PL = −0,99). No pleito proporcional NÃO funciona (PSOL–PL dá +0,20 — capta 'partido de cidade grande', não ideologia)."
      : "Backtest (§B): with the presidential race the correlation is directionally correct (PT–PL = −0.99). With the proportional race it does NOT work.",
    intervalo: pt
      ? "Cada correlação vem com um intervalo de confiança de 95% (transformação de Fisher). Só cobre os ~11 partidos que lançaram candidato presidencial."
      : "Each correlation comes with a 95% confidence interval (Fisher transform). Covers only the ~11 parties that ran a presidential candidate.",
    fontes: [
      "TSE / Base dos Dados — votação por partido e município (presidente 2022)",
      "Câmara — bancadas · NeoVoto — escala ideológica de partido",
    ],
    limites: pt
      ? [
          "Correlação de voto ≠ afinidade ideológica — é sobreposição de base territorial ('pescam no mesmo lago?').",
          "Partidos fora da disputa presidencial (PSDB, PP, Republicanos, PSD…) não entram na matriz de correlação.",
        ]
      : [
          "Vote correlation ≠ ideological affinity — it's territorial base overlap.",
          "Parties outside the presidential race aren't in the correlation matrix.",
        ],
  }),

  coligacoes: (pt) => ({
    chave: "coligacoes",
    versao: "Coligações v1",
    status: "heuristico",
    metodo: pt
      ? "Ganho líquido = voto bruto do parceiro × (1 − sobreposição × 0,7), onde a sobreposição é o cosseno dos perfis geográficos de voto. Bancada federal como proxy de fundo partidário e tempo de TV. Coligação proporcional é proibida desde 2020 — vale para a majoritária e federações."
      : "Net gain = partner's raw vote × (1 − overlap × 0.7), where overlap is the cosine of geographic vote profiles. Federal bench as a proxy for party fund and broadcast time.",
    validacao: pt
      ? "Backtest (§F, federações de 2022): o desconto de sobreposição NÃO se sustenta nos dados — PT e PSOL trouxeram MAIS voto que a soma separada de 2018 (o momento próprio do partido pesa mais que a geografia). O ganho líquido é heurística grosseira; a plataforma mostra uma faixa larga (de fortemente descontado ao voto inteiro), não um número."
      : "Backtest (§F, 2022 federations): the overlap discount is NOT supported by the data — PT and PSOL brought MORE vote than their separate 2018 sum. Net gain is a rough heuristic; shown as a wide range, not a number.",
    intervalo: pt
      ? "Ganho líquido apresentado como faixa: do cenário de forte redundância (desconto 0,9) ao cenário em que o parceiro traz o voto inteiro."
      : "Net gain shown as a range: from strong redundancy (0.9 discount) to the partner bringing their full vote.",
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "Câmara — composição das bancadas · NeoVoto — escala ideológica de partido",
    ],
    limites: pt
      ? [
          "O efeito real de uma aliança em transferência de voto depende de fatores locais que o modelo não captura (rixa, palanque, tempo).",
          "Fundo especial e tempo de TV reais (prestação de contas TSE) ainda não entram — só o proxy de bancada.",
        ]
      : [
          "The real vote-transfer effect of an alliance depends on local factors the model doesn't capture.",
          "Real special fund and broadcast time (TSE accounts) aren't in yet — only the bench proxy.",
        ],
  }),

  radar: (pt) => ({
    chave: "radar",
    versao: "Radar de Posicionamento v1 (Fase 1–2)",
    status: "heuristico",
    metodo: pt
      ? "Classifica a agenda legislativa recente e a camada de imprensa numa taxonomia fechada de temas; saliência = volume × velocidade × peso territorial (IFET), com decaimento exponencial. Cruza com a posição registrada do candidato e o campo do partido para dizer se um tema é lacuna, exposição ou consolidação."
      : "Classifies the recent legislative agenda and press layer into a closed theme taxonomy; salience = volume × velocity × territorial weight (IFET), with exponential decay.",
    validacao: pt
      ? "NÃO validado. A hipótese de que a saliência de um tema antecede movimento de voto ainda não foi backtestada — depende de série temporal de percepção que a plataforma não coleta."
      : "NOT validated. Whether a theme's salience precedes vote movement hasn't been backtested.",
    intervalo: pt
      ? "Saída qualitativa por decisão de produto (Lei 9.504): direção de posicionamento, nunca delta de percepção em número."
      : "Qualitative output by product decision (Law 9.504): direction of positioning, never a perception delta.",
    fontes: [
      "Câmara — proposições em tramitação · Agência Brasil, Google Notícias, Google Trends (RSS)",
      "NeoVoto — taxonomia de temas (fechada, versionada) e IFET",
    ],
    limites: pt
      ? [
          "Sem validação temporal — não se sabe se um tema que sobe antecede ganho de voto.",
          "Fase 3 (X/YouTube trends) exige credencial paga do usuário e não está ativa.",
          "A classificação de tema é por palavra-chave; um LLM classificador melhoraria a precisão.",
        ]
      : [
          "No temporal validation.",
          "Phase 3 (X/YouTube trends) needs paid user credentials and isn't active.",
          "Theme classification is keyword-based.",
        ],
  }),
};
