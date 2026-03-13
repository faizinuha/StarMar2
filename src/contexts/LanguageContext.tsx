import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Language = 'en' | 'id' | 'ja' | 'ko' | 'zh' | 'es' | 'fr' | 'de' | 'ar' | 'hi' | 'pt' | 'ru' | 'th' | 'vi' | 'ms';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
];

// Translation cache to avoid re-translating
const translationCache = new Map<string, string>();

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: () => {},
  t: (text: string) => text,
});

export const useLanguage = () => useContext(LanguageContext);

// Google Translate via free endpoint
async function translateText(text: string, targetLang: string): Promise<string> {
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data[0]?.map((s: any) => s[0]).join('') || text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'id';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
    
    // Apply Google Translate to the page using the meta tag approach
    // This translates the entire DOM
    if (lang === 'id' || lang === 'en') {
      // Remove translate cookie/attribute for default languages
      document.documentElement.removeAttribute('lang');
      document.documentElement.lang = lang;
      // Remove Google Translate frame if exists
      const frame = document.querySelector('.skiptranslate');
      if (frame) (frame as HTMLElement).style.display = 'none';
      document.body.style.top = '0px';
    } else {
      document.documentElement.lang = lang;
    }
  }, []);

  // Use Google Translate widget approach for full page translation
  useEffect(() => {
    // Add Google Translate script
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { 
            pageLanguage: 'id',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      };
    }
  }, []);

  // When language changes, trigger Google Translate
  useEffect(() => {
    const triggerTranslate = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = language;
        select.dispatchEvent(new Event('change'));
      }
    };

    // Small delay to wait for GT to load
    const timer = setTimeout(triggerTranslate, 500);
    return () => clearTimeout(timer);
  }, [language]);

  // Simple pass-through t() function - Google Translate handles the DOM
  const t = useCallback((text: string) => text, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* Hidden element for Google Translate */}
      <div id="google_translate_element" style={{ display: 'none' }} />
      {children}
    </LanguageContext.Provider>
  );
};
