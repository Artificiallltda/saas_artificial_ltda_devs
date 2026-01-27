import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  dictionaries,
  LANGUAGE_STORAGE_KEY
} from "../i18n";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && dictionaries[saved]) setLanguage(saved);
  }, []);

  const changeLanguage = (lang) => {
    if (!dictionaries[lang]) return;
    setLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key, params = undefined) => {
    const dict = dictionaries[language] || {};
    const template = dict[key] ?? key;
    if (!params) return template;

    return Object.keys(params).reduce((acc, paramKey) => {
      const value = params[paramKey];
      return acc.replaceAll(`{${paramKey}}`, String(value));
    }, template);
  };

  const value = useMemo(
    () => ({ language, changeLanguage, t }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}