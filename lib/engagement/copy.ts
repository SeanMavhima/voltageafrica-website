/**
 * Default wording for the engagement pages. Seeded into the CMS and used as a
 * fallback for any field an editor leaves empty, so the pages never render
 * with missing labels.
 */
const link = (label: string, href: string) => ({ label, href });

export const partnershipCopy = {
  kicker: "Partner with VoltageAfrica",
  headline: "Build the grid *with us.*",
  intro: "We welcome partnerships that help advance accessible, intelligent and sustainable energy infrastructure for African communities.",
  body: "VoltageAfrica is at an early stage: validating our technology, preparing our first community pilot in Shurugwi, Zimbabwe, and building the relationships that will carry it to deployment. The right partners shape that work, from engineering and equipment to research, funding and community implementation.",
  partnerTypesTitle: "Who we work with",
  partnerTypes: [
    "Energy companies and utilities",
    "NGOs and development organisations",
    "Governments and public institutions",
    "Investors and funding organisations",
    "Universities and research institutions",
    "Technology and hardware companies",
    "Solar equipment suppliers",
    "Battery and energy storage companies",
    "Engineering and technical partners",
    "Community organisations",
    "Corporate partners",
    "Individual strategic collaborators",
  ],
  formTitle: "Propose a partnership",
  formDescription: "Tell us who you are and how you would like to collaborate. Every inquiry is read by our team.",
  submitLabel: "Send partnership inquiry",
  successTitle: "Inquiry received.",
  successMessage: "Thank you for reaching out to VoltageAfrica. Your partnership inquiry has been received. Our team will review your message and get back to you.",
  nextStep: link("See the Shurugwi pilot", "/pilot"),
  privacyNote: "We use your details only to respond to this inquiry. They are never shared or published.",
  consentLabel: "I agree to be contacted by VoltageAfrica about this partnership inquiry.",
};

/**
 * Donate band (section type "donate"). Defaults are deliberately free of figures:
 * the goal bar and gift tiers appear only once real numbers are entered in the CMS.
 */
export const donateCopy = {
  kicker: "Fund the pilot",
  headline: "Help switch on *Shurugwi's first community grid.*",
  intro:
    "VoltageAfrica is preparing its first solar microgrid hub in Shurugwi, Zimbabwe, for villages the national grid has not reached. Contributions go toward the pilot: equipment, installation and the community work around it.",
  donateLabel: "Donate",
  pledgeLabel: "Pledge your support",
  otherWaysLabel: "Equipment, expertise or partnership",
  methodsNote: "",
  goalLabel: "toward the Shurugwi pilot hub",
  tiersTitle: "What your gift makes possible",
  trustTitle: "Where the money goes",
  trustNote:
    "Every contribution is used for VoltageAfrica's pilot and the research behind it. We report progress publicly on this site as the hub moves from preparation to construction.",
  noLinkNote: "Online giving opens soon. Pledge now and we will contact you personally with how to give.",
};

export const supportCopy = {
  kicker: "Support VoltageAfrica",
  headline: "Help power the *first community grid.*",
  intro: "Support can help us advance renewable energy access, develop intelligent energy infrastructure, validate our solutions and, in time, deploy community microgrids.",
  body: "Whether you can offer funding, equipment, technical expertise or institutional backing, tell us what you have in mind. We will follow up personally to see how your contribution can make the most difference.",
  areasTitle: "Where support goes",
  areas: [
    { title: "Community energy pilot development", body: "Preparing and building the first hub in Shurugwi, Zimbabwe." },
    { title: "Solar panels and energy equipment", body: "Generation hardware for testing and for the pilot site." },
    { title: "Battery storage", body: "Evening and overnight supply, and reserve for cloudy days." },
    { title: "Engineering and research", body: "Site assessment, system design and field measurement." },
    { title: "Technology development", body: "Monitoring, control and the intelligence layer of the hub." },
    { title: "Rural community energy initiatives", body: "Engagement, education and outreach with communities." },
    { title: "Productive-use energy solutions", body: "Milling, irrigation and cold storage that create income." },
  ],
  noticeTitle: "How this works",
  notice:
    "This form is a support inquiry, not a payment. VoltageAfrica does not process payments or donations on this website. Submitting the form does not commit you to anything: we will contact you directly to discuss your proposed contribution and agree the next steps together.",
  paymentNote: "Submitting this form does not make a payment. We will contact you to coordinate your proposed contribution.",
  formTitle: "Offer your support",
  formDescription: "Share what you would like to contribute. Amounts are optional and only help us plan.",
  submitLabel: "Send support inquiry",
  successTitle: "Thank you.",
  successMessage: "Thank you for wanting to support VoltageAfrica's mission. Your contribution inquiry has been received. We will contact you to discuss the next steps.",
  nextStep: link("Read about our vision", "/vision"),
  privacyNote: "We use your details only to follow up on this inquiry. They are never shared or published.",
  consentLabel: "I agree to be contacted by VoltageAfrica about this support inquiry.",
};

export const contactCopy = {
  kicker: "Contact",
  headline: "Let's *talk.*",
  intro: "Questions, media requests, speaking invitations or opportunities to get involved: we read every message.",
  audiences: [] as string[],
  detailsTitle: "Reach us directly",
  formTitle: "Send a message",
  formDescription: "",
  submitLabel: "Send message",
  successTitle: "Message received.",
  successMessage: "Your message has been received. Thank you for contacting VoltageAfrica.",
  nextStep: link("Explore our technology", "/technology"),
  privacyNote: "We use your details only to reply to this message.",
  pathwaysTitle: "Other ways to work with us",
  pathways: [
    { title: "Partner with us", body: "For organisations and collaborators.", href: "/partner" },
    { title: "Support our work", body: "Funding, equipment or expertise.", href: "/support" },
  ],
};

export const pathwaysCopy = {
  kicker: "Get involved",
  headline: "Three ways to *move this forward.*",
  intro: "",
  items: [
    { title: "Partner with us", body: "Collaborate on engineering, equipment, research, funding or community implementation.", label: "Propose a partnership", href: "/partner" },
    { title: "Support our work", body: "Offer funding, equipment, technical expertise or institutional support.", label: "Offer support", href: "/support" },
    { title: "Contact us", body: "Media, speaking invitations, volunteering, careers or a general question.", label: "Send a message", href: "/contact" },
  ],
};
