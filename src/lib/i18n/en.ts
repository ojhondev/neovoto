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
    globeTitleA: "Political intelligence, end to end.",
    globeTitleB: "One platform.",
    globeSub:
      "NeoVoto connects pre-campaign, campaign and government in one place — the same official data follows every decision that depends on it.",
    pillarsKicker: "One cycle, three moments",
    pillarsTitle: "From reading the territory to holding the mandate — without switching tools",
    pillars: [
      {
        tab: "Pre-campaign",
        heading: "See the territory before you decide the candidacy",
        body:
          "Territorial profile, ideological matrix by region and influence map from official results. Where the base is, where the room is, who to talk to.",
        cta: "See the territorial profile",
      },
      {
        tab: "Campaign",
        heading: "Put resources where they change the result",
        body:
          "Heatmap by zone, coalition simulation and statistical scenarios driven by your objective. Every projection states its sources and its margin.",
        cta: "Open the scenarios",
      },
      {
        tab: "Government",
        heading: "Keep the mandate connected to the demand that elected it",
        body:
          "A proposal map crossing what was promised, what is on the legislative agenda and what each region prioritises. Gaps and overlaps in one place.",
        cta: "Open the proposal map",
      },
    ],
    marqueeLine:
      "With NeoVoto it all comes together: official data becomes territory, territory becomes strategy, strategy becomes a decision.",
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
  dash: {
    emptyTitle: "Start by naming the candidate",
    emptyBody:
      "NeoVoto works around one politician. Run the onboarding so the platform pulls the official data and calibrates the six tools.",
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
    toolsForCandidate: "The six tools, calibrated for {name}",
  },
  onboarding: {
    step: "Step",
    of: "of",
    title: "Who are you going to analyse?",
    sub: "Type the name of a sitting federal deputy or senator. NeoVoto pulls that person's official public data to calibrate the tools.",
    searchPlaceholder: "Candidate or member's name…",
    searching: "Querying the Chamber and the Senate…",
    noResults: "Nothing found in the official sources. Try another name.",
    hint: "Sources: open data from the Chamber of Deputies and the Federal Senate.",
    onlyFederal:
      "In this phase only sitting federal members are available. Mayors, councillors, state deputies and pre-candidacies come in Phase 2 (TSE ingestion).",
    selected: "Selected",
    change: "change",
    objectiveTitle: "What is the objective?",
    objectiveSub: "The platform's scenarios and priorities are computed against the objective.",
    objectives: [
      { value: "eleicao", label: "Win the next election" },
      { value: "bancada", label: "Grow the caucus / coalition" },
      { value: "governo", label: "Governability during the mandate" },
      { value: "avaliando", label: "Still assessing the landscape" },
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
