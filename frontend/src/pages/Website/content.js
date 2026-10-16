/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  circlegroup.lk — Website Content (Single Source of Truth)
 *  Sourced directly from Circle Engineering (Pvt) Ltd Official Company Profile 2026
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const company = {
  legalName: 'Circle Engineering (Pvt) Ltd',
  shortName: 'Circle Engineering',
  brandLine: 'Circle Group',
  regNo: 'PV 00344227',
  tagline: 'Engineering a Sustainable Energy Future',
  url: 'https://circlegroup.lk',
  logoSrc: '/website/logo.png',
  logoWhiteSrc: '/website/logo-white.png',
  logoMarkSrc: '/website/logo-mark.png',
};

export const snapshot = {
  companyName: 'Circle Engineering (Pvt) Ltd',
  regNo: 'PV 00344227',
  headOffice: '30th Floor, East Tower, World Trade Center, Colombo 01',
  industry: 'Renewable Energy',
  coreBusiness: 'Enterprise-level and utility-scale solar project EPC',
  operations: 'Sri Lanka',
  workforce: 'Approximately 50+ employees',
  tagline: 'Engineering a Sustainable Energy Future',
};

export const contact = {
  phoneDisplay: '+94 11 234 0400',
  phoneHref: '+94112340400',
  whatsapp: '94112340400',
  email: 'circlegroup.lk@gmail.com',
  address: '30th Floor, East Tower, World Trade Center, Colombo 01, Sri Lanka',
  mapQuery: 'World Trade Center, E Tower, Colombo 01, Sri Lanka',
  hours: 'Mon – Fri · 8:30 AM – 5:30 PM',
  socials: {
    facebook: 'https://facebook.com/circlegroup.lk',
    linkedin: 'https://linkedin.com/company/circle-engineering-lk',
    instagram: 'https://instagram.com/circlegroup.lk',
    twitter: 'https://x.com/circlegroup_lk',
    youtube: '',
  },
};

export const nav = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'services', label: 'EPC Services' },
  { id: 'portfolio', label: 'Project Portfolio' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'clients', label: 'Clients' },
  { id: 'contact', label: 'Contact' },
];

export const hero = {
  eyebrow: 'Renewable Energy · Utility-Scale EPC · Sri Lanka',
  titleLine1: 'Engineering a',
  highlight: 'Sustainable',
  titleLine2: 'Energy Future',
  subtitle:
    'Circle Engineering (Pvt) Ltd is a premier Sri Lankan renewable energy company specializing in the development, EPC implementation, and long-term asset management of large-scale solar power projects.',
  primaryCta: { label: 'Explore Project Portfolio', href: '#portfolio' },
  secondaryCta: { label: 'Company Profile', href: '#about' },
  image: '/website/hero.jpg',
};

export const stats = [
  { value: 50, suffix: ' MW', label: 'Hambantota Flagship Project' },
  { value: 70, suffix: '+ MW', label: 'Total Track Record & Pipeline' },
];

export const about = {
  eyebrow: 'About Our Company',
  title: 'Engineering a Sustainable Energy Future',
  body:
    'Circle Engineering (Pvt) Ltd is a Sri Lankan renewable energy engineering company, specializing in the development and implementation of large-scale solar power projects. Headquartered at the World Trade Center in Colombo, the company provides comprehensive Engineering, Procurement and Construction (EPC) solutions covering design, engineering, procurement, construction, installation, testing, commissioning, and operation and maintenance.',
  subBody:
    'Our focus includes utility-scale solar power plants, ground-mounted solar farms, commercial and industrial solar systems, and rooftop solar energy installations across Sri Lanka.',
  images: ['/website/real-engineers.jpg', '/website/real-technician.jpg', '/website/real-inspector.jpg'],
  badge: { value: 'PV 00344227', label: 'Registered EPC Entity' },
  points: [
    { title: 'Turnkey EPC Delivery', text: 'End-to-end design, procurement, construction, testing and commissioning under one roof.' },
    { title: 'Utility-Scale Focus', text: 'Proven capability executing projects from 2.4 MW up to 50 MW grid-connected solar parks.' },
    { title: 'Certified Engineering Standards', text: 'Strict adherence to CEB / LECO grid interconnection and high-voltage substation codes.' },
    { title: 'Full Asset Lifecycle O&M', text: 'Preventive maintenance, remote telemetry monitoring, and long-term asset optimization.' },
  ],
};

export const missionVision = {
  eyebrow: 'Our Vision & Mission',
  intro:
    'Circle Engineering is driven by a clear mission to accelerate Sri Lanka’s clean energy transition through dependable, world-class engineering execution.',
  items: [
    {
      key: 'vision',
      title: 'Our Vision',
      text:
        "To become a leading renewable energy engineering company in Sri Lanka, driving the nation's transition toward a sustainable energy future through innovative technologies, engineering excellence, and reliable clean energy solutions.",
      image: '/website/project-naula.jpg',
    },
    {
      key: 'mission',
      title: 'Our Mission',
      text:
        'To deliver high-quality, innovative and cost-effective renewable energy solutions through complete EPC and maintenance services.',
      image: '/website/project-hambantota.jpg',
    },
  ],
};

export const epcServices = {
  eyebrow: 'Our Services',
  title: 'Integrated EPC Delivery For Renewable Energy',
  subtitle:
    'Circle Engineering provides integrated Engineering, Procurement, and Construction (EPC) delivery for renewable energy projects across Sri Lanka.',
  services: [
    {
      number: '01',
      title: 'Engineering & Design',
      desc: 'Feasibility studies, optimized PV system layout design, electrical and civil engineering, and statutory technical documentation.',
      icon: 'PencilRuler',
      features: ['Feasibility & Resource Assessment', 'Electrical & Civil Layout Design', 'HT Interconnection Engineering', 'Grid Code Compliance Studies'],
    },
    {
      number: '02',
      title: 'Procurement',
      desc: 'Tier-1 solar panels, inverters, structures, logistics, supplier coordination and rigorous quality verification.',
      icon: 'Boxes',
      features: ['Tier-1 PV Modules & Inverters', 'Hot-Dip Galvanized Mounting Structures', 'Medium & High-Voltage Switchgear', 'Global Freight & Customs Clearance'],
    },
    {
      number: '03',
      title: 'Construction & Installation',
      desc: 'Ground-mounted solar farms, rooftop systems, electrical infrastructure, cable management and site civil works.',
      icon: 'HardHat',
      features: ['Piling & Mechanical Structure Erection', 'DC/AC Cabling & Inverter Station Setup', 'HT Substation & Transmission Lines', 'Rigorous Site Safety Protocols'],
    },
    {
      number: '04',
      title: 'Testing & Commissioning',
      desc: 'System inspection, performance verification, inverter configuration, protection relay audits, and CEB grid handover.',
      icon: 'Gauge',
      features: ['Pre-Commissioning Quality Audits', 'Protection Relay Configuration', 'Grid Synchronization Testing', 'CEB Acceptance & Metering Handover'],
    },
    {
      number: '05',
      title: 'Operations & Maintenance',
      desc: 'Preventive and corrective maintenance, cloud SCADA monitoring, troubleshooting and continuous technical support.',
      icon: 'Activity',
      features: ['24/7 Real-Time Cloud SCADA Monitoring', 'Thermography & IV-Curve Diagnostic Testing', 'Scheduled Cleaning & Vegetation Control', 'Rapid-Response Technical Support'],
    },
    {
      number: '06',
      title: 'Utility & Customized Infrastructure',
      desc: 'Utility-scale, commercial, industrial and customized solar infrastructure engineered for high yields and long-term asset life.',
      icon: 'ShieldCheck',
      features: ['Megawatt-Scale Ground Solar Parks', 'Factory & Industrial Rooftop Arrays', 'Microgrid & BESS Battery Integration', 'Power Purchase Agreement (PPA) Setup'],
    },
  ],
};

export const portfolio = {
  eyebrow: 'Project Portfolio',
  title: 'Proven Track Record Across Sri Lanka',
  subtitle:
    'From our completed 2.4 MW Naula solar installation to the landmark 50 MW Hambantota utility initiative, our portfolio demonstrates execution excellence across the island.',
  flagships: [
    {
      id: 'naula',
      name: 'Naula Solar Power Project',
      capacity: '2.4 MW',
      status: 'Completed',
      statusType: 'completed',
      location: 'Naula, Central Province',
      description:
        'The Naula Solar Power Project is a 2.4 MW solar energy installation designed to generate clean, renewable electricity and support a more sustainable energy future.',
      image: '/website/project-naula.jpg',
      metrics: [
        { label: 'Capacity', val: '2.4 MW' },
        { label: 'Project Status', val: 'Completed & Generating' },
        { label: 'Facility Type', val: 'Ground-Mounted Solar Farm' },
      ],
    },
    {
      id: 'hambantota',
      name: 'Hambantota Power Project',
      capacity: '50 MW',
      status: 'Ongoing',
      statusType: 'ongoing',
      location: 'Hambantota, Southern Province',
      description:
        'The Hambantota 50 MW Solar Power Project represents the key milestone behind the establishment of Circle Engineering (Pvt) Ltd. The project reflects the company’s focus on utility-scale renewable energy infrastructure and its commitment to Sri Lanka’s clean energy transition.',
      image: '/website/project-hambantota.jpg',
      metrics: [
        { label: 'Capacity', val: '50 MW' },
        { label: 'Project Status', val: 'Ongoing Execution' },
        { label: 'Facility Type', val: 'Flagship Utility Solar Park' },
      ],
    },
    {
      id: 'kegalle',
      name: 'Kegalle Solar Power Project',
      capacity: '3.5 MW',
      status: 'Ongoing',
      statusType: 'ongoing',
      location: 'Kegalle, Sabaragamuwa Province',
      description:
        'The Kegalle Solar Power Project is a 3.5 MW renewable energy initiative focused on sustainable electricity generation. The project utilizes solar energy to support growing energy demands and reduces reliance on conventional power sources.',
      image: '/website/div-solar.jpg',
      metrics: [
        { label: 'Capacity', val: '3.5 MW' },
        { label: 'Project Status', val: 'Ongoing Execution' },
        { label: 'Facility Type', val: 'Clean Energy Initiative' },
      ],
    },
  ],
  collaborations: [
    { client: 'Michelin Lanka - Access Solar', capacity: '3 MW', category: 'Commercial & Industrial' },
    { client: 'Batticaloa Solar Project', capacity: '2 MW', category: 'Utility Solar' },
    { client: 'Habarana Solar Project', capacity: '3 MW', category: 'Utility Solar' },
    { client: 'Hambantota Solar Project', capacity: '10 MW', category: 'Utility Solar' },
    { client: 'Saffron Hotel, Wadduwa', capacity: '375 KW', category: 'Commercial Hospitality' },
    { client: 'Wadduwa Solar Installation', capacity: '45 KW', category: 'Commercial Installation' },
    { client: 'Panadura Solar Installation', capacity: '25 KW', category: 'Commercial Installation' },
  ],
};

export const clients = {
  eyebrow: 'Clients & Collaborations',
  title: 'Building Trust Through Engineering Quality',
  subtitle: 'Building trust through engineering quality and reliable delivery.',
  list: [
    { name: 'CAC Holdings (Pvt) Ltd', type: 'Corporate Group' },
    { name: 'Lexwin Solar (Pvt) Ltd', type: 'Energy Partner' },
    { name: 'Amro Sugar', type: 'Industrial Processing' },
    { name: 'Kinigoda Solar (Pvt) Ltd', type: 'Solar Venture' },
    { name: 'Dudu International (Pvt) Ltd', type: 'Trading & Logistics' },
    { name: 'Tanish International (Pvt) Ltd', type: 'Commercial Partner' },
    { name: 'Tanu International (Pvt) Ltd', type: 'Industrial Partner' },
    { name: 'Nidhanya International (Pvt) Ltd', type: 'Enterprise Partner' },
    { name: 'Orion International (Pvt) Ltd', type: 'Technology Partner' },
  ],
};

export const futurePlans = {
  eyebrow: 'Future Plans',
  title: 'Strategic Priorities for Long-Term Growth',
  subtitle:
    'Circle Engineering is systematically expanding capabilities to support Sri Lanka’s clean energy transition and establish new benchmarks in utility infrastructure.',
  items: [
    {
      number: '01',
      title: 'Expand Utility-Scale Solar EPC Capacity',
      desc: 'Accelerating the development and turnkey execution of large-scale, high-yield grid-connected solar power plants across high-irradiation zones in Sri Lanka.',
    },
    {
      number: '02',
      title: 'Strengthen Operation and Maintenance Services',
      desc: 'Deploying advanced cloud SCADA telemetry, automated IV-curve analysis, and predictive maintenance protocols for maximized long-term asset performance.',
    },
    {
      number: '03',
      title: 'Adopt Emerging Clean Technologies & BESS',
      desc: 'Integrating industrial-scale Battery Energy Storage Systems (BESS) and smart inverter microgrid controls to support grid stability and off-peak dispatch.',
    },
    {
      number: '04',
      title: 'Develop Strategic Supplier Networks',
      desc: 'Deepening direct partnerships with premier Tier-1 global PV module, inverter, and switchgear manufacturers to guarantee superior lifecycle reliability.',
    },
    {
      number: '05',
      title: 'Contribute to Sri Lanka’s Energy Transition',
      desc: 'Actively powering the nation’s target of 70% renewable electricity through dependable, full-circle engineering excellence.',
    },
  ],
};

export const divisions = [
  {
    id: 'solar',
    name: 'Solar Division',
    tag: 'Renewable Energy EPC',
    accent: '#1046A0',
    icon: 'Sun',
    image: '/website/project-naula.jpg',
    status: 'active',
    description:
      'Turnkey utility-scale and enterprise solar PV engineering — from feasibility and HT grid interconnection to complete EPC construction, CEB commissioning, and 24/7 SCADA asset management.',
    services: [
      'Utility-Scale Solar Farms (2 MW – 50 MW)',
      'Commercial & Industrial (C&I) Rooftop',
      'HT 11kV / 33kV Substation Interconnection',
      'Testing, Commissioning & CEB Handover',
      '24/7 Remote SCADA Monitoring & O&M',
    ],
    facts: [
      { value: '50 MW', label: 'Hambantota Project' },
      { value: '70+ MW', label: 'Project Pipeline' },
    ],
    cta: { label: 'Explore Portfolio', href: '#portfolio' },
  },
  {
    id: 'vehicle',
    name: 'Vehicle Division',
    tag: 'Transport & Fleet Logistics',
    accent: '#E8471A',
    icon: 'Truck',
    image: '/website/div-vehicle.jpg',
    status: 'active',
    description:
      'Safe, punctual and fully managed transport solutions — staff transport, executive vehicle hire and corporate logistics backed by 24/7 GPS tracking, professional drivers and rigorous fleet maintenance.',
    services: ['Corporate Staff Transport', 'Managed Fleet Solutions', 'Executive Vehicle Hire', 'Inter-District Logistics', '24/7 GPS Live Telematics'],
    facts: [
      { value: '24/7', label: 'Fleet Telemetry' },
      { value: '100%', label: 'GPS Monitored' },
    ],
    cta: { label: 'Enquire About Transport', href: '#contact' },
  },
  {
    id: 'plantation',
    name: 'Plantation Division',
    tag: 'Sustainable Agriculture',
    accent: '#2E9E5B',
    icon: 'Sprout',
    image: '/website/div-plantation.jpg',
    status: 'soon',
    description:
      'Bringing engineering discipline and precision management to agriculture — sustainable plantation ventures, smart irrigation, and solar-powered agro-logistics for a greener future.',
    services: ['Sustainable Cultivation', 'Solar-Powered Irrigation', 'Agri-Logistics & Cold Chain', 'Smart Crop Management'],
    facts: [
      { value: 'Eco', label: 'Sustainable Practices' },
      { value: 'Coming Soon', label: 'Venture Status' },
    ],
    cta: { label: 'Register Interest', href: '#contact' },
  },
];

export const interests = [
  'Solar Division (Utility EPC & C&I)',
  'Vehicle Division (Fleet Transport)',
  'Plantation Division',
  'Collaborative Project Partnership',
  'General Corporate Enquiry',
];
