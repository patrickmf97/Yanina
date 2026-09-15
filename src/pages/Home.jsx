import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import fotoPadrao from '../assets/yanina.png'
import './Home.css'

export default function Home() {
  const { t } = useLanguage()
  const { user, signOut } = useAuth()
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    supabase
      .from('perfil_psicologa')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPerfil(data))
  }, [])

  // Enquanto não há nada salvo pelo admin, usa os textos padrão de content.js
  const nombre = perfil?.nombre || t.nombre
  const frase = perfil?.frase || t.frase
  const bio = perfil?.bio || t.bio
  const cita = perfil?.cita || t.cita
  const titulo = perfil?.titulo || t.titulo
  const ubicacion = perfil?.ubicacion || t.ubicacion
  const email = perfil?.email_contato
  const instagram = perfil?.instagram
  const foto = perfil?.foto_url || fotoPadrao

  return (
    <div className="page">
      <header className="nav">
        <span className="nav__brand">{nombre}</span>
        <div className="nav__right">
          <LangSwitch />
          {user ? (
            <button className="nav__cta nav__cta--ghost" onClick={signOut}>
              {t.botaoEntrar === 'Entrar' ? 'Sair' : 'Salir'}
            </button>
          ) : (
            <Link className="nav__cta nav__cta--ghost" to="/entrar">{t.loginTitulo}</Link>
          )}
          <Link className="nav__cta" to="/agendar">{t.navCta}</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{titulo}</p>
          <h1 className="hero__headline">{frase}</h1>
          <p className="hero__lead">{bio}</p>
          <Link className="hero__button" to="/agendar">{t.heroBtn}</Link>
        </div>
        <div className="hero__photo-wrap">
          <svg className="hero__blob" viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <path
              fill="var(--accent-soft)"
              d="M 320 90 C 370 140 380 230 330 290 C 280 350 180 370 120 330 C 60 290 40 200 80 130 C 120 60 270 40 320 90 Z"
            />
          </svg>
          <img className="hero__photo" src={foto} alt={nombre} />
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
        <p>“{cita}”</p>
      </section>

      <section id="agendar" className="agendamento-cta">
        <h2>{t.agendaTitulo}</h2>
        <p>{t.agendaTexto}</p>
        <Link className="hero__button" to="/agendar">{t.agendaBtn}</Link>
      </section>

      <footer className="footer">
        <p>{ubicacion}{email ? ` · ${email}` : ''}{instagram ? ` · ${instagram}` : ''}</p>
      </footer>
    </div>
  )
}
