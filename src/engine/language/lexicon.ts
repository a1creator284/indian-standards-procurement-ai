import type { RequirementCategory, Sector } from '../types';

/**
 * Domain concept lexicon.
 *
 * Each concept groups English surface forms, Hindi (Devanagari) forms and
 * romanised Hindi/Hinglish forms. Concepts are used for:
 *  - multilingual normalisation (Hindi/Hinglish → English canonical term)
 *  - semantic feature expansion in the local embedding model
 *  - product / sector inference and requirement categorisation
 *
 * Adding a language = adding a new key to `forms` and a matcher in detect.ts.
 */
export interface Concept {
  id: string;
  canonical: string;
  forms: { en: string[]; hi: string[]; hinglish: string[] };
  sectors: Sector[];
  category: RequirementCategory;
  /** Boost applied when the concept is present in both query and document. */
  weight: number;
}

export const CONCEPTS: Concept[] = [
  // ── Lighting ────────────────────────────────────────────────────────────
  { id: 'street-light', canonical: 'street lighting luminaire', forms: { en: ['street light', 'street lighting', 'road light', 'road lighting', 'highway lighting', 'streetlight', 'public lighting', 'thoroughfare'], hi: ['सड़क बत्ती', 'स्ट्रीट लाइट', 'सड़क प्रकाश', 'मार्ग प्रकाश'], hinglish: ['sadak light', 'sadak batti', 'street light', 'road ki light', 'sadak ki batti'] }, sectors: ['lighting'], category: 'product', weight: 3 },
  { id: 'led', canonical: 'LED', forms: { en: ['led', 'light emitting diode', 'solid state lighting', 'ssl'], hi: ['एलईडी', 'एल ई डी'], hinglish: ['led', 'el ee dee'] }, sectors: ['lighting'], category: 'product', weight: 2 },
  { id: 'luminaire', canonical: 'luminaire', forms: { en: ['luminaire', 'light fitting', 'fixture', 'lighting fixture', 'lamp fitting', 'flood light', 'floodlight', 'high mast'], hi: ['ल्यूमिनेयर', 'लाइट फिटिंग', 'प्रकाश उपकरण'], hinglish: ['light fitting', 'fixture', 'luminaire'] }, sectors: ['lighting'], category: 'product', weight: 2 },
  { id: 'lamp', canonical: 'LED lamp', forms: { en: ['led lamp', 'led bulb', 'bulb', 'self-ballasted lamp', 'self ballasted'], hi: ['बल्ब', 'एलईडी बल्ब', 'लैम्प'], hinglish: ['bulb', 'led bulb', 'lamp'] }, sectors: ['lighting'], category: 'product', weight: 2 },
  { id: 'led-driver', canonical: 'LED driver (control gear)', forms: { en: ['led driver', 'control gear', 'controlgear', 'power supply unit', 'psu', 'ballast'], hi: ['कंट्रोल गियर', 'एलईडी ड्राइवर'], hinglish: ['led driver', 'control gear'] }, sectors: ['lighting'], category: 'product', weight: 2 },
  { id: 'led-module', canonical: 'LED module', forms: { en: ['led module', 'light engine', 'led chip', 'led package', 'cob', 'smd'], hi: ['एलईडी मॉड्यूल'], hinglish: ['led module', 'led chip'] }, sectors: ['lighting'], category: 'product', weight: 2 },
  { id: 'photometric', canonical: 'photometric performance', forms: { en: ['lumen', 'lumens', 'luminous flux', 'efficacy', 'lm/w', 'lux', 'illuminance', 'uniformity', 'photometric', 'light output', 'cct', 'colour temperature', 'color temperature', 'cri', 'colour rendering', 'color rendering', 'kelvin'], hi: ['लुमेन', 'प्रकाश उत्पादन', 'लक्स', 'रोशनी'], hinglish: ['lumen', 'roshni', 'lux', 'efficacy', 'brightness'] }, sectors: ['lighting'], category: 'performance', weight: 2 },
  { id: 'indoor-lighting', canonical: 'interior lighting', forms: { en: ['indoor lighting', 'interior lighting', 'office lighting', 'interior illumination', 'panel light', 'tube light', 'downlight'], hi: ['इनडोर लाइट', 'कार्यालय प्रकाश'], hinglish: ['indoor light', 'office light', 'andar ki light', 'tube light'] }, sectors: ['lighting'], category: 'product', weight: 2 },

  // ── Environmental / mechanical ──────────────────────────────────────────
  { id: 'ingress-protection', canonical: 'ingress protection (IP rating)', forms: { en: ['ip rating', 'ip code', 'ingress protection', 'ip65', 'ip66', 'ip67', 'ip54', 'ip55', 'ip68', 'dust proof', 'water proof', 'waterproof', 'dustproof', 'weatherproof', 'weather proof', 'rain proof'], hi: ['जलरोधक', 'धूलरोधक', 'आईपी रेटिंग', 'वाटरप्रूफ'], hinglish: ['waterproof', 'ip rating', 'pani se surakshit', 'dhool proof', 'dust proof'] }, sectors: ['lighting', 'electrical', 'general'], category: 'environmental', weight: 3 },
  { id: 'outdoor', canonical: 'outdoor installation', forms: { en: ['outdoor', 'external', 'exterior', 'open air', 'weather exposed', 'municipal road', 'public road', 'highway', 'roadside'], hi: ['बाहरी', 'खुले में', 'बाहर', 'सड़क पर'], hinglish: ['bahar', 'outdoor', 'khule mein', 'sadak par', 'bahari'] }, sectors: ['lighting', 'electrical', 'civil'], category: 'environmental', weight: 2 },
  { id: 'impact', canonical: 'impact protection (IK rating)', forms: { en: ['ik rating', 'ik08', 'ik09', 'ik10', 'impact resistance', 'vandal proof', 'vandal resistant'], hi: ['प्रभाव प्रतिरोध'], hinglish: ['ik rating', 'vandal proof'] }, sectors: ['lighting', 'electrical'], category: 'mechanical', weight: 2 },
  { id: 'corrosion', canonical: 'corrosion protection', forms: { en: ['corrosion', 'galvanized', 'galvanised', 'hot dip', 'hot-dip', 'zinc coating', 'rust', 'powder coated', 'anti corrosive'], hi: ['जंग', 'गैल्वनाइज्ड', 'जस्ता'], hinglish: ['galvanized', 'jang', 'zinc coating', 'rust proof'] }, sectors: ['civil', 'mechanical'], category: 'material', weight: 2 },

  // ── Electrical ──────────────────────────────────────────────────────────
  { id: 'wattage', canonical: 'rated power', forms: { en: ['watt', 'watts', 'wattage', 'rated power', 'power rating', 'kw', 'kilowatt', 'kva', 'hp'], hi: ['वाट', 'वॉट', 'किलोवाट', 'शक्ति', 'पावर'], hinglish: ['watt', 'wattage', 'power', 'kilowatt', 'hp'] }, sectors: ['lighting', 'electrical', 'mechanical'], category: 'electrical', weight: 2 },
  { id: 'voltage', canonical: 'rated voltage', forms: { en: ['volt', 'volts', 'voltage', 'v ac', 'vac', 'vdc', 'kv', '230v', '240v', '415v', '11kv', '33kv', 'single phase', 'three phase', '3 phase'], hi: ['वोल्ट', 'वोल्टेज', 'फेज'], hinglish: ['volt', 'voltage', 'phase', 'teen phase'] }, sectors: ['electrical', 'lighting', 'mechanical'], category: 'electrical', weight: 2 },
  { id: 'surge', canonical: 'surge protection', forms: { en: ['surge', 'surge protection', 'spd', 'lightning', 'transient', 'kv surge'], hi: ['सर्ज', 'बिजली गिरना', 'तड़ित'], hinglish: ['surge', 'bijli girna', 'lightning'] }, sectors: ['electrical', 'lighting'], category: 'safety', weight: 2 },
  { id: 'power-quality', canonical: 'power quality (PF / THD)', forms: { en: ['power factor', 'pf', 'thd', 'harmonic', 'harmonics', 'total harmonic distortion'], hi: ['पावर फैक्टर', 'हार्मोनिक'], hinglish: ['power factor', 'thd', 'harmonic'] }, sectors: ['electrical', 'lighting'], category: 'performance', weight: 2 },
  { id: 'electrical-safety', canonical: 'electrical safety', forms: { en: ['electric shock', 'electrical safety', 'insulation resistance', 'class i', 'class ii', 'double insulated', 'dielectric strength', 'creepage distance'], hi: ['विद्युत सुरक्षा', 'बिजली का झटका', 'इन्सुलेशन प्रतिरोध'], hinglish: ['electrical safety', 'bijli ka jhatka', 'shock'] }, sectors: ['electrical', 'lighting', 'it-electronics'], category: 'safety', weight: 2 },
  { id: 'earthing', canonical: 'earthing', forms: { en: ['earthing', 'earth electrode', 'earth pit', 'grounding', 'protective earth'], hi: ['अर्थिंग', 'भू-संपर्क', 'ग्राउंडिंग'], hinglish: ['earthing', 'arthing', 'grounding', 'earth pit'] }, sectors: ['electrical'], category: 'installation', weight: 2 },
  { id: 'wiring', canonical: 'electrical wiring installation', forms: { en: ['wiring', 'electrical installation', 'internal wiring', 'house wiring', 'conduit', 'erection', 'electrical works'], hi: ['वायरिंग', 'बिजली फिटिंग', 'विद्युत स्थापना', 'तार बिछाना'], hinglish: ['wiring', 'bijli fitting', 'electrical kaam', 'taar bichana'] }, sectors: ['electrical'], category: 'installation', weight: 2 },
  { id: 'cable', canonical: 'electric cable', forms: { en: ['cable', 'cables', 'wire', 'wires', 'conductor', 'cable core', 'sq mm', 'sqmm', 'armoured', 'armored', 'unarmoured', 'flexible cord', 'frls', 'fr'], hi: ['केबल', 'तार', 'बिजली का तार', 'चालक'], hinglish: ['cable', 'taar', 'tar', 'wire', 'bijli ka taar'] }, sectors: ['cables'], category: 'product', weight: 3 },
  { id: 'pvc-cable', canonical: 'PVC insulated cable', forms: { en: ['pvc insulated', 'pvc cable', 'pvc sheathed', 'pvc'], hi: ['पीवीसी'], hinglish: ['pvc'] }, sectors: ['cables'], category: 'material', weight: 2 },
  { id: 'xlpe', canonical: 'XLPE insulated cable', forms: { en: ['xlpe', 'cross linked polyethylene', 'crosslinked'], hi: ['एक्सएलपीई'], hinglish: ['xlpe'] }, sectors: ['cables'], category: 'material', weight: 3 },
  { id: 'copper', canonical: 'copper conductor', forms: { en: ['copper', 'cu conductor', 'cu'], hi: ['तांबा', 'ताँबा', 'कॉपर'], hinglish: ['copper', 'tamba', 'taamba'] }, sectors: ['cables', 'electrical'], category: 'material', weight: 1.5 },
  { id: 'aluminium', canonical: 'aluminium conductor', forms: { en: ['aluminium', 'aluminum', 'al conductor'], hi: ['एल्युमिनियम', 'एल्यूमीनियम'], hinglish: ['aluminium', 'aluminum'] }, sectors: ['cables', 'electrical'], category: 'material', weight: 1.5 },
  { id: 'switchgear', canonical: 'switchgear / panel', forms: { en: ['switchgear', 'switchgear panel', 'switchboard', 'distribution board', 'db', 'feeder pillar', 'mcb', 'mccb', 'rccb', 'elcb', 'circuit breaker', 'contactor', 'controlgear', 'lt panel'], hi: ['स्विचगियर', 'पैनल', 'सर्किट ब्रेकर', 'वितरण बोर्ड'], hinglish: ['panel', 'switchgear', 'mcb', 'breaker', 'db board'] }, sectors: ['electrical'], category: 'product', weight: 3 },
  { id: 'plug-socket', canonical: 'plugs and socket-outlets', forms: { en: ['plug', 'socket', 'socket outlet', 'switch socket', 'power point'], hi: ['प्लग', 'सॉकेट'], hinglish: ['plug', 'socket'] }, sectors: ['electrical'], category: 'product', weight: 3 },
  { id: 'transformer', canonical: 'transformer', forms: { en: ['transformer', 'distribution transformer', 'power transformer', 'oil immersed', 'kva transformer'], hi: ['ट्रांसफार्मर', 'ट्रांसफॉर्मर'], hinglish: ['transformer'] }, sectors: ['electrical'], category: 'product', weight: 3 },
  { id: 'energy-meter', canonical: 'electricity meter', forms: { en: ['energy meter', 'electricity meter', 'watthour meter', 'smart meter', 'kwh meter', 'metering', 'prepaid meter', 'ami'], hi: ['बिजली मीटर', 'ऊर्जा मीटर', 'स्मार्ट मीटर'], hinglish: ['bijli meter', 'meter', 'smart meter', 'energy meter'] }, sectors: ['metering'], category: 'product', weight: 3 },

  // ── Poles / structural / civil ──────────────────────────────────────────
  { id: 'pole', canonical: 'lighting pole', forms: { en: ['pole', 'poles', 'mast', 'tubular pole', 'octagonal pole', 'steel pole', 'lamp post', 'bracket', 'mounting height'], hi: ['खंभा', 'पोल', 'खम्भा'], hinglish: ['khamba', 'pole', 'khambha', 'lamp post'] }, sectors: ['civil', 'lighting'], category: 'installation', weight: 2 },
  { id: 'structural-steel', canonical: 'structural steel', forms: { en: ['structural steel', 'steel section', 'ms plate', 'steel plate', 'e250', 'e350', 'hot rolled', 'angle', 'channel', 'girder'], hi: ['इस्पात', 'स्टील', 'लोहा'], hinglish: ['steel', 'ispat', 'loha', 'ms plate'] }, sectors: ['civil'], category: 'material', weight: 3 },
  { id: 'concrete', canonical: 'concrete', forms: { en: ['concrete', 'rcc', 'reinforced concrete', 'foundation', 'm20', 'm25', 'm30', 'pcc', 'cement concrete'], hi: ['कंक्रीट', 'सीमेंट कंक्रीट', 'नींव'], hinglish: ['concrete', 'rcc', 'neev', 'foundation'] }, sectors: ['civil'], category: 'material', weight: 3 },
  { id: 'cement', canonical: 'cement', forms: { en: ['cement', 'opc', 'ppc', 'portland', '43 grade', '53 grade'], hi: ['सीमेंट'], hinglish: ['cement', 'siment'] }, sectors: ['civil'], category: 'material', weight: 3 },
  { id: 'rebar', canonical: 'reinforcement steel', forms: { en: ['tmt', 'rebar', 'reinforcement', 'fe 500', 'fe500', 'fe 550', 'deformed bar', 'sariya', 'steel bar'], hi: ['सरिया', 'टीएमटी', 'सुदृढ़ीकरण'], hinglish: ['sariya', 'tmt', 'saria', 'rebar'] }, sectors: ['civil'], category: 'material', weight: 3 },
  { id: 'aggregate', canonical: 'aggregate', forms: { en: ['aggregate', 'sand', 'gravel', 'coarse aggregate', 'fine aggregate', 'm-sand', 'crushed stone'], hi: ['रेत', 'बालू', 'गिट्टी', 'बजरी'], hinglish: ['ret', 'balu', 'gitti', 'bajri', 'sand', 'aggregate'] }, sectors: ['civil'], category: 'material', weight: 3 },
  { id: 'wind-load', canonical: 'wind load design', forms: { en: ['wind load', 'wind speed', 'design load', 'structural design', 'load bearing'], hi: ['पवन भार', 'हवा का दबाव'], hinglish: ['wind load', 'hawa ka load'] }, sectors: ['civil'], category: 'mechanical', weight: 2 },
  { id: 'steel-tube', canonical: 'steel tube / GI pipe', forms: { en: ['steel tube', 'gi pipe', 'g.i. pipe', 'galvanized pipe', 'steel pipe', 'ms pipe', 'tubular'], hi: ['जीआई पाइप', 'स्टील पाइप', 'लोहे का पाइप'], hinglish: ['gi pipe', 'steel pipe', 'lohe ka pipe'] }, sectors: ['mechanical', 'water'], category: 'product', weight: 3 },

  // ── Water ───────────────────────────────────────────────────────────────
  { id: 'water-supply', canonical: 'water supply', forms: { en: ['water supply', 'potable water', 'drinking water', 'water quality', 'water treatment', 'jal jeevan', 'piped water'], hi: ['जल आपूर्ति', 'पीने का पानी', 'पेयजल', 'पानी', 'जल'], hinglish: ['pani', 'paani', 'peene ka pani', 'jal', 'water supply', 'drinking water'] }, sectors: ['water'], category: 'product', weight: 3 },
  { id: 'pipe', canonical: 'pipe', forms: { en: ['pipe', 'pipes', 'pipeline', 'piping', 'upvc', 'pvc pipe', 'hdpe', 'ductile iron', 'di pipe', 'pressure pipe', 'water main'], hi: ['पाइप', 'पाइपलाइन', 'नल'], hinglish: ['pipe', 'pipeline', 'nal', 'paip'] }, sectors: ['water', 'mechanical'], category: 'product', weight: 3 },
  { id: 'pump', canonical: 'pumpset', forms: { en: ['pump', 'pumps', 'pumpset', 'submersible pump', 'borewell pump', 'centrifugal pump', 'monoblock pump'], hi: ['पंप', 'पम्प', 'सबमर्सिबल पंप', 'बोरवेल पंप', 'मोटर पंप'], hinglish: ['pump', 'pamp', 'submersible pump', 'borewell pump', 'motor pump'] }, sectors: ['mechanical', 'water'], category: 'product', weight: 3 },
  { id: 'motor', canonical: 'electric motor', forms: { en: ['motor', 'motors', 'induction motor', 'ie2', 'ie3', 'ie4', 'efficiency class', 'rpm', 'squirrel cage'], hi: ['मोटर', 'इंडक्शन मोटर'], hinglish: ['motor', 'induction motor'] }, sectors: ['mechanical'], category: 'product', weight: 3 },

  // ── Renewable ───────────────────────────────────────────────────────────
  { id: 'solar', canonical: 'solar photovoltaic', forms: { en: ['solar', 'photovoltaic', 'pv module', 'pv panel', 'solar panel', 'solar module', 'wp', 'kwp', 'rooftop', 'crystalline', 'mono perc', 'polycrystalline', 'solar street light'], hi: ['सौर', 'सोलर', 'सौर ऊर्जा', 'सोलर पैनल'], hinglish: ['solar', 'saur', 'solar panel', 'solar urja'] }, sectors: ['renewable'], category: 'product', weight: 3 },
  { id: 'inverter', canonical: 'inverter / power converter', forms: { en: ['inverter', 'inverters', 'power converter', 'grid tied', 'grid-tied', 'grid connected', 'on grid', 'off grid', 'anti islanding', 'pcu', 'hybrid inverter'], hi: ['इन्वर्टर', 'इनवर्टर'], hinglish: ['inverter', 'invertor'] }, sectors: ['renewable'], category: 'product', weight: 3 },
  { id: 'battery', canonical: 'battery', forms: { en: ['battery', 'batteries', 'lithium', 'li-ion', 'lithium ion', 'lifepo4', 'battery cell', 'energy storage', 'bess', 'power bank', 'ah'], hi: ['बैटरी', 'लिथियम'], hinglish: ['battery', 'batri', 'lithium'] }, sectors: ['it-electronics', 'renewable'], category: 'product', weight: 3 },

  // ── Furniture / Office Storage ───────────────────────────────────────────
  { id: 'steel-almirah', canonical: 'Steel Almirah / Storage Cabinet', forms: { en: ['almirah', 'steel almirah', 'steel cabinet', 'shelving cabinet', 'storage cabinet', 'office almirah', 'cupboard', 'steel cupboard', 'filing cabinet'], hi: ['अलमारी', 'स्टील अलमारी', 'लोहे की अलमारी', 'कैबिनेट'], hinglish: ['almirah', 'almari', 'steel almari', 'lohe ki almari', 'cabinet'] }, sectors: ['general', 'civil'], category: 'product', weight: 3 },

  // ── IT / electronics ────────────────────────────────────────────────────
  { id: 'it-equipment', canonical: 'IT equipment', forms: { en: ['laptop', 'laptops', 'computer', 'computers', 'desktop', 'server', 'servers', 'printer', 'scanner', 'router', 'switch', 'network equipment', 'it equipment', 'ups', 'adapter', 'power adapter', 'tablet', 'workstation'], hi: ['लैपटॉप', 'कंप्यूटर', 'सर्वर', 'प्रिंटर', 'संगणक'], hinglish: ['laptop', 'computer', 'server', 'printer', 'ups'] }, sectors: ['it-electronics'], category: 'product', weight: 3 },
  { id: 'av-equipment', canonical: 'audio/video apparatus', forms: { en: ['television', 'tv', 'monitor', 'display', 'projector', 'speaker', 'audio', 'video', 'set top box', 'amplifier', 'smart tv', 'led tv', 'interactive panel'], hi: ['टेलीविजन', 'टीवी', 'मॉनिटर', 'प्रोजेक्टर', 'स्पीकर'], hinglish: ['tv', 'television', 'monitor', 'projector', 'speaker'] }, sectors: ['it-electronics'], category: 'product', weight: 3 },

  // ── Jewellery ───────────────────────────────────────────────────────────
  { id: 'gold', canonical: 'gold jewellery', forms: { en: ['gold', 'jewellery', 'jewelry', 'hallmark', 'hallmarking', 'carat', 'karat', '22k', '18k', 'ornament', 'fineness'], hi: ['सोना', 'आभूषण', 'गहने', 'हॉलमार्क', 'जेवर'], hinglish: ['sona', 'gehne', 'jewellery', 'hallmark', 'zewar', 'jewelry'] }, sectors: ['jewellery'], category: 'product', weight: 3 },

  // ── Cross-cutting requirement types ─────────────────────────────────────
  { id: 'testing', canonical: 'testing requirements', forms: { en: ['test', 'tests', 'testing', 'type test', 'routine test', 'acceptance test', 'test report', 'test certificate', 'nabl', 'lab test', 'sample testing', 'third party inspection'], hi: ['परीक्षण', 'टेस्ट', 'जांच', 'परख'], hinglish: ['test', 'testing', 'jaanch', 'parikshan', 'test report'] }, sectors: ['general'], category: 'testing', weight: 2 },
  { id: 'certification', canonical: 'certification requirements', forms: { en: ['certification', 'certificate', 'certified', 'bis', 'isi', 'isi mark', 'crs', 'registration', 'bis registered', 'bis certified', 'hallmarked', 'ce', 'quality control order', 'qco'], hi: ['प्रमाणन', 'प्रमाण पत्र', 'बीआईएस', 'आईएसआई', 'आईएसआई मार्क', 'प्रमाणित'], hinglish: ['certificate', 'certification', 'isi mark', 'bis', 'pramaan patra', 'certified'] }, sectors: ['general'], category: 'certification', weight: 2 },
  { id: 'installation', canonical: 'installation requirements', forms: { en: ['installation', 'install', 'installed', 'mounting', 'mounted', 'erection', 'commissioning', 'laying', 'fixing', 'site work', 'civil work', 'foundation'], hi: ['स्थापना', 'लगाना', 'इंस्टालेशन', 'फिटिंग', 'कमीशनिंग'], hinglish: ['installation', 'lagana', 'lagwana', 'fitting', 'commissioning', 'mounting'] }, sectors: ['general'], category: 'installation', weight: 2 },
  { id: 'warranty', canonical: 'warranty', forms: { en: ['warranty', 'guarantee', 'defect liability', 'amc', 'maintenance', 'replacement'], hi: ['वारंटी', 'गारंटी', 'रखरखाव'], hinglish: ['warranty', 'guarantee', 'amc', 'rakhrakhav'] }, sectors: ['general'], category: 'warranty', weight: 1.5 },
  { id: 'lifetime', canonical: 'rated life', forms: { en: ['life', 'lifetime', 'burning hours', 'hours', 'hrs', 'l70', 'l80', 'lumen maintenance', 'service life', 'design life'], hi: ['जीवन', 'आयु', 'घंटे'], hinglish: ['life', 'lifetime', 'ghante', 'hours', 'umar'] }, sectors: ['general'], category: 'performance', weight: 1.5 },
  { id: 'quantity', canonical: 'quantity', forms: { en: ['quantity', 'qty', 'nos', 'numbers', 'units', 'pieces', 'pcs', 'lot', 'km', 'metre', 'meter', 'running metre'], hi: ['मात्रा', 'संख्या', 'नग'], hinglish: ['quantity', 'qty', 'nag', 'sankhya', 'kitne'] }, sectors: ['general'], category: 'quantity', weight: 1 },
  { id: 'tender', canonical: 'tender / procurement', forms: { en: ['tender', 'procurement', 'supply', 'supply and installation', 'bid', 'rfp', 'nit', 'purchase', 'sitc', 'rate contract', 'specification', 'specifications', 'technical specification'], hi: ['निविदा', 'खरीद', 'आपूर्ति', 'टेंडर', 'विनिर्देश'], hinglish: ['tender', 'kharid', 'kharidna', 'supply', 'nivida', 'specification'] }, sectors: ['general'], category: 'other', weight: 0.5 },
  { id: 'municipal', canonical: 'municipal / government buyer', forms: { en: ['municipal', 'municipality', 'nagar nigam', 'corporation', 'panchayat', 'psu', 'government', 'department', 'smart city', 'ulb'], hi: ['नगर निगम', 'नगरपालिका', 'सरकारी', 'पंचायत', 'विभाग'], hinglish: ['nagar nigam', 'nagarpalika', 'sarkari', 'panchayat', 'municipal', 'vibhag'] }, sectors: ['general'], category: 'other', weight: 0.5 },
];

/** Generic Hindi/Hinglish function words → English (used for normalisation). */
export const PHRASE_TRANSLATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bके लिए\b/g, replacement: 'for' },
  { pattern: /\bकी आवश्यकता\b/g, replacement: 'requirement' },
  { pattern: /\bचाहिए\b/g, replacement: 'required' },
  { pattern: /\bऔर\b/g, replacement: 'and' },
  { pattern: /\bके साथ\b/g, replacement: 'with' },
  { pattern: /\bवाला\b|\bवाली\b|\bवाले\b/g, replacement: '' },
  { pattern: /\bke liye\b/gi, replacement: 'for' },
  { pattern: /\bke liye\b/gi, replacement: 'for' },
  { pattern: /\bchahiye\b|\bchaahiye\b|\bchahiye\b/gi, replacement: 'required' },
  { pattern: /\bhona chahiye\b/gi, replacement: 'must be' },
  { pattern: /\baur\b/gi, replacement: 'and' },
  { pattern: /\bke saath\b|\bke sath\b/gi, replacement: 'with' },
  { pattern: /\bwala\b|\bwali\b|\bwale\b/gi, replacement: '' },
  { pattern: /\bkaun sa\b|\bkaunsa\b|\bkaun se\b/gi, replacement: 'which' },
  { pattern: /\bstandard\b|\bmanak\b|\bमानक\b/gi, replacement: 'standard' },
  { pattern: /\bhai\b|\bhain\b|\bhoga\b|\bhogi\b/gi, replacement: '' },
];

/** Romanised-Hindi tokens that signal Hinglish when found in Latin-script text. */
export const HINGLISH_MARKERS = new Set([
  'ke', 'ki', 'ka', 'liye', 'chahiye', 'chaahiye', 'hai', 'hain', 'aur', 'wala', 'wali', 'wale',
  'sadak', 'batti', 'bijli', 'pani', 'paani', 'taar', 'tar', 'khamba', 'kharid', 'nivida',
  'sarkari', 'manak', 'kaun', 'kaunsa', 'kya', 'kitne', 'lagana', 'jaanch', 'suraksha', 'saath',
  'sath', 'hona', 'wale', 'mein', 'me', 'par', 'se', 'ko', 'lohe', 'sona', 'gehne', 'nag',
]);
