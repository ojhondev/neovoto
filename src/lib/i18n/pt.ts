const pt = {
  common: {
    appName: "NeoVoto",
    tagline: "Inteligência política baseada em evidência",
    enter: "Entrar",
    createAccount: "Criar conta",
    requestDemo: "Solicitar demonstração",
    backToSite: "Voltar ao site",
    dashboard: "Painel",
    logout: "Sair",
    soon: "Em breve",
    preview: "Prévia",
    dataSources: "Fontes de dados",
    methodology: "Metodologia",
    lastUpdate: "Última atualização",
    mockNotice:
      "Dados ilustrativos. As integrações oficiais (TSE, IBGE, Câmara, Senado) são conectadas na próxima fase.",
  },
  nav: {
    product: "Produto",
    tools: "Ferramentas",
    ethics: "Ética & LGPD",
    method: "Método",
    pricing: "Planos",
  },
  announce: "NeoVoto — plataforma analítica para decisões eleitorais e de governo. Somente dados abertos oficiais.",
  landing: {
    heroKicker: "Plataforma de inteligência política",
    heroTitle: "Decisões eleitorais e de governo com base em evidência, não em achismo",
    heroSub:
      "A NeoVoto correlaciona dados públicos oficiais para ajudar partidos, candidaturas e mandatos a entender território, eleitorado e cenários — dentro da LGPD e sem os erros da Cambridge Analytica.",
    heroPrimary: "Solicitar demonstração",
    heroSecondary: "Ver as ferramentas",
    scrollCue: "Role para continuar",
    trustTitle: "Construída sobre três compromissos inegociáveis",
    trust: [
      {
        title: "Somente dados abertos oficiais",
        body:
          "TSE, IBGE, Câmara dos Deputados, Senado Federal e Portal da Transparência. Nada de raspagem de redes sociais nem compra de bases de terceiros.",
      },
      {
        title: "LGPD do início ao fim",
        body:
          "Opinião política é dado sensível (art. 11). A NeoVoto trabalha em nível territorial agregado e com dados de agentes públicos — nunca perfis psicográficos de cidadãos.",
      },
      {
        title: "Transparência metodológica",
        body:
          "Toda projeção mostra suas fontes, o recorte temporal e as premissas. Nada de caixa-preta: o cenário é auditável.",
      },
    ],
    toolsTitle: "Seis ferramentas, um mesmo mapa da realidade",
    toolsSub:
      "Cada ferramenta parte dos mesmos dados oficiais e conversa com as outras. Você começa pelo território e chega ao cenário.",
    manifestoTitle: "O que a NeoVoto não faz",
    manifestoSub:
      "O caso Cambridge Analytica definiu, pela negativa, o nosso projeto de produto.",
    manifestoPoints: [
      "Não cria perfis psicológicos de eleitores individuais.",
      "Não coleta dados de redes sociais de pessoas naturais.",
      "Não compra, enriquece ou revende bases de dados pessoais.",
      "Não gera propaganda enganosa nem conteúdo sintético de pessoas.",
      "Não faz microdirecionamento manipulativo baseado em vulnerabilidades.",
    ],
    manifestoCta: "Ler o manifesto e a política de LGPD",
    ctaTitle: "Pronto para decidir com evidência?",
    ctaBody:
      "Agende uma demonstração com dados do seu estado ou município.",
  },
  tools: {
    influenceMap: {
      name: "Mapa de Influência",
      short: "Quem move o eleitorado num território e como as forças se conectam.",
      desc:
        "Rede de atores políticos — lideranças, mandatos, partidos e coligações — dimensionada por votação histórica, capilaridade territorial e vínculos formais. Baseado em resultados do TSE e composições oficiais.",
    },
    ideologicalMatrix: {
      name: "Matriz Ideológica por Região",
      short: "Como cada região se posiciona em eixos temáticos, a partir de comportamento eleitoral.",
      desc:
        "Posição relativa de municípios e regiões em eixos (por exemplo econômico e de costumes), estimada a partir de votação agregada por partido e de indicadores socioeconômicos do IBGE. Sem inferência sobre indivíduos.",
    },
    influenceHeatmap: {
      name: "Mapa de Calor de Influência",
      short: "Onde a candidatura ou coligação é forte, fraca ou disputada.",
      desc:
        "Intensidade geográfica de desempenho por zona e município, com séries históricas do TSE e recorte por cargo e turno. Identifica bolsões de crescimento e de perda.",
    },
    proposalMap: {
      name: "Mapa de Propostas",
      short: "Cruza as propostas da candidatura com os temas que mobilizam cada eleitorado.",
      desc:
        "Mapeia as propostas de governo (registradas no TSE) e os temas em pauta no Legislativo (Câmara e Senado), aproximando-os das prioridades observáveis por região. Aponta lacunas e sobreposições.",
    },
    scenarios: {
      name: "Cenários Estatísticos",
      short: "Motor que correlaciona dados para aproximar resultados, a partir do seu objetivo.",
      desc:
        "Modelos probabilísticos que combinam histórico eleitoral, contexto socioeconômico e composição de coligações para estimar faixas de resultado sob diferentes premissas. Cada cenário declara suas fontes e sua margem.",
    },
    coalitions: {
      name: "Coligações",
      short: "Simula composições e mede o efeito de cada aliança no território.",
      desc:
        "Compara coligações e federações possíveis usando tempo de propaganda, fundo partidário, bases municipais e votação histórica dos partidos. Mostra ganho marginal e sobreposição de bases.",
    },
  },
  toolPage: {
    overview: "Visão geral",
    howItWorks: "Como funciona",
    inputs: "Entradas de dados",
    outputs: "O que você obtém",
    status: "Status",
    statusStub:
      "Estrutura e visualização prontas com dados ilustrativos. Conexão às APIs oficiais na próxima fase.",
  },
  ethics: {
    title: "Ética, LGPD e o aprendizado da Cambridge Analytica",
    intro:
      "A NeoVoto foi desenhada a partir de uma pergunta: como fazer inteligência política sem repetir o que tornou a Cambridge Analytica um escândalo democrático?",
    caseTitle: "O que deu errado no caso Cambridge Analytica",
    casePoints: [
      "Dados de dezenas de milhões de pessoas foram coletados sem consentimento informado, via um aplicativo que se apresentava como quiz acadêmico.",
      "Esses dados alimentaram perfis psicográficos individuais usados para microdirecionar mensagens explorando vulnerabilidades emocionais.",
      "Não havia transparência: eleitores não sabiam que eram alvo, nem por quê.",
      "O efeito combinado de perfilagem oculta e desinformação foi descrito como uma 'catástrofe democrática'.",
    ],
    answerTitle: "Como a NeoVoto responde a cada ponto",
    answer: [
      {
        problem: "Coleta sem consentimento",
        solution:
          "Só usamos dados abertos publicados por órgãos oficiais sob a Lei de Acesso à Informação. Nenhuma coleta de dados de pessoas naturais.",
      },
      {
        problem: "Perfis psicográficos individuais",
        solution:
          "A menor unidade de análise é territorial (seção, zona, bairro, município). Nunca modelamos a personalidade de um indivíduo.",
      },
      {
        problem: "Microdirecionamento manipulativo",
        solution:
          "A NeoVoto é apoio à decisão estratégica — alocação de recursos, prioridades de agenda, formação de alianças. Não produz nem dispara mensagens a eleitores.",
      },
      {
        problem: "Opacidade",
        solution:
          "Cada número exibido é rastreável até a fonte, o período e o método. Relatórios trazem ficha técnica.",
      },
    ],
    lgpdTitle: "Enquadramento na LGPD",
    lgpdPoints: [
      "Opinião política é dado pessoal sensível (art. 11). A NeoVoto não trata dados sensíveis de cidadãos identificados ou identificáveis.",
      "Dados de agentes públicos (candidaturas, mandatos, votações) são tratados no interesse público e já são públicos por lei.",
      "Usuários da plataforma (equipes de campanha e de gabinete) têm base legal de execução de contrato, com direitos de acesso, correção e eliminação.",
      "Registro de operações, minimização, retenção limitada e relatório de impacto (RIPD) fazem parte do produto.",
      "Conformidade com as resoluções do TSE sobre uso de IA e enfrentamento à desinformação: a plataforma não gera deepfakes nem conteúdo sintético de pessoas.",
    ],
  },
  auth: {
    signInTitle: "Entrar na NeoVoto",
    signUpTitle: "Criar conta",
    email: "E-mail",
    password: "Senha",
    org: "Organização",
    signInCta: "Entrar",
    signUpCta: "Criar conta",
    noAccount: "Não tem conta?",
    hasAccount: "Já tem conta?",
    authNotice:
      "Autenticação por sessão assinada. O cadastro aberto é liberado após a fase de fundação.",
  },
  footer: {
    rights: "Todos os direitos reservados.",
    builtWith: "Somente dados abertos oficiais. Feito em conformidade com a LGPD.",
    sourcesLink: "Fontes de dados",
    ethicsLink: "Ética & LGPD",
  },
} as const;

export default pt;

/** Widen literais (string/number/tuplas) para que outros idiomas satisfaçam o mesmo formato. */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof pt>;
