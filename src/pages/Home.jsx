import { useState } from 'react'
import { content } from '../content.js'
import foto from '../assets/yanina.png'
import './Home.css'

export default function Home() {
  const [lang, setLang] = useState('es')
  const t = content[lang]

  return (
    <div className="page">
      <header className="nav">
        <span className="nav__brand">{t.nombre}</span>
        <div className="nav__right">
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
          <a className="nav__cta" href="#agendar">{t.navCta}</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{t.titulo}</p>
          <h1 className="hero__headline">{t.frase}</h1>
          <p className="hero__lead">{t.bio}</p>
          <a className="hero__button" href="#agendar">{t.heroBtn}</a>
        </div>
        <div className="hero__photo-wrap">
          <svg className="hero__blob" viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <path
              fill="var(--accent-soft)"
              d="M 320 90 C 370 140 380 230 330 290 C 280 350 180 370 120 330 C 60 290 40 200 80 130 C 120 60 270 40 320 90 Z"
            />
          </svg>
          <img className="hero__photo" src={foto} alt={t.nombre} />
        </div>
      </section>

      <section className="especialidades">
        <h2>{t.especialidadesTitulo}</h2>
        <div className="especialidades__grid">
          {t.especialidades.map((item) => (
            <article key={item.titulo} className="especialidade">
              <h3>{item.titulo}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cita">
        <p>“{t.cita}”</p>
      </section>

      <section id="agendar" className="agendamento-cta">
        <h2>{t.agendaTitulo}</h2>
        <p>{t.agendaTexto}</p>
        <a className="hero__button" href="/agendar">{t.agendaBtn}</a>
      </section>

      <footer className="footer">
        <p>{t.ubicacion}</p>
      </footer>
    </div>
  )
}
