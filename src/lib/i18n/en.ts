import type { Dictionary } from "./pt";

const en: Dictionary = {
  common: {
    appName: "NeoVoto",
    tagline: "Evidence-based political intelligence",
    enter: "Sign in",
    createAccount: "Create account",
    requestDemo: "Request a demo",
    backToSite: "Back to site",
    dashboard: "Dashboard",
    logout: "Sign out",
    soon: "Soon",
    preview: "Preview",
    dataSources: "Data sources",
    methodology: "Methodology",
    lastUpdate: "Last updated",
    mockNotice:
      "Illustrative data. Official integrations (TSE, IBGE, Chamber, Senate) are connected in the next phase.",
  },
  nav: {
    product: "Product",
    tools: "Tools",
    ethics: "Ethics & privacy",
    method: "Method",
    pricing: "Pricing",
  },
  announce:
    "NeoVoto — analytics for electoral and governing decisions. Official open data only.",
  landing: {
    heroKicker: "Political intelligence platform",
    heroTitle: "Electoral and governing decisions grounded in evidence, not hunches",
    heroSub:
      "NeoVoto correlates official public data to help parties, campaigns and mandates read territory, electorate and scenarios — within Brazil's data-protection law and without Cambridge Analytica's mistakes.",
    heroPrimary: "Request a demo",
    heroSecondary: "See the tools",
    scrollCue: "Scroll to continue",
    trustTitle: "Built on three non-negotiable commitments",
    trust: [
      {
        title: "Official open data only",
        body:
          "Electoral court (TSE), statistics bureau (IBGE), Chamber of Deputies, Federal Senate and the federal transparency portal. No social-media scraping, no third-party data brokers.",
      },
      {
        title: "Privacy by design, end to end",
        body:
          "Political opinion is sensitive data under Brazilian law. NeoVoto works at aggregate territorial level and on public-official data — never psychographic profiles of citizens.",
      },
      {
        title: "Methodological transparency",
        body:
          "Every projection shows its sources, its time window and its assumptions. No black box: the scenario is auditable.",
      },
    ],
    toolsTitle: "Six tools, one shared map of reality",
    toolsSub:
      "Every tool starts from the same official data and talks to the others. You start with territory and arrive at a scenario.",
    manifestoTitle: "What NeoVoto does not do",
    manifestoSub:
      "The Cambridge Analytica case defined our product, by contrast.",
    manifestoPoints: [
      "It does not build psychological profiles of individual voters.",
      "It does not collect social-media data on private individuals.",
      "It does not buy, enrich or resell personal databases.",
      "It does not generate deceptive propaganda or synthetic media of people.",
      "It does not do manipulative microtargeting based on vulnerabilities.",
    ],
    manifestoCta: "Read the manifesto and the privacy policy",
    ctaTitle: "Ready to decide with evidence?",
    ctaBody: "Book a demo using data from your state or municipality.",
  },
  tools: {
    influenceMap: {
      name: "Influence Map",
      short: "Who moves the electorate in a territory and how the forces connect.",
      desc:
        "A network of political actors — leaders, mandates, parties and coalitions — sized by historical vote, territorial reach and formal ties. Built on TSE results and official compositions.",
    },
    ideologicalMatrix: {
      name: "Ideological Matrix by Region",
      short: "How each region sits on thematic axes, inferred from electoral behaviour.",
      desc:
        "Relative position of municipalities and regions on axes (for example economic and social values), estimated from aggregate party vote and IBGE socioeconomic indicators. No inference about individuals.",
    },
    influenceHeatmap: {
      name: "Influence Heatmap",
      short: "Where the campaign or coalition is strong, weak or contested.",
      desc:
        "Geographic intensity of performance by electoral zone and municipality, with TSE historical series filtered by office and round. Surfaces pockets of growth and of loss.",
    },
    proposalMap: {
      name: "Proposal Map",
      short: "Matches the campaign's proposals against the issues that move each electorate.",
      desc:
        "Maps government proposals (filed with the TSE) and issues on the legislative agenda (Chamber and Senate), aligning them with observable regional priorities. Flags gaps and overlaps.",
    },
    scenarios: {
      name: "Statistical Scenarios",
      short: "An engine that correlates data to approximate results, driven by your objective.",
      desc:
        "Probabilistic models combining electoral history, socioeconomic context and coalition composition to estimate result ranges under different assumptions. Every scenario states its sources and its margin.",
    },
    coalitions: {
      name: "Coalitions",
      short: "Simulates compositions and measures each alliance's effect on the ground.",
      desc:
        "Compares possible coalitions and federations using broadcast time, party fund, municipal footholds and historical party vote. Shows marginal gain and base overlap.",
    },
  },
  toolPage: {
    overview: "Overview",
    howItWorks: "How it works",
    inputs: "Data inputs",
    outputs: "What you get",
    status: "Status",
    statusStub:
      "Structure and visualisation ready with illustrative data. Official API wiring lands in the next phase.",
  },
  ethics: {
    title: "Ethics, privacy and the Cambridge Analytica lesson",
    intro:
      "NeoVoto was designed around one question: how do you do political intelligence without repeating what made Cambridge Analytica a democratic scandal?",
    caseTitle: "What went wrong in the Cambridge Analytica case",
    casePoints: [
      "Data on tens of millions of people was collected without informed consent, through an app presented as an academic quiz.",
      "That data fed individual psychographic profiles used to microtarget messages exploiting emotional vulnerabilities.",
      "There was no transparency: voters did not know they were being targeted, or why.",
      "The combined effect of hidden profiling and disinformation was described as a 'democratic catastrophe'.",
    ],
    answerTitle: "How NeoVoto answers each point",
    answer: [
      {
        problem: "Collection without consent",
        solution:
          "We use only open data published by official bodies under the freedom-of-information law. No collection of data on private individuals.",
      },
      {
        problem: "Individual psychographic profiles",
        solution:
          "The smallest unit of analysis is territorial (precinct, zone, neighbourhood, municipality). We never model an individual's personality.",
      },
      {
        problem: "Manipulative microtargeting",
        solution:
          "NeoVoto is strategic decision support — resource allocation, agenda priorities, alliance-building. It neither produces nor sends messages to voters.",
      },
      {
        problem: "Opacity",
        solution:
          "Every figure shown is traceable to its source, its period and its method. Reports carry a technical sheet.",
      },
    ],
    lgpdTitle: "Data-protection framing (LGPD)",
    lgpdPoints: [
      "Political opinion is sensitive personal data (art. 11). NeoVoto does not process sensitive data of identified or identifiable citizens.",
      "Public-official data (candidacies, mandates, votes) is processed in the public interest and is already public by law.",
      "Platform users (campaign and cabinet teams) are covered by the contract-performance legal basis, with rights of access, correction and erasure.",
      "Operation logging, data minimisation, limited retention and a data-protection impact assessment are part of the product.",
      "Compliance with the electoral court's rules on AI use and disinformation: the platform generates no deepfakes and no synthetic media of people.",
    ],
  },
  auth: {
    signInTitle: "Sign in to NeoVoto",
    signUpTitle: "Create account",
    email: "Email",
    password: "Password",
    org: "Organisation",
    signInCta: "Sign in",
    signUpCta: "Create account",
    noAccount: "No account?",
    hasAccount: "Already have an account?",
    authNotice:
      "Signed-session authentication. Open sign-up opens after the foundation phase.",
  },
  footer: {
    rights: "All rights reserved.",
    builtWith: "Official open data only. Built for LGPD compliance.",
    sourcesLink: "Data sources",
    ethicsLink: "Ethics & privacy",
  },
};

export default en;
