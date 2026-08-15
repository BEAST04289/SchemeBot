'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Global translations dictionary — add keys as needed
const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.home': { en: 'Home', hi: 'होम' },
  'nav.schemes': { en: 'Schemes', hi: 'योजनाएं' },
  'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'nav.login': { en: 'Login', hi: 'लॉगिन करें' },
  'nav.logout': { en: 'Logout', hi: 'लॉगआउट' },

  // Landing page
  'hero.title': { en: 'Find Government Schemes, Made Simple', hi: 'सरकारी योजनाओं की खोज, अब आसान' },
  'hero.sub': { en: 'Check your eligibility and discover the right welfare schemes in 2 minutes.', hi: 'अपनी पात्रता जांचें और 2 मिनट में सही कल्याणकारी योजनाएं खोजें।' },
  'hero.cta': { en: 'Check Now', hi: 'अभी जांचें' },
  'hero.whatsapp': { en: 'Chat on WhatsApp', hi: 'WhatsApp पर बात करें' },

  // Features
  'feat.eligibility.title': { en: 'Instant Eligibility Check', hi: 'त्वरित पात्रता जांच' },
  'feat.eligibility.desc': { en: 'Enter your details and instantly find out which schemes you qualify for.', hi: 'अपनी जानकारी दर्ज करें और तुरंत जानें कि आप किन योजनाओं के लिए पात्र हैं।' },
  'feat.docs.title': { en: 'Document Guidance', hi: 'दस्तावेज़ मार्गदर्शन' },
  'feat.docs.desc': { en: 'Complete list of required documents and step-by-step application process.', hi: 'हर योजना के लिए ज़रूरी कागजात की पूरी सूची और आवेदन प्रक्रिया।' },
  'feat.secure.title': { en: 'Safe & Secure', hi: 'सुरक्षित और विश्वसनीय' },
  'feat.secure.desc': { en: 'Your data is fully protected. We never store Aadhaar numbers.', hi: 'आपकी जानकारी पूरी तरह सुरक्षित है। हम कोई आधार नंबर स्टोर नहीं करते।' },

  // Categories
  'cat.title': { en: 'Who We Help', hi: 'हम किसकी मदद करते हैं' },
  'cat.farmers': { en: 'Farmers', hi: 'किसान' },
  'cat.women': { en: 'Women', hi: 'महिलाएं' },
  'cat.students': { en: 'Students', hi: 'छात्र' },
  'cat.seniors': { en: 'Senior Citizens', hi: 'वरिष्ठ नागरिक' },
  'cat.workers': { en: 'Workers', hi: 'श्रमिक' },
  'cat.entrepreneurs': { en: 'Entrepreneurs', hi: 'उद्यमी' },

  // Pricing
  'pricing.title': { en: 'Simple Pricing', hi: 'सरल मूल्य निर्धारण' },
  'pricing.sub': { en: 'First search is free. Upgrade for more.', hi: 'पहली खोज मुफ्त। अधिक के लिए अपग्रेड करें।' },
  'pricing.free': { en: 'Free', hi: 'मुफ्त' },
  'pricing.pro': { en: 'Pro', hi: 'प्रो' },
  'pricing.free.f1': { en: '1 eligibility search', hi: '1 पात्रता खोज' },
  'pricing.free.f2': { en: 'Chat assistant', hi: 'चैट सहायक' },
  'pricing.pro.f1': { en: 'Unlimited searches', hi: 'असीमित खोज' },
  'pricing.pro.f2': { en: 'Reminders & tracking', hi: 'अनुस्मारक और ट्रैकिंग' },
  'pricing.pro.f3': { en: 'Priority support', hi: 'प्राथमिकता सहायता' },
  'pricing.startfree': { en: 'Start Free', hi: 'मुफ्त शुरू करें' },
  'pricing.upgrade': { en: 'Upgrade', hi: 'अपग्रेड करें' },

  // Auth
  'auth.title': { en: 'Verify Identity', hi: 'पहचान सत्यापित करें' },
  'auth.sub': { en: 'Enter your mobile to access welfare benefits.', hi: 'सरकारी योजनाओं का लाभ उठाने के लिए अपना मोबाइल दर्ज करें।' },
  'auth.phone': { en: 'Mobile Number', hi: 'मोबाइल नंबर' },
  'auth.login': { en: 'Login', hi: 'लॉगिन करें' },

  // Dashboard
  'dash.chat': { en: 'AI Chat Assistant', hi: 'चैट खोजक' },
  'dash.quiz': { en: 'Quick Match', hi: 'त्वरित खोज' },
  'dash.tracker': { en: 'Tracker', hi: 'ट्रैकर' },
  'dash.impact': { en: 'Impact Board', hi: 'प्रभाव बोर्ड' },
  'dash.profile': { en: 'Profile', hi: 'प्रोफ़ाइल' },
  'dash.plans': { en: 'Plans', hi: 'योजनाएं' },
  'dash.search': { en: 'Find Results', hi: 'परिणाम खोजें' },
  'dash.searching': { en: 'SEARCHING...', hi: 'खोज रहे हैं...' },
  'dash.matches': { en: 'Matches Found!', hi: 'बधाई हो!' },
  'dash.select_state': { en: 'Please select the state you belong to', hi: 'बताइए, आप किस राज्य से हैं?' },
  'dash.select_occupation': { en: 'What is your main occupation?', hi: 'आपकी मुख्य श्रेणी क्या है?' },
  'dash.enter_income': { en: 'Enter Family Annual Income', hi: 'वार्षिक पारिवारिक आय (INR)' },

  // Common
  'govt.bar': { en: 'GOVERNMENT OF INDIA', hi: 'भारत सरकार' },
  'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('hi');

  useEffect(() => {
    const saved = localStorage.getItem('sarthi_lang') as Language | null;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sarthi_lang', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
