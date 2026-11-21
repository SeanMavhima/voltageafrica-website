/**
 * Editorial content for VoltageAfrica.
 *
 * Accuracy rules applied throughout:
 *  - Statistics are attributed to a named external source.
 *  - Field research figures come from VoltageAfrica's Community Outreach &
 *    Data Collection Report (Shurugwi, 08 May 2025).
 *  - Anything not yet built is labelled with a status, never stated as done.
 *
 * Every headline and intro the site shows lives here (`copy`) or in the
 * collections below, so a future CMS can map onto this file one-to-one.
 */

/** Headlines use `*text*` to mark the italic accent phrase. */
export const copy = {
  hero: {
    kicker: "Intelligent energy infrastructure · Zimbabwe",
    headline: "Africa’s next grid will be built *from the village up.*",
    body: "VoltageAfrica designs intelligent solar microgrids (generation, storage and the software that runs them) for the communities the national grid has not reached. Our first hub is being prepared in Shurugwi, in Zimbabwe’s Midlands.",
    primaryCta: { label: "Explore the microgrid", href: "#microgrid" },
    secondaryCta: { label: "Read our vision", href: "/vision" },
  },
  challenge: {
    kicker: "The energy access challenge",
    interlude: "When night falls across rural Africa, *opportunity switches off.*",
    body: "Without reliable electricity, children study by candlelight, clinics cannot keep vaccines cold, and small businesses close at dusk. Scarce household income goes on kerosene, candles, firewood and paying someone else to charge a phone.",
    beyond: "Electricity is not the end goal. It is the foundation everything else is built on.",
  },
  approach: {
    kicker: "Our approach",
    headline: "From sunlight to livelihoods, *one connected system.*",
    intro: "A VoltageAfrica microgrid is a complete local power system: it generates, stores, manages and delivers electricity where the national grid does not reach.",
  },
  microgrid: {
    kicker: "The exhibit",
    headline: "Inside a VoltageAfrica *microgrid.*",
    intro: "A working model of a community energy hub. Orbit it, select any part to see what it does, and run a full day to watch solar, storage and demand balance each other.",
    disclaimer: "Conceptual model for explanation only. It does not depict an existing VoltageAfrica installation, and all values are simulated.",
  },
  intelligence: {
    kicker: "Intelligent energy",
    headline: "Energy that *knows itself.*",
    intro: "Generating power is half the job. Keeping a remote microgrid reliable and affordable for years means measuring everything, anticipating demand and catching faults early. That is the software layer we are building toward.",
  },
  productive: {
    kicker: "Productive energy",
    headline: "Energy that *earns its keep.*",
    intro: "A light bulb improves an evening. A pump, a mill or a cold room changes an economy. We design every hub around the businesses and farms it can power, because that is what makes energy access last.",
  },
  future: {
    kicker: "The future of energy",
    headline: "One village today. *A network tomorrow.*",
    intro: "Every hub we build is designed to connect with the next. Over time, many small, intelligent microgrids can work together as a distributed energy network and, eventually, as a virtual power plant.",
  },
  journey: {
    kicker: "Our journey",
    headline: "From an idea to a village, *step by step.*",
    intro: "Research, prototypes, recognition and preparation: the real path VoltageAfrica has taken since 2024, and the milestone we are working toward now.",
  },
  shurugwi: {
    kicker: "The Shurugwi pilot",
    headline: "From vision *to village.*",
    status: "In preparation · not yet operational",
    intro: "Our first pilot hub is planned for Shurugwi, in Zimbabwe’s Midlands Province: a granite-kopje landscape of farming villages where many households still live without grid electricity. It is where our field research began.",
  },
  media: {
    kicker: "Publications, recognition & impact",
    headline: "In the press, *on the record.*",
    intro: "Coverage, awards and reports, each linked to its original source.",
  },
  founder: {
    kicker: "The founder",
    headline: "VoltageAfrica began with a problem that was *not theoretical.*",
    paragraphs: [
      "Sean Mavhima grew up in rural Zimbabwe, where access to electricity, textbooks and digital tools was a daily struggle. The Covid-19 years sharpened his sense of the digital divide in remote areas, and of how much depends on reliable power.",
      "A Mastercard Foundation Scholar at the University of Rwanda, he works where energy, intelligent systems and entrepreneurship meet. VoltageAfrica is his attempt to build the infrastructure he grew up without, designed for the communities that still live without it.",
    ],
    quote: "These challenges ignited a deep drive in me to acquire skills that would allow me to lead change for my people.",
    quoteSource: { label: "Sean Mavhima, in The Herald, 3 May 2025", href: "https://www.heraldonline.co.zw/lighting-the-path-for-africas-future/" },
  },
  principles: {
    kicker: "Our principles",
    headline: "How we *build.*",
    intro: "Six commitments that shape every design decision, from the first site survey to the hundredth hub.",
  },
  contact: {
    kicker: "Contact & partnerships",
    headline: "Let’s build what *comes next.*",
    intro: "We are preparing our first pilot and looking for people and organisations who want to help build intelligent energy infrastructure for rural Africa.",
    audiences: [
      "Energy & infrastructure partners",
      "Technology partners",
      "Development organisations",
      "Investors & funders",
      "Research institutions",
      "Engineers",
      "Rural development organisations",
      "Agricultural partners",
      "Climate innovators",
    ],
  },
};

export type Stat = {
  value: string;
  unit?: string;
  label: string;
  source: string;
  href?: string;
};

export const challengeStats: Stat[] = [
  {
    value: "600",
    unit: "million",
    label: "people in Africa lived without electricity in 2021: 43% of the continent's population.",
    source: "IEA, Africa Energy Outlook 2022",
    href: "https://www.iea.org/reports/africa-energy-outlook-2022/key-findings",
  },
  {
    value: "23.4",
    unit: "%",
    label: "of rural residents in Zimbabwe have access to grid electricity, against 87.4% in urban areas.",
    source: "ZimStat 2022 Population & Housing Census, as reported by DevelopmentAid",
    href: "https://www.developmentaid.org/news-stream/post/189995/electricity-access-in-rural-zimbabwe",
  },
  {
    value: "970",
    unit: "million",
    label: "Africans lack access to clean cooking, relying on wood, charcoal and kerosene.",
    source: "IEA, Africa Energy Outlook 2022",
    href: "https://www.iea.org/reports/africa-energy-outlook-2022/key-findings",
  },
  {
    value: "2.9",
    unit: "million",
    label: "deaths a year worldwide are attributed to household air pollution from solid fuels and kerosene.",
    source: "World Health Organization, 2021 data",
    href: "https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health",
  },
];

export const beyondLighting = [
  { title: "Evening study", body: "Light that lets learning continue after sunset, without candles or kerosene smoke." },
  { title: "Health", body: "Refrigeration for vaccines and medicines, and power for basic clinical equipment." },
  { title: "Water", body: "Pumping and irrigation that turn a single rainy season into year-round growing." },
  { title: "Enterprise", body: "Milling, welding, tailoring, cold storage: the machines that make local income possible." },
  { title: "Connection", body: "Phone charging and mobile money: access to markets, information and family." },
  { title: "Forests", body: "Less pressure on woodland where firewood is the only fuel a household can reach." },
];

export const approach = [
  {
    key: "sun",
    title: "Sun",
    kicker: "The resource",
    body: "Southern Africa receives some of the strongest sunlight on Earth. It is free, local and arrives every day. The job is to capture it well.",
  },
  {
    key: "generation",
    title: "Generation",
    kicker: "Solar array",
    body: "Panels turn sunlight into electricity. Our prototype uses a light-sensor tracker that turns the panels toward the sun through the day to harvest more of it.",
  },
  {
    key: "storage",
    title: "Storage",
    kicker: "Battery bank",
    body: "Daytime surplus is stored in batteries so power is still there at night, when households need it most.",
  },
  {
    key: "intelligence",
    title: "Intelligence",
    kicker: "Monitoring & control",
    body: "Meters and sensors measure what is produced, stored and used. Over time, software learns the community's patterns to keep the system balanced and healthy.",
  },
  {
    key: "distribution",
    title: "Distribution",
    kicker: "Local network",
    body: "A protected low-voltage network carries power from the hub to homes, the school, the clinic and local businesses.",
  },
  {
    key: "community",
    title: "Community",
    kicker: "People & enterprise",
    body: "Households pay for what they use through simple pay-as-you-go. Productive businesses become anchor customers that keep the hub viable.",
  },
] as const;

export type CapabilityStatus = "Prototyped" | "Explored" | "In design" | "Planned" | "Long-term";

export const capabilities: { name: string; status: CapabilityStatus; note: string }[] = [
  { name: "Light-sensor sun tracking", status: "Prototyped", note: "Built and tested on a 4 × 15 W module rig in 2025." },
  { name: "Peer-to-peer energy trading", status: "Explored", note: "Blockchain trading prototype and interface, 2024." },
  { name: "Energy monitoring & smart metering", status: "In design", note: "Specified for the first pilot hub." },
  { name: "Pay-as-you-go via mobile & USSD", status: "In design", note: "Interest validated in community research." },
  { name: "Demand forecasting", status: "Planned", note: "Requires real load data from a live hub." },
  { name: "Storage optimisation", status: "Planned", note: "Charge and discharge scheduling against forecasts." },
  { name: "Predictive maintenance", status: "Planned", note: "Fault detection from inverter and battery telemetry." },
  { name: "Multi-microgrid management", status: "Long-term", note: "One platform operating many hubs." },
];

export const productiveUses = [
  {
    key: "irrigation",
    title: "Irrigation",
    body: "Solar water pumping lets smallholders grow beyond the rainy season and water livestock reliably.",
    enables: "More harvests, less risk",
  },
  {
    key: "milling",
    title: "Agro-processing",
    body: "Grain mills, hullers and oil presses add value to crops locally instead of transporting them to town.",
    enables: "Value stays in the village",
  },
  {
    key: "cold",
    title: "Cold storage",
    body: "Cooling extends the life of produce, milk and fish, so farmers can sell when the price is right.",
    enables: "Less spoilage, better prices",
  },
  {
    key: "business",
    title: "Small enterprise",
    body: "Barbers, tailors, welders, phone-charging and retail shops: daytime loads that use solar power when it is plentiful.",
    enables: "Daytime demand, local jobs",
  },
  {
    key: "institutions",
    title: "Community institutions",
    body: "Schools and clinics need dependable power for lighting, devices, refrigeration and connectivity.",
    enables: "Anchor customers",
  },
];

export const revenueModel = [
  {
    title: "Household energy",
    body: "Pay-as-you-go access for homes. Households in our Shurugwi research indicated they could pay up to about US$10 a month.",
  },
  {
    title: "Productive-use energy",
    body: "Our second revenue stream in development: supplying businesses and agriculture, and offering energy-efficient equipment such as pumps, mills and cold rooms.",
  },
  {
    title: "Institutional contracts",
    body: "Longer-term energy agreements with schools, clinics and public institutions that need reliable power.",
  },
];

export const futureStages = [
  {
    key: "community",
    title: "Community microgrids",
    horizon: "Now: preparing the first pilot",
    body: "Solar, storage and distribution serving a single community. The Shurugwi pilot hub is our first.",
  },
  {
    key: "intelligent",
    title: "Intelligent energy management",
    horizon: "Next",
    body: "Monitoring, metering and forecasting that let each hub run more efficiently and affordably.",
  },
  {
    key: "connected",
    title: "Connected energy assets",
    horizon: "Next phase",
    body: "Batteries, inverters, meters and productive equipment reporting into one platform.",
  },
  {
    key: "network",
    title: "Distributed energy network",
    horizon: "Later",
    body: "Neighbouring microgrids able to share energy, so surplus in one community supports another.",
  },
  {
    key: "vpp",
    title: "Virtual power plant",
    horizon: "Long-term vision",
    body: "Many distributed assets coordinated as one flexible resource that supports the wider grid. This is where we are heading. We do not operate one today.",
  },
] as const;

export type Milestone = {
  date: string;
  sort: string;
  title: string;
  body: string;
  kind: "Build" | "Research" | "Engagement" | "Recognition" | "Programme";
  image?: { src: string; alt: string; position?: string };
  link?: { href: string; label: string };
};

export const milestones: Milestone[] = [
  {
    date: "Sep 2024",
    sort: "2024-09",
    kind: "Build",
    title: "Blockchain energy-trading prototype",
    body: "Early exploration of digitally enabled energy systems: a peer-to-peer trading prototype and interface designed so community members could share surplus solar power. The concept was presented at the ICP Hackathon in Rwanda.",
    image: { src: "/images/milestones/icp-hackathon-rwanda.jpg", alt: "Sean Mavhima presenting the energy-trading concept at the ICP Hackathon in Rwanda", position: "70% 40%" },
  },
  {
    date: "Dec 2024",
    sort: "2024-12",
    kind: "Research",
    title: "Customer interviews with rural households",
    body: "Community research to understand energy needs, lived experience, the cost of firewood and kerosene, and demand for an alternative.",
  },
  {
    date: "Mar 2025",
    sort: "2025-03",
    kind: "Build",
    title: "Hardware prototype built and tested",
    body: "A sun-tracking solar rig: four 15 W modules around a light-dependent-resistor (LDR) sensor module that steers the array toward the strongest light.",
    image: { src: "/images/prototype/tracker-array.jpg", alt: "VoltageAfrica's prototype: four solar modules arranged around a central light-sensor module", position: "50% 50%" },
  },
  {
    date: "May 2025",
    sort: "2025-05",
    kind: "Research",
    title: "Field research in five Shurugwi villages",
    body: "Engagement with Zura, Chinderera, Chinho, Mapako and Madungwe: 23 household interviews, 6 community leaders, and 27 completed surveys.",
  },
  {
    date: "Aug 2025",
    sort: "2025-08",
    kind: "Recognition",
    title: "Green award in Kenya",
    body: "Green Generation Initiative's Africa's Net Green Leader Award, recognising youth-driven climate action through community-based initiatives and clean energy solutions. Nairobi, 15 August 2025.",
    image: { src: "/images/milestones/green-award-nairobi.jpg", alt: "Sean Mavhima receiving the award at the African Youth Bootcamp on Climate in Nairobi", position: "60% 35%" },
    link: { href: "https://tinyurl.com/3nb733hc", label: "Green Generation Initiative" },
  },
  {
    date: "Dec 2025",
    sort: "2025-12",
    kind: "Recognition",
    title: "Rosatom Africa: Global HackAtom",
    body: "Finalist in the first Global HackAtom International Student Championship, after competing at the final in Moscow in September 2025. Recognised by Rosatom Africa on 15 December 2025.",
    image: { src: "/images/milestones/hackatom-stage.jpg", alt: "Team presenting on stage at the Global HackAtom final", position: "72% 55%" },
    link: { href: "https://www.facebook.com/share/p/1AXBa6ouSn/", label: "Rosatom Africa" },
  },
  {
    date: "Apr 2026",
    sort: "2026-04",
    kind: "Recognition",
    title: "BRICS+ Youth Innovation Summit: 2nd Place",
    body: "Second place in Sustainable Development and Green Solutions at the BRICS+ Youth Innovation Summit in Pretoria, South Africa.",
    image: { src: "/images/milestones/brics-summit-pretoria.jpg", alt: "Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit in Pretoria", position: "50% 40%" },
    link: { href: "https://www.heraldonline.co.zw/zim-student-shines-on-global-stage/", label: "The Herald" },
  },
  {
    date: "Jul 2026",
    sort: "2026-07",
    kind: "Programme",
    title: "beVisioneers: The Mercedes-Benz Fellowship",
    body: "Selected for Cohort 4 of the global fellowship for young innovators building planet-positive solutions.",
  },
  {
    date: "Aug 2026",
    sort: "2026-08",
    kind: "Programme",
    title: "UNITAR: Japan–Africa partnership programme",
    body: "Selected for a UNITAR programme on empowering youth and women through Japan–Africa public-private partnership, promoting TICAD9.",
  },
];

export type Publication = {
  outlet: string;
  headline: string;
  date: string;
  category: string;
  description: string;
  href: string;
  image?: { src: string; alt: string };
};

export const publications: Publication[] = [
  {
    outlet: "AfriNextGen Magazine",
    headline: "Sean Mavhima: Innovator and Founder of VoltageAfrica",
    date: "21 April 2026",
    category: "Profile",
    description: "A magazine profile of the founder and the venture's work on intelligent energy access.",
    href: "https://tinyurl.com/42zumjk5",
  },
  {
    outlet: "The Herald / H-Metro · Zimbabwe",
    headline: "Zim student shines on global stage at BRICS+ Youth Innovation Summit 2026",
    date: "17 April 2026",
    category: "News",
    description: "Coverage of the second-place award at the BRICS+ Youth Innovation Summit 2026 in Pretoria, South Africa.",
    href: "https://www.heraldonline.co.zw/zim-student-shines-on-global-stage/",
    image: { src: "/images/milestones/brics-trophy.jpg", alt: "BRICS+ Youth Innovation Summit trophy: Sustainable Development and Green Solutions, 2nd Place" },
  },
  {
    outlet: "Rosatom Africa",
    headline: "Global HackAtom International Student Championship",
    date: "15 December 2025",
    category: "Recognition",
    description: "Finalist recognition at Global HackAtom 2025 for advancing sustainable energy innovation.",
    href: "https://www.facebook.com/share/p/1AXBa6ouSn/",
    image: { src: "/images/milestones/hackatom-certificate.jpg", alt: "Global HackAtom final certificate held by Sean Mavhima" },
  },
  {
    outlet: "Green Generation Initiative · Kenya",
    headline: "Africa's Net Green Leader Award",
    date: "15 August 2025",
    category: "Award",
    description: "Recognised for leadership and impact in advancing environmental sustainability and youth-driven climate action through community-based initiatives and clean energy solutions.",
    href: "https://tinyurl.com/3nb733hc",
    image: { src: "/images/milestones/green-award-nairobi.jpg", alt: "Award presentation in Nairobi" },
  },
  {
    outlet: "Jim Leech Mastercard Foundation Fellowship",
    headline: "2024 Impact Report",
    date: "Published 2025",
    category: "Report",
    description: "Featured as a fellow contributing to leadership, community impact and sustainable development initiatives aligned with clean energy access, youth empowerment and social innovation.",
    href: "https://tinyurl.com/k4feh3n3",
    image: { src: "/images/fellowship/jlmcf-launch.jpg", alt: "Jim Leech Mastercard Foundation Fellowship on Entrepreneurship, Launch stage selection" },
  },
  {
    outlet: "The Herald · Zimbabwe",
    headline: "Lighting the path for Africa's future",
    date: "3 May 2025",
    category: "Feature",
    description: "A feature tracing the founder's path from rural Zimbabwe to the global stages of innovation and leadership.",
    href: "https://www.heraldonline.co.zw/lighting-the-path-for-africas-future/",
    image: { src: "/images/press/herald-2025-pressreader.jpg", alt: "The Herald article 'Lighting the path for Africa's future' as published" },
  },
];

export const principles = [
  { title: "Energy access first", body: "Technology only matters when it reliably serves people." },
  {
    title: "Built for the realities of Africa",
    body: "We design for affordability, heat and dust, patchy connectivity, local maintenance and what communities actually need.",
  },
  {
    title: "Intelligence with purpose",
    body: "We use data, automation and AI only where they improve performance, affordability, reliability or decisions.",
  },
  { title: "Productive communities", body: "Energy should power enterprise, jobs and local productivity, not only light bulbs." },
  {
    title: "Responsible infrastructure",
    body: "Safety, lifecycle impact, maintenance, battery recycling and long-term resilience are part of the design from day one.",
  },
  {
    title: "Built to scale",
    body: "Systems, software and processes that can be replicated and improved from one community to the next.",
  },
];

export const team = [
  { name: "Sean Mavhima", role: "Founder & CEO", country: "Zimbabwe" },
  { name: "Patience Gasaro", role: "Co-Founder & CTO", country: "Rwanda" },
  { name: "Mary Suzane", role: "Marketing Lead", country: "Kenya" },
  { name: "Peace de Joie Agasaro", role: "Community Engagement Lead", country: "Rwanda" },
];

export const shurugwi = {
  villages: ["Zura", "Chinderera", "Chinho", "Mapako", "Madungwe"],
  research: [
    { value: "5", label: "villages engaged through local leadership" },
    { value: "23", label: "household interviews, in person and virtual" },
    { value: "6", label: "community leaders interviewed" },
    { value: "27", label: "surveys completed, of 30 distributed" },
  ],
  heard: [
    "Households said they could pay for energy on a pay-as-you-go basis, at up to about US$10 a month.",
    "Communities prefer a shared, community-owned energy hub to buying individual home systems.",
    "Strong interest in USSD payments, which work on basic phones without data.",
    "Support for clean cooking alongside electricity: firewood dependence is driving deforestation.",
    "Schools visited, including Chinho Primary School, were interested in off-grid solar.",
  ],
  stages: [
    { title: "Community research", status: "Completed", body: "Village engagement, interviews and surveys (May 2025)." },
    { title: "Prototype & validation", status: "Completed", body: "Sun-tracking rig built; design input gathered from the community." },
    { title: "Site & load assessment", status: "Next", body: "Confirm site, solar resource and household and productive demand." },
    { title: "System design & approvals", status: "Upcoming", body: "Engineer the hub; engage the relevant authorities." },
    { title: "Funding & procurement", status: "Upcoming", body: "Secure pilot capital and source equipment." },
    { title: "Build, connect & learn", status: "Upcoming", body: "Install, connect the first users, measure and improve." },
  ],
};

/** Page-level copy: opening of each page, SEO description, and the "on this page" index. */
export type PageKey = "vision" | "technology" | "pilot" | "journey" | "impact" | "about" | "contact";

export const pages: Record<
  PageKey,
  { href: string; nav: string; title: string; headline: string; intro: string; description: string; sections?: { id: string; label: string }[]; next?: PageKey | "microgrid" }
> = {
  vision: {
    href: "/vision",
    nav: "Vision",
    title: "Our vision",
    headline: "Energy is where *possibility begins.*",
    intro: "Why reliable electricity matters for rural Africa, and the distributed energy future VoltageAfrica is building toward, one connected community at a time.",
    description: "The energy access challenge in rural Africa and VoltageAfrica's long-term vision: from community microgrids to a distributed energy network.",
    sections: [
      { id: "challenge", label: "The energy access challenge" },
      { id: "future", label: "The future of energy" },
    ],
    next: "technology",
  },
  technology: {
    href: "/technology",
    nav: "Technology",
    title: "Technology",
    headline: "How a VoltageAfrica *microgrid works.*",
    intro: "Generation, storage, intelligence and distribution designed as one system, and built around the enterprises and institutions it powers.",
    description: "How VoltageAfrica's solar microgrids work: generation, storage, intelligent energy management and productive-use energy.",
    sections: [
      { id: "approach", label: "Our approach" },
      { id: "intelligence", label: "Intelligent energy" },
      { id: "productive", label: "Productive energy" },
    ],
    next: "microgrid",
  },
  pilot: {
    href: "/pilot",
    nav: "Shurugwi pilot",
    title: "The Shurugwi pilot",
    headline: "Our first hub, *in the making.*",
    intro: "Five villages, months of listening, and a pilot microgrid now in preparation in Zimbabwe’s Midlands Province.",
    description: "VoltageAfrica's proposed first pilot hub in Shurugwi, Midlands, Zimbabwe: community research, the proposed hub and the pilot development stages.",
    next: "journey",
  },
  journey: {
    href: "/journey",
    nav: "Journey",
    title: "Our journey",
    headline: "The road so far, *and what comes next.*",
    intro: "From a blockchain energy-trading prototype in 2024 to a pilot hub in preparation: every milestone on the record.",
    description: "VoltageAfrica's journey: prototypes, community research, recognition and the road to the first pilot hub.",
    next: "impact",
  },
  impact: {
    href: "/impact",
    nav: "Impact",
    title: "Impact & recognition",
    headline: "Recognition, press *and community.*",
    intro: "Awards, coverage and the climate education work we do in schools, each linked to its original source.",
    description: "Press coverage, awards and community impact: VoltageAfrica in The Herald, BRICS+, Global HackAtom, Green Generation Initiative and more.",
    next: "about",
  },
  about: {
    href: "/about",
    nav: "About",
    title: "About",
    headline: "The people and *principles behind it.*",
    intro: "A venture founded in rural Zimbabwe, built by a team across Zimbabwe, Rwanda and Kenya, and guided by six commitments.",
    description: "About VoltageAfrica: founder Sean Mavhima, the team, and the principles that guide how we build energy infrastructure.",
    sections: [
      { id: "founder", label: "The founder" },
      { id: "team", label: "The team" },
      { id: "principles", label: "Our principles" },
    ],
    next: "contact",
  },
  contact: {
    href: "/contact",
    nav: "Contact",
    title: "Contact & partnerships",
    headline: "Let’s build what *comes next.*",
    intro: "",
    description: "Partner with VoltageAfrica: energy, technology, development, investment, research and agricultural partners.",
  },
};

export const microgridPage = { href: "/microgrid", nav: "Microgrid", title: "Microgrid exhibit" };

/** Home page: the short statement after the hero, and the "explore" index. */
export const home = {
  statement: "600 million people in Africa live without electricity. We are building the infrastructure to change that, *one community at a time.*",
  statementSource: { label: "IEA, Africa Energy Outlook 2022", href: "https://www.iea.org/reports/africa-energy-outlook-2022/key-findings" },
  explore: [
    { key: "vision", blurb: "The energy access challenge, and the distributed future we are building toward.", image: "/images/landscape/chidoma-dusk.jpg", alt: "Dusk over Chidoma Kopje" },
    { key: "technology", blurb: "Generation, storage, intelligence and distribution as one system.", image: "/images/prototype/tracker-sensor.jpg", alt: "VoltageAfrica's sun-tracking prototype" },
    { key: "pilot", blurb: "Five villages, months of listening, and a first hub in preparation.", image: null, alt: "" },
    { key: "journey", blurb: "Prototypes, research and recognition since 2024.", image: "/images/milestones/hackatom-stage.jpg", alt: "Presenting at the Global HackAtom final" },
    { key: "impact", blurb: "Press, awards and climate education in schools.", image: "/images/outreach/kigali-school-group.jpg", alt: "Students after a renewable energy lesson in Kigali" },
    { key: "about", blurb: "The founder, the team and the principles we build by.", image: "/images/founder/sean-pitching-close.jpg", alt: "Sean Mavhima speaking on stage" },
  ] as { key: PageKey; blurb: string; image: string | null; alt: string }[],
};
