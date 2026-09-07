/**
 * Taxonomia de temas do Radar de Posicionamento (Fase 1).
 * Lista FECHADA e versionada — cada item da agenda legislativa é classificado
 * num ou mais temas por correspondência de palavra-chave na ementa.
 *
 * `campo` = qual campo político tende a "puxar" a posição energética sobre o tema
 * (não é juízo de valor — é leitura de disputa). Usado só para dizer se o tema é
 * terreno afim ou de tensão para a candidatura. Editável.
 *
 * Segredo de negócio: os pesos e a curadoria fina ficam na ficha interna.
 */

export const TEMAS_VERSION = "v1-fase1";

export type Campo = "progressista" | "conservador" | "transversal";

export type Tema = {
  id: string;
  label: { pt: string; en: string };
  eixo: "economia" | "social" | "seguranca" | "instituicoes" | "costumes" | "ambiente" | "cotidiano";
  campo: Campo;
  /** termos em minúsculas, sem acento — casados contra a ementa normalizada */
  termos: string[];
};

export const TEMAS: Tema[] = [
  {
    id: "custo-de-vida",
    label: { pt: "Custo de vida e renda", en: "Cost of living and income" },
    eixo: "economia",
    campo: "transversal",
    termos: ["inflacao", "cesta basica", "preco dos alimentos", "salario minimo", "poder de compra", "reajuste", "tarifa", "conta de luz", "energia eletrica", "combustivel", "gasolina", "diesel"],
  },
  {
    id: "impostos",
    label: { pt: "Impostos e reforma tributária", en: "Taxes and tax reform" },
    eixo: "economia",
    campo: "transversal",
    termos: ["imposto", "tributaria", "tributo", "isencao", "imposto de renda", "icms", "iss", "cbs", "ibs", "carga tributaria", "sonegacao"],
  },
  {
    id: "trabalho",
    label: { pt: "Trabalho e emprego", en: "Work and employment" },
    eixo: "economia",
    campo: "transversal",
    termos: ["trabalhista", "emprego", "clt", "carteira assinada", "jornada de trabalho", "app de entrega", "motorista de aplicativo", "terceirizacao", "desemprego", "aposentadoria", "previdencia", "inss"],
  },
  {
    id: "empreendedorismo",
    label: { pt: "Pequeno negócio e empreendedorismo", en: "Small business" },
    eixo: "economia",
    campo: "conservador",
    termos: ["microempreendedor", "mei", "simples nacional", "pequena empresa", "desburocratizacao", "abertura de empresa", "empreendedor", "microcredito"],
  },
  {
    id: "gasto-publico",
    label: { pt: "Gasto público e teto de gastos", en: "Public spending" },
    eixo: "economia",
    campo: "conservador",
    termos: ["teto de gastos", "arcabouco fiscal", "gasto publico", "deficit", "divida publica", "responsabilidade fiscal", "corte de gastos", "privilegios", "supersalario", "penduricalho"],
  },
  {
    id: "saude",
    label: { pt: "Saúde e SUS", en: "Health and public healthcare" },
    eixo: "social",
    campo: "transversal",
    termos: ["saude", "sus", "hospital", "posto de saude", "fila de cirurgia", "medico", "mais medicos", "plano de saude", "medicamento", "farmacia popular", "vacina", "saude mental"],
  },
  {
    id: "educacao",
    label: { pt: "Educação", en: "Education" },
    eixo: "social",
    campo: "transversal",
    termos: ["educacao", "escola", "professor", "creche", "ensino medio", "ensino fundamental", "universidade", "fies", "prouni", "merenda", "analfabetismo", "piso do magisterio"],
  },
  {
    id: "assistencia",
    label: { pt: "Assistência social e transferência de renda", en: "Welfare and cash transfer" },
    eixo: "social",
    campo: "progressista",
    termos: ["bolsa familia", "auxilio", "transferencia de renda", "cadastro unico", "bpc", "loas", "pobreza", "fome", "seguranca alimentar", "vale gas", "tarifa social"],
  },
  {
    id: "moradia",
    label: { pt: "Moradia e habitação", en: "Housing" },
    eixo: "social",
    campo: "progressista",
    termos: ["habitacao", "moradia", "minha casa minha vida", "regularizacao fundiaria", "aluguel", "deficit habitacional", "financiamento habitacional", "favela", "sem-teto"],
  },
  {
    id: "seguranca",
    label: { pt: "Segurança pública", en: "Public safety" },
    eixo: "seguranca",
    campo: "conservador",
    termos: ["seguranca publica", "policia", "policial", "crime", "criminalidade", "homicidio", "faccao", "trafico", "porte de arma", "legitima defesa", "cadeia", "presidio", "reincidencia", "roubo", "furto"],
  },
  {
    id: "drogas",
    label: { pt: "Política de drogas", en: "Drug policy" },
    eixo: "seguranca",
    campo: "transversal",
    termos: ["drogas", "entorpecente", "maconha", "descriminalizacao", "porte para uso", "cracolandia", "dependente quimico", "comunidade terapeutica"],
  },
  {
    id: "instituicoes-stf",
    label: { pt: "STF e equilíbrio entre os Poderes", en: "Supreme Court and separation of powers" },
    eixo: "instituicoes",
    campo: "transversal",
    termos: ["supremo tribunal", "stf", "ministro do supremo", "mandato para ministro", "impeachment de ministro", "foro privilegiado", "ativismo judicial", "decisao monocratica", "cnj", "abuso de autoridade"],
  },
  {
    id: "corrupcao",
    label: { pt: "Corrupção e transparência", en: "Corruption and transparency" },
    eixo: "instituicoes",
    campo: "transversal",
    termos: ["corrupcao", "improbidade", "lavagem de dinheiro", "propina", "transparencia", "acesso a informacao", "emenda parlamentar", "orcamento secreto", "licitacao", "fundo eleitoral"],
  },
  {
    id: "reforma-politica",
    label: { pt: "Reforma política e eleições", en: "Political reform and elections" },
    eixo: "instituicoes",
    campo: "transversal",
    termos: ["reforma politica", "sistema eleitoral", "voto impresso", "urna eletronica", "fidelidade partidaria", "clausula de barreira", "federacao partidaria", "reeleicao", "financiamento de campanha"],
  },
  {
    id: "familia-costumes",
    label: { pt: "Família e costumes", en: "Family and social values" },
    eixo: "costumes",
    campo: "conservador",
    termos: ["familia", "aborto", "vida desde a concepcao", "ideologia de genero", "escola sem partido", "educacao domiciliar", "homeschooling", "religiao", "liberdade religiosa"],
  },
  {
    id: "direitos-lgbt",
    label: { pt: "Direitos LGBTQIA+", en: "LGBTQIA+ rights" },
    eixo: "costumes",
    campo: "progressista",
    termos: ["lgbt", "lgbtqia", "homofobia", "transfobia", "uniao homoafetiva", "identidade de genero", "pessoa trans", "casamento igualitario"],
  },
  {
    id: "mulheres",
    label: { pt: "Direitos das mulheres", en: "Women's rights" },
    eixo: "costumes",
    campo: "progressista",
    termos: ["violencia domestica", "feminicidio", "maria da penha", "assedio", "igualdade salarial", "licenca maternidade", "creche", "aborto legal", "pensao alimenticia"],
  },
  {
    id: "meio-ambiente",
    label: { pt: "Meio ambiente e clima", en: "Environment and climate" },
    eixo: "ambiente",
    campo: "progressista",
    termos: ["meio ambiente", "ambiental", "ambientalista", "desmatamento", "amazonia", "clima", "climatica", "aquecimento global", "licenciamento ambiental", "unidade de conservacao", "energia renovavel", "credito de carbono", "queimada", "enchente", "desastre natural", "sustentabilidade"],
  },
  {
    id: "agro",
    label: { pt: "Agropecuária e produção rural", en: "Agribusiness" },
    eixo: "ambiente",
    campo: "conservador",
    termos: ["agronegocio", "agropecuaria", "produtor rural", "agricultura familiar", "marco temporal", "terra indigena", "credito rural", "defensivo agricola", "agrotoxico", "seguro rural", "cpr"],
  },
  {
    id: "infraestrutura",
    label: { pt: "Infraestrutura e mobilidade", en: "Infrastructure and mobility" },
    eixo: "cotidiano",
    campo: "transversal",
    termos: ["rodovia", "estrada", "pavimentacao", "saneamento", "esgoto", "agua tratada", "transporte publico", "passagem de onibus", "mobilidade urbana", "ferrovia", "porto", "aeroporto", "internet", "banda larga"],
  },
  {
    id: "tecnologia",
    label: { pt: "Tecnologia, IA e redes", en: "Technology, AI and platforms" },
    eixo: "cotidiano",
    campo: "transversal",
    termos: ["inteligencia artificial", "big tech", "rede social", "plataforma digital", "fake news", "desinformacao", "regulacao das plataformas", "marco civil", "lgpd", "protecao de dados", "golpe", "estelionato digital"],
  },
  {
    id: "animais",
    label: { pt: "Proteção animal", en: "Animal protection" },
    eixo: "cotidiano",
    campo: "transversal",
    termos: ["protecao animal", "maus-tratos", "abandono de animais", "castracao", "causa animal", "bem-estar animal"],
  },
];

/** normaliza para casar termos: minúsculas, sem acento */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** classifica um texto (ementa/título) nos temas cujos termos aparecem. */
export function classificarTexto(texto: string): string[] {
  const n = normalizarTexto(texto);
  const ids: string[] = [];
  for (const t of TEMAS) {
    if (t.termos.some((termo) => n.includes(termo))) ids.push(t.id);
  }
  return ids;
}

export function getTema(id: string): Tema | undefined {
  return TEMAS.find((t) => t.id === id);
}
