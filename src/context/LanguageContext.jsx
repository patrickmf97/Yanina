import { createContext, useContext, useState, useEffect } from "react";
import { ui } from "../ui.js";
import { content } from "../content.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("lang") === "pt" ? "pt" : "es";
    } catch {
      return "es";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "es-AR";
  }, [lang]);

  const changeLang = (newLang) => {
    if (!["es", "pt"].includes(newLang)) return;
    setLang(newLang);
    try {
      localStorage.setItem("lang", newLang);
    } catch {
      // ambiente sem localStorage disponível — segue sem persistir
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: changeLang,
        t: { ...content[lang], ...ui[lang] },
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage precisa estar dentro de <LanguageProvider>");
  return ctx;
}
