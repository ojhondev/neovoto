import type { Dictionary } from "./pt";

const en: Dictionary = {
  common: {
    appName: "NeoVoto",
    tagline: "The intelligence that wins elections",
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
    method: "Manifesto",
    pricing: "Pricing",
  },
  announce:
    "NeoVoto — the electoral intelligence that helps candidates win. Official open data only, within Brazil's data-protection law.",
  landing: {
    heroKicker: "The intelligence that wins elections",
    heroTitle: "Electoral Intelligence",
    heroTitleAccent: "with data and AI",
    heroSub:
      "NeoVoto turns official data into campaign advantage: where your votes are, where the opponent is weak, who to ally with and what to say in each region to win the election — from councillor to president.",
    heroPrimary: "Request a demo",
    heroSecondary: "See the tools",
    scrollCue: "Scroll to continue",
    trustTitle: "A powerful weapon — and inside the law",
    trust: [
      {
        title: "Official data only: no baggage",
        body:
          "TSE, IBGE, Chamber, Senate, the federal transparency portal. No social-media scraping, no third-party data brokers. It's public information used intelligently.",
      },
      {
        title: "Territory, never the voter",
        body:
          "NeoVoto analyses precinct, neighbourhood, municipality and region — never a person's psychological profile. It's the opposite of what sank Cambridge Analytica: power without the scandal.",
      },
      {
        title: "Every figure has a defence",
        body:
          "Every analysis names its source, its window and its margin. You walk into the campaign meeting with evidence, not a hunch — and can hold the decision in front of the candidate.",
      },
    ],
    globeTitleA: "Electoral intelligence",
    globeTitleB: "with data and AI.",
    globeSub:
      "From the first map to the vote count, NeoVoto works toward one goal: more votes in your ballot box than in the opponent's.",
    pillarsKicker: "How NeoVoto gets you elected",
    pillarsTitle: "Read the ground, strike where it's decided, and don't lose what you won",
    pillars: [
      {
        tab: "Read the ground",
        heading: "Know where your votes are — and where the opponent is strong",
        body:
          "Influence map, ideological matrix by region and the Territorial Electoral Strength Index from official results. Before you spend the first real, you know the playing field.",
        cta: "See the Territorial Strength Index",
      },
      {
        tab: "Strike where it's decided",
        heading: "Concentrate time, money and stage where the election turns",
        body:
          "The heatmap shows where each vote costs less; the scenarios show what's missing to win; the coalition simulation shows which alliance elects you and which one only splits the stage.",
        cta: "Open the scenarios",
      },
      {
        tab: "Hold the mandate",
        heading: "After winning, don't lose the base that elected you",
        body:
          "The proposal map crosses what you promised, what's on the legislative agenda and what each region demands. The plus that turns a win into re-election.",
        cta: "Open the proposal map",
      },
    ],
    marqueeLine:
      "Official data becomes territory. Territory becomes a target. A target becomes a vote. A vote becomes a win.",
    marqueeRowA: [
      "TSE results",
      "IBGE meshes",
      "Chamber votes",
      "Senate bills",
      "Coalitions and federations",
      "Government proposals",
      "Electorate profile",
    ],
    marqueeRowB: [
      "Heatmap by zone",
      "Probabilistic scenarios",
      "Marginal gain of an alliance",
      "Parliamentary amendments",
      "Socioeconomic indicators",
      "Parliamentary fronts",
      "Historical series",
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
    ctaTitle: "Ready to play to win?",
    ctaBody: "Book a demo with the data of your race — your municipality or your state.",
    testimonialsKicker: "Who uses it",
    testimonialsTitle: "Campaigns that stopped betting in the dark",
    testimonials: [
      {
        quote:
          "We cut spending in a city that was already ours and threw everything at three micro-regions nobody had on the radar. That's where the election turned.",
        name: "Campaign coordination",
        role: "State race · Southeast",
      },
      {
        quote:
          "The coalition simulation showed the real vote gain of each alliance. We sat at the negotiating table with a number — and closed the ticket that would win.",
        name: "Party strategy",
        role: "State party committee",
      },
      {
        quote:
          "The scenario told us exactly how many votes were missing and which regions to find them in. The candidate's agenda became a mirror of the map.",
        name: "Campaign strategist",
        role: "City hall · capital",
      },
      {
        quote:
          "After winning, the proposal map kept the base that got us there. Winning was half of it; not losing the territory was the other half.",
        name: "Chief of staff",
        role: "Chamber of Deputies",
      },
    ],
    testimonialsNote:
      "Illustrative testimonials from usage profiles during development. Named cases arrive with the launch.",
    faqKicker: "FAQ",
    faqTitle: "What people usually ask before starting",
    faq: [
      {
        q: "Where does the data come from?",
        a: "Only from official open sources: the electoral court (TSE), the statistics bureau (IBGE), the Chamber of Deputies, the Federal Senate and the federal transparency portal. No social-media scraping, no third-party data brokers. Every analysis shows its source and time window.",
      },
      {
        q: "Does NeoVoto profile voters?",
        a: "No. The smallest unit of analysis is territorial — precinct, zone, neighbourhood, municipality, region. We never model a citizen's personality or behaviour. Political opinion is sensitive data under Brazilian law and the platform processes no sensitive data of private individuals.",
      },
      {
        q: "How is this different from an opinion poll?",
        a: "NeoVoto is not an opinion poll — it complements one with observable data (ballot results, socioeconomic context, coalition composition). Outputs support internal decision-making and should not be published as voting intention.",
      },
      {
        q: "Do I need to understand statistics to use it?",
        a: "No. You name the candidate and the objective; the platform returns the map, the ranking and the recommendation. The methodology is the NeoVoto engine's job — every screen ends in a clear decision.",
      },
      {
        q: "Which election and which office does it cover?",
        a: "IBGE territory and context for all of Brazil. Candidate records for every office (president to councillor) via the TSE mirror. The vote-by-municipality layer and precinct granularity arrive in the next phases.",
      },
      {
        q: "Is it secure? What about privacy law?",
        a: "Signed-session authentication, operation logging (art. 37), data minimisation and limited retention. Platform users are covered by the contract-performance legal basis, with rights of access, correction and erasure.",
      },
    ],
  },
  pricing: {
    kicker: "Plans & packages",
    title: "Choose by the size of the race",
    sub: "Pricing to be defined. For now the plans are in evaluation mode — talk to us about a pilot.",
    perMonth: "/mo",
    custom: "on request",
    mock: "Illustrative figures — the pricing policy will be announced at launch.",
    ctaFree: "Start evaluating",
    ctaPaid: "Talk to us",
    ctaEnterprise: "Talk to sales",
    mostPopular: "Most chosen",
    plans: [
      {
        name: "Listen",
        price: "R$ 0",
        for: "For a pre-candidacy mapping the territory before deciding.",
        includes: [
          "1 candidate under analysis",
          "Heatmap (IFET) and territorial profile",
          "IBGE data and TSE candidate records",
          "1 user",
        ],
      },
      {
        name: "Campaign",
        price: "R$ 2,900",
        for: "For municipal and state campaigns running the operation.",
        includes: [
          "Everything in Listen",
          "All 6 tools with the candidate's data",
          "Scenarios and coalition simulation",
          "Report export with technical sheet",
          "Up to 5 users",
        ],
      },
      {
        name: "Majority race",
        price: "R$ 7,900",
        for: "For majority races and party coordination.",
        includes: [
          "Everything in Campaign",
          "Multiple candidates and comparison",
          "Vote-by-municipality and precinct layer",
          "Priority support and assisted onboarding",
          "Unlimited users",
        ],
      },
      {
        name: "Party",
        price: "on request",
        for: "For federations and national committees with many candidacies.",
        includes: [
          "Everything in Majority race",
          "Consolidated dashboard by state and by candidacy",
          "Integration with the party's workflow",
          "Dedicated contract and SLA",
        ],
      },
    ],
    compareTitle: "Compare the plans",
    compareRows: [
      { feature: "Candidates under analysis", vals: ["1", "1", "several", "unlimited"] },
      { feature: "Heatmap (IFET)", vals: ["yes", "yes", "yes", "yes"] },
      { feature: "Influence Map", vals: ["preview", "yes", "yes", "yes"] },
      { feature: "Ideological Matrix by Region", vals: ["—", "yes", "yes", "yes"] },
      { feature: "Proposal Map", vals: ["—", "yes", "yes", "yes"] },
      { feature: "Statistical Scenarios", vals: ["—", "yes", "yes", "yes"] },
      { feature: "Coalitions", vals: ["—", "yes", "yes", "yes"] },
      { feature: "Vote by municipality", vals: ["—", "—", "yes", "yes"] },
      { feature: "Precinct granularity", vals: ["—", "—", "yes", "yes"] },
      { feature: "Report export", vals: ["—", "yes", "yes", "yes"] },
      { feature: "Candidate comparison", vals: ["—", "—", "yes", "yes"] },
      { feature: "Consolidated dashboard by state", vals: ["—", "—", "—", "yes"] },
      { feature: "Users", vals: ["1", "5", "unlimited", "unlimited"] },
      { feature: "Support", vals: ["community", "email", "priority", "dedicated SLA"] },
    ],
  },
  tools: {
    influenceMap: {
      name: "Influence Map",
      short: "Who moves the vote in your territory — and where the opponent's network holds.",
      desc:
        "A network of political actors — leaders, mandates, parties and coalitions — sized by historical vote, territorial reach and formal ties. Shows which pocket of vote depends on whom and where the opponent's structure is fragile. Built on TSE results and official compositions.",
    },
    ideologicalMatrix: {
      name: "Ideological Matrix by Region",
      short: "What each region wants to hear — the tone that wins votes there and the one that loses them.",
      desc:
        "Relative position of municipalities and regions on axes (for example economic and social values), estimated from aggregate party vote and IBGE socioeconomic indicators. Guides how the message is framed by region. No inference about individuals.",
    },
    influenceHeatmap: {
      name: "Influence Heatmap",
      short: "Where each vote costs less — that's where the campaign concentrates time, money and bodies.",
      desc:
        "Geographic intensity of performance and of opportunity by electoral zone and municipality, with TSE historical series filtered by office and round. Separates what's already won, what's a sure loss and what's decided by effort — so the campaign lands where it turns into a result.",
    },
    proposalMap: {
      name: "Proposal Map",
      short: "The banners that move each electorate — and the ones you haven't raised yet.",
      desc:
        "Maps government proposals (filed with the TSE) and issues on the legislative agenda (Chamber and Senate), aligning them with observable regional priorities. Flags the promise missing in each place and where the opponent already owns the issue.",
    },
    scenarios: {
      name: "Statistical Scenarios",
      short: "How much is missing for you to win — and what moves the needle fastest.",
      desc:
        "From your declared objective, NeoVoto's engine combines electoral history, socioeconomic context and coalition composition to estimate result ranges and the path to a majority. Every scenario shows the sources feeding it and the uncertainty of the estimate.",
    },
    coalitions: {
      name: "Coalitions",
      short: "Which alliance elects you and which one only splits the stage.",
      desc:
        "Compares possible coalitions and federations using broadcast time, party fund, municipal footholds and historical party vote. Shows the real vote gain of each composition, base overlap and what each partner costs.",
    },
  },
  maps: {
    needCandidate: "Select a candidate in the onboarding to load their territory.",
    goOnboarding: "Run the onboarding",
    layerElectoral: "{ano} votes · {cargo}",
    layerPopulation: "population — 2022 Census (IBGE)",
    electoralActive:
      "Electoral layer active: {name}'s vote by municipality ({ano}), via brasil.io.",
    electoralPending:
      "Showing the real territorial base (population, 2022 Census). The candidate's vote by municipality lands in Phase 2.5 (Base dos Dados ingestion) — see docs/DADOS-TSE.md.",
    electoralThrottled:
      "This candidate's vote by municipality hasn't loaded yet — the source rate-limited the requests. Showing the territorial base (population). Try reloading in a few minutes.",
    retryVotacao: "Reload the vote",
    topMunicipios: "Largest municipalities",
    interact: "Hover the municipalities; click for the breakdown; scroll and drag to navigate.",
    inhabitants: "inhab.",
    votes: "votes",
  },
  ifet: {
    name: "Territorial Electoral Strength Index",
    tag: "IFET",
    intro:
      "Each municipality gets a 0–100 strategic-priority score for {name}, from the official territorial context. The map is coloured by this index.",
    layerLabel: "IFET (0–100)",
    score: "IFET",
    pillars: "Pillars",
    pesoEleitoral: "Electoral weight",
    perfilEconomico: "Economic profile",
    disputabilidade: "Contestability",
    pesoEleitoralHint: "How much vote is at stake (population).",
    perfilEconomicoHint: "The territory's level of economic development (GDP per capita).",
    disputabilidadeHint: "How volatile / winnable the electorate tends to be.",
    quadrantsTitle: "Strategic quadrants",
    ranking: "Municipalities by IFET",
    clickHint: "Click a municipality on the map to see its sheet.",
    selected: "Selected municipality",
    pibPerCapita: "GDP per capita",
    fichaTitle: "Technical sheet",
    version: "Index version",
    weights: "Pillar weights",
    sources: "Sources",
    pending: "Layers coming in the next versions",
    weight0: "weight 0 in this version",
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
  dash: {
    emptyTitle: "Start with the candidate who's running",
    emptyBody:
      "NeoVoto works around one candidacy and one objective: winning. Run the onboarding so the platform pulls the official data and calibrates the six tools for your race.",
    emptyCta: "Run the onboarding",
    objectiveLabel: "Objective",
    profile: "Official profile",
    legislative: "Legislative activity",
    fronts: "Parliamentary fronts",
    territory: "Territory",
    propositions: "propositions",
    withSummary: "with a summary",
    recent: "Recently filed",
    municipalities: "municipalities",
    region: "Region",
    situation: "Status",
    education: "Education",
    born: "Born",
    openTool: "Open tool",
    changeCandidate: "Change candidate",
    refreshedAt: "Official data refreshed on",
    sourcesNote:
      "Profile and activity: Chamber / Senate open data. Territory: IBGE. Electoral results land in Phase 2.",
    toolsForCandidate: "The six tools, calibrated to elect {name}",
  },
  onboarding: {
    step: "Step",
    of: "of",
    title: "Who are you going to elect?",
    sub: "Type the candidate's name. NeoVoto pulls that person's official public data to calibrate the tools around winning.",
    searchPlaceholder: "Candidate or member's name…",
    searching: "Querying the Chamber and the Senate…",
    noResults: "Nothing found in the Chamber or the Senate. Try the all-offices search below.",
    hint: "Chamber and Senate: current federal mandate. All offices: TSE mirror (brasil.io), 1996–2022.",
    onlyFederal: "",
    allOfficesCta: "Search every office (mayor, councillor, governor, state deputy…)",
    allOfficesSearching: "Querying the TSE (brasil.io)…",
    allOfficesThrottled:
      "The TSE source (brasil.io) is rate-limiting requests right now — the free tier is restrictive. Try again in a few minutes; the federal members above are already available.",
    allOfficesEmpty: "No candidate by that name in the 1996–2022 elections.",
    selected: "Selected",
    change: "change",
    objectiveTitle: "What is the objective of the race?",
    objectiveSub: "The platform's scenarios and priorities are computed against the objective.",
    objectives: [
      { value: "eleicao", label: "Win the election" },
      { value: "bancada", label: "Elect the largest caucus / carry the coalition" },
      { value: "avaliando", label: "Still measuring whether the candidacy is viable" },
      { value: "governo", label: "Hold the base after being elected" },
    ],
    finish: "Finish and open the dashboard",
    creating: "Loading the official data…",
    errorGeneric: "Could not finish. Please try again.",
  },
  auth: {
    signInTitle: "Sign in to NeoVoto",
    signUpTitle: "Create your NeoVoto account",
    signUpSub: "Start with official data — no credit card required.",
    signInSub: "Pick up your candidate analysis where you left off.",
    email: "Email",
    workEmail: "Work email",
    password: "Password",
    org: "Organisation",
    signInCta: "Sign in",
    signUpCta: "Create account",
    or: "OR",
    google: "Continue with Google",
    marketingOptIn: "I want to receive NeoVoto news and research",
    noAccount: "No account?",
    hasAccount: "Already have an account?",
    existingAccount: "Log in to an existing account",
    createAccountLink: "Create an account",
    terms: "By continuing, you agree to NeoVoto's terms of use and privacy policy.",
    panelHeadline: "Six tools on the same official data.",
    panelSources: "TSE · IBGE · Chamber · Senate · CGU",
    authNotice:
      "Signed-session authentication. Open sign-up opens after the foundation phase — for now, explore the dashboard.",
  },
  footer: {
    rights: "All rights reserved.",
    builtWith: "Official open data only. Built for LGPD compliance.",
    sourcesLink: "Data sources",
    ethicsLink: "Ethics & privacy",
  },
};

export default en;
