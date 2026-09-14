import { useLanguage } from '../context/LanguageContext.jsx'

export default function LangSwitch() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="lang-switch" role="group" aria-label="Idioma / Idioma">
      <button
        className={lang === 'es' ? 'lang-switch__btn is-active' : 'lang-switch__btn'}
        onClick={() => setLang('es')}
        aria-pressed={lang === 'es'}
      >
        ES
      </button>
      <button
        className={lang === 'pt' ? 'lang-switch__btn is-active' : 'lang-switch__btn'}
        onClick={() => setLang('pt')}
        aria-pressed={lang === 'pt'}
      >
        PT
      </button>
    </div>
  )
}
