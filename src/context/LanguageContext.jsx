import { createContext, useContext, useState } from 'react'
import { content } from '../content.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('lang') || 'es'
    } catch {
      return 'es'
    }
  })

  const changeLang = (newLang) => {
    setLang(newLang)
    try {
      localStorage.setItem('lang', newLang)
    } catch {
      // ambiente sem localStorage disponível — segue sem persistir
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t: content[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage precisa estar dentro de <LanguageProvider>')
  return ctx
}
