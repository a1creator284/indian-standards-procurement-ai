export interface ExampleQuery {
  label: string;
  category: string;
  badge: string;
  snippet: string;
  text: string;
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    label: 'Submersible Pump (Hinglish)',
    category: 'Water & Pumps',
    badge: 'Hinglish AI',
    snippet: '5 HP submersible pump, 3-phase, 415V, head 60m, ISI mark',
    text: 'Gaon ke borewell ke liye 5 HP submersible pump chahiye, 3 phase, 415V, head 60 m, ISI mark ke saath',
  },
  {
    label: 'LED Street Lighting',
    category: 'Lighting',
    badge: 'Municipal GeM',
    snippet: '120W, IP66 outdoor municipal luminaire',
    text: 'LED street lighting system for municipal roads, 120W, IP66, outdoor installation',
  },
  {
    label: 'LT Power Cables',
    category: 'Cables & Power',
    badge: 'Outdated Check',
    snippet: '1.1 kV XLPE insulated armoured aluminium 4-core cable',
    text: 'Supply of 1.1 kV XLPE insulated armoured aluminium power cables 4 core 95 sq mm for underground distribution, as per IS 7098 (Part 1):1988',
  },
  {
    label: 'Rooftop Solar PV',
    category: 'Renewable',
    badge: 'Green Energy',
    snippet: '25 kWp grid-tied with string inverter for school',
    text: 'Grid-tied rooftop solar PV system 25 kWp with crystalline modules and string inverter for a government school building',
  },
  {
    label: 'सड़क प्रकाश (Hindi)',
    category: 'Municipal',
    badge: 'हिन्दी भाषा',
    snippet: 'नगर निगम सड़कों के लिए 120W जलरोधक एलईडी लाइट',
    text: 'नगर निगम की सड़कों के लिए एलईडी स्ट्रीट लाइट, 120 वाट, जलरोधक, बाहरी स्थापना',
  },
  {
    label: 'Distribution Transformer',
    category: 'Electrical',
    badge: 'CPWD / Discom',
    snippet: '100 kVA 11/0.433 kV outdoor oil immersed, Level 2',
    text: '100 kVA 11/0.433 kV outdoor oil immersed distribution transformer, energy efficiency level 2, as per IS 1180',
  },
];

