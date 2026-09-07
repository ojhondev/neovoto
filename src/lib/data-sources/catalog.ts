/**
 * Catálogo das fontes de dados abertos oficiais que a NeoVoto usa.
 * Regra do produto: SOMENTE dados abertos oficiais. Sem raspagem de redes sociais,
 * sem brokers de dados, sem bases de terceiros. Detalhes em docs/FONTES-DE-DADOS.md.
 */
export type AccessKind = "REST JSON" | "CKAN / arquivos" | "REST XML/JSON" | "Arquivos CSV";

export type DataSource = {
  id: string;
  name: string;
  org: string;
  base: string;
  access: AccessKind;
  license: string;
  feeds: string[];
  usedBy: string[];
  status: "planejado" | "prototipado" | "conectado";
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: "tse-dados-abertos",
    name: "Portal de Dados Abertos do TSE",
    org: "Tribunal Superior Eleitoral",
    base: "https://dadosabertos.tse.jus.br",
    access: "CKAN / arquivos",
    license: "Dados abertos (LAI) — uso livre com citação da fonte",
    feeds: [
      "Resultados por município, zona e seção (1º e 2º turnos)",
      "Candidatos: coligações, bens, redes, propostas de governo",
      "Prestação de contas: receitas, despesas, fundo partidário",
      "Perfil do eleitorado por município/zona (agregado)",
      "Filiados a partidos (agregado)",
    ],
    usedBy: ["Mapa de Influência", "Mapa de Calor", "Matriz Ideológica", "Cenários", "Coligações", "Mapa de Propostas"],
    status: "prototipado",
  },
  {
    id: "tse-divulga",
    name: "Divulgação de Resultados (apuração)",
    org: "Tribunal Superior Eleitoral",
    base: "https://resultados.tse.jus.br",
    access: "Arquivos CSV",
    license: "Dados abertos (LAI)",
    feeds: ["Boletins de urna e totalização em tempo de apuração"],
    usedBy: ["Mapa de Calor", "Cenários"],
    status: "planejado",
  },
  {
    id: "ibge-localidades",
    name: "IBGE — Localidades e Malhas",
    org: "Instituto Brasileiro de Geografia e Estatística",
    base: "https://servicodados.ibge.gov.br/api/v1/localidades",
    access: "REST JSON",
    license: "Dados abertos — uso livre",
    feeds: [
      "Hierarquia UF / mesorregião / microrregião / município / distrito",
      "Malhas geográficas (GeoJSON/TopoJSON) por recorte",
    ],
    usedBy: ["Matriz Ideológica", "Mapa de Calor", "Mapa de Influência"],
    status: "prototipado",
  },
  {
    id: "ibge-agregados",
    name: "IBGE — Agregados (SIDRA)",
    org: "Instituto Brasileiro de Geografia e Estatística",
    base: "https://servicodados.ibge.gov.br/api/v3/agregados",
    access: "REST JSON",
    license: "Dados abertos — uso livre",
    feeds: [
      "Censo Demográfico: população, renda, escolaridade, urbanização",
      "Projeções populacionais",
      "PIB municipal, PNAD Contínua (recortes agregados)",
    ],
    usedBy: ["Matriz Ideológica", "Cenários", "Mapa de Propostas"],
    status: "planejado",
  },
  {
    id: "camara",
    name: "Dados Abertos da Câmara dos Deputados",
    org: "Câmara dos Deputados",
    base: "https://dadosabertos.camara.leg.br/api/v2",
    access: "REST JSON",
    license: "Dados abertos — uso livre",
    feeds: [
      "Deputados, partidos, blocos, frentes parlamentares",
      "Proposições: temas, palavras-chave, autoria, tramitação",
      "Votações: orientação de bancada e votos individuais",
    ],
    usedBy: ["Mapa de Influência", "Mapa de Propostas"],
    status: "prototipado",
  },
  {
    id: "senado",
    name: "Dados Abertos do Senado Federal",
    org: "Senado Federal",
    base: "https://legis.senado.leg.br/dadosabertos",
    access: "REST XML/JSON",
    license: "Dados abertos — uso livre",
    feeds: [
      "Senadores em exercício e histórico",
      "Matérias legislativas e tramitação",
      "Votações nominais",
    ],
    usedBy: ["Mapa de Influência", "Mapa de Propostas"],
    status: "prototipado",
  },
  {
    id: "portal-transparencia",
    name: "Portal da Transparência",
    org: "Controladoria-Geral da União",
    base: "https://api.portaldatransparencia.gov.br",
    access: "REST JSON",
    license: "Dados abertos — uso livre (requer chave gratuita)",
    feeds: [
      "Emendas parlamentares e execução",
      "Transferências a municípios",
      "Recursos recebidos por ente federativo",
    ],
    usedBy: ["Mapa de Influência", "Mapa de Propostas", "Cenários"],
    status: "planejado",
  },
];
