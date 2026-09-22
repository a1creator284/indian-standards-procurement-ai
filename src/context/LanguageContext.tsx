import { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
  [key: string]: string;
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.analyze': 'Analyze Specification',
    'nav.explorer': 'Standards Explorer',
    'nav.history': 'Search History',
    'nav.reports': 'Reports',
    'nav.recommendations': 'Recommendations',
    'nav.gaps': 'Gap Analysis',
    'nav.spec': 'Tender Specification',
    'nav.graph': 'Relationship Graph',
    'nav.about': 'About',
    'nav.settings': 'Settings',
    'nav.workflow': 'Workflow',
    'nav.knowledge': 'Knowledge Base',
    'action.askCopilot': 'Ask Copilot',
    'action.search': 'Search…',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.analyze': 'विनिर्देश विश्लेषण',
    'nav.explorer': 'मानक एक्सप्लोरर',
    'nav.history': 'खोज इतिहास',
    'nav.reports': 'रिपोर्ट',
    'nav.recommendations': 'सिफ़ारिशें',
    'nav.gaps': 'गैप विश्लेषण',
    'nav.spec': 'निविदा विनिर्देश',
    'nav.graph': 'संबंध ग्राफ़',
    'nav.about': 'हमारे बारे में',
    'nav.settings': 'सेटिंग्स',
    'nav.workflow': 'कार्यप्रवाह',
    'nav.knowledge': 'ज्ञान आधार',
    'action.askCopilot': 'कोपायलट से पूछें',
    'action.search': 'खोजें…',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return DICTIONARY[language][key] || DICTIONARY['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
