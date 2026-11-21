export type ComponentId =
  | "solar"
  | "inverter"
  | "battery"
  | "distribution"
  | "household"
  | "school"
  | "productive"
  | "water"
  | "business"
  | "meters";

export type MetricKey = "pv" | "battery" | "inverter" | "demand" | "household" | "school" | "productive" | "water" | "business" | "meters";

export type GridComponent = {
  id: ComponentId;
  index: string;
  name: string;
  kicker: string;
  summary: string;
  points: string[];
  metric: MetricKey;
};

export const gridComponents: GridComponent[] = [
  {
    id: "solar",
    index: "01",
    name: "Solar array",
    kicker: "Generation",
    summary:
      "Photovoltaic cells turn sunlight directly into direct-current (DC) electricity. Output rises from dawn, peaks around midday and falls to zero at dusk; passing clouds cause short dips.",
    points: [
      "Single-axis trackers turn the panels to follow the sun from east to west. Scrub the time of day to watch them move.",
      "VoltageAfrica's prototype steers panels with a light-dependent-resistor (LDR) sensor that finds the brightest part of the sky.",
      "The array is the microgrid's only fuel source: no diesel, no fuel deliveries.",
    ],
    metric: "pv",
  },
  {
    id: "inverter",
    index: "02",
    name: "Inverter & power station",
    kicker: "Conversion & control",
    summary:
      "Panels and batteries work in DC. Homes and machines use alternating current (AC). The inverter converts between the two and keeps voltage and frequency stable.",
    points: [
      "Hybrid inverters decide, moment by moment, whether solar power goes to loads, into the battery, or both.",
      "They form the local grid: a stable 230 V AC supply that appliances can rely on.",
      "Protection gear here isolates faults so one problem cannot take down the whole network.",
    ],
    metric: "inverter",
  },
  {
    id: "battery",
    index: "03",
    name: "Battery energy storage",
    kicker: "Storage",
    summary:
      "Sunlight arrives in the day; demand peaks after dark. Batteries store the midday surplus and release it in the evening and overnight.",
    points: [
      "The status strip on the container shows the modelled state of charge: green while charging, amber while discharging.",
      "A battery management system watches cell temperatures, voltages and cycles to protect battery health.",
      "Keeping a reserve margin means the community still has power after a cloudy day.",
    ],
    metric: "battery",
  },
  {
    id: "distribution",
    index: "04",
    name: "Distribution network",
    kicker: "Delivery",
    summary:
      "A low-voltage network of poles and conductors carries power from the hub to every connection: homes, the school, workshops and the water pump.",
    points: [
      "Breakers and fuses at the hub and along the line protect people and equipment.",
      "Lines are sized for future growth, so more homes and businesses can connect later.",
      "Toggle the energy flow to see AC power (green) travelling out along the network.",
    ],
    metric: "demand",
  },
  {
    id: "household",
    index: "05",
    name: "Connected home",
    kicker: "Everyday life",
    summary:
      "A connected household gets reliable power for lights, phone charging, a radio or television, a fan, and eventually a fridge, replacing candles, kerosene and long trips to charge a phone.",
    points: [
      "Evening light extends the day for study, work and family.",
      "Phone charging at home keeps families connected to markets and mobile money.",
      "Cleaner air indoors: no kerosene smoke.",
    ],
    metric: "household",
  },
  {
    id: "school",
    index: "06",
    name: "School",
    kicker: "Community institution",
    summary:
      "Schools need lighting, devices and connectivity. Reliable power makes digital learning and evening classes possible, and a school is a stable anchor customer for the hub.",
    points: [
      "Daytime loads line up with peak solar output: efficient for the system.",
      "Clinics have similar needs, plus refrigeration for vaccines and medicines.",
      "Schools we visited in Shurugwi, including Chinho Primary School, were interested in off-grid solar.",
    ],
    metric: "school",
  },
  {
    id: "productive",
    index: "07",
    name: "Mill & cold room",
    kicker: "Productive use",
    summary:
      "A grain mill and a cold room turn electricity into income: processing crops locally and keeping produce fresh until it can be sold at a fair price.",
    points: [
      "Productive loads are scheduled in daylight hours, using solar power directly when it is most abundant.",
      "Selling energy for productive use is VoltageAfrica's second revenue stream in development.",
      "Local value-addition keeps more money circulating in the community.",
    ],
    metric: "productive",
  },
  {
    id: "water",
    index: "08",
    name: "Solar water pumping",
    kicker: "Agriculture",
    summary:
      "A pump lifts water to an elevated tank that feeds irrigation and livestock. The tank stores water the way the battery stores energy.",
    points: [
      "Pumping runs during the sunniest hours, with no battery needed.",
      "Irrigation can extend growing beyond the rainy season.",
      "Water storage gives farmers a buffer through dry spells.",
    ],
    metric: "water",
  },
  {
    id: "business",
    index: "09",
    name: "Community businesses",
    kicker: "Enterprise",
    summary:
      "Shops, barbers, tailors and phone-charging kiosks can trade longer and offer new services once they have reliable power.",
    points: [
      "Refrigerated drinks, power tools and sewing machines open new income streams.",
      "Businesses are daytime customers that balance household evening demand.",
      "Reliable supply lowers the cost of running a diesel generator, or replaces it entirely.",
    ],
    metric: "business",
  },
  {
    id: "meters",
    index: "10",
    name: "Smart meters & monitoring",
    kicker: "Energy intelligence",
    summary:
      "Every connection has a meter. Together with sensors at the hub, they show what is generated, stored and used, and they make pay-as-you-go billing possible.",
    points: [
      "Prepaid credit can be topped up by mobile money or USSD on a basic phone.",
      "Data from meters and the battery system feeds forecasting and maintenance planning.",
      "Smart metering is in design for our first pilot; forecasting and optimisation are planned to follow.",
    ],
    metric: "meters",
  },
];

export const componentById = Object.fromEntries(gridComponents.map((c) => [c.id, c])) as Record<ComponentId, GridComponent>;
