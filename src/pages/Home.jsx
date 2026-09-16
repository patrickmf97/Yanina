import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, isConfigured } from "../lib/supabaseClient.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import LangSwitch from "../components/LangSwitch.jsx";
import fotoPadrao from "../assets/yanina.png";
import "./Home.css";
export default function Home() {
  const { t, lang } = useLanguage(),
    { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    supabase
      .from("perfil_psicologa")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setPerfil(data);
      });
    return () => {
      active = false;
    };
  }, []);
  const localized = (key, fallback) =>
    lang === "pt"
      ? perfil?.[`${key}_pt`] || fallback
      : perfil?.[key] || fallback;
  const nombre = perfil?.nombre || t.nombre,
    bio = localized("bio", t.bio),
    frase = localized("frase", null),
    cita = localized("cita", t.cita),
    titulo = localized("titulo", t.titulo);
  const image = perfil?.foto_url?.startsWith("https://")
    ? perfil.foto_url
    : fotoPadrao;
  const instagram = perfil?.instagram?.replace(/^@/, "");
  const instaUrl =
    instagram && /^[a-zA-Z0-9_.]+$/.test(instagram)
      ? `https://instagram.com/${instagram}`
      : null;
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        {t.approach}
      </a>
      <header className="nav">
        <Link to="/" className="nav__brand">
          <span className="brand-symbol" aria-hidden="true">
            y.
          </span>
          <span>
            {nombre}
            <small>PSICOLOGÍA & BIENESTAR</small>
          </span>
        </Link>
        <nav
          className="nav__links"
          aria-label={
            lang === "pt" ? "Navegação principal" : "Navegación principal"
          }
        >
          <a href="#sobre">{t.about}</a>
          <a href="#acompanamiento">{t.approach}</a>
          <a href="#como">{t.how}</a>
        </nav>
        <div className="nav__right">
          <LangSwitch />
          <Link
            className="nav__cta nav__cta--ghost"
            to={user ? "/mis-consultas" : "/entrar"}
          >
            {user ? t.account : t.loginTitulo}
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero__text">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="hero__headline">
              {frase || (
                <>
                  {t.heroTitle}
                  <br />
                  <em>{t.heroEm}</em>
                </>
              )}
            </h1>
            <p className="hero__lead">{bio}</p>
            <Link className="hero__button" to="/agendar">
              {t.heroBtn}
              <span>↗</span>
            </Link>
            <p className="hero__note">{t.heroNote}</p>
          </div>
          <div className="hero__photo-wrap">
            <div className="photo-orbit" aria-hidden="true" />
            <img
              className="hero__photo"
              src={image}
              onError={(e) => {
                e.currentTarget.src = fotoPadrao;
              }}
              alt={nombre}
              fetchpriority="high"
            />
            <div className="photo-caption">
              <span className="little-flower" aria-hidden="true">
                ✳
              </span>
              <span>
                {nombre}
                <small>{titulo}</small>
              </span>
            </div>
          </div>
        </section>
        <div className="care-strip">
          <span>◌ &nbsp; {t.online}</span>
          <span>◷ &nbsp; {t.duration}</span>
          <span>↔ &nbsp; {t.language}</span>
        </div>
        <section className="especialidades" id="acompanamiento">
          <p className="eyebrow">{t.meet}</p>
          <h2>
            {t.approachTitle}
            <br />
            <em>{t.approachEm}</em>
          </h2>
          <div className="especialidades__grid">
            {t.especialidades.map((item, i) => (
              <article key={item.titulo} className="especialidade">
                <span className="specialty-icon" aria-hidden="true">
                  {["◌", "⌁", "✳"][i]}
                </span>
                <h3>{item.titulo}</h3>
                <p>{item.desc}</p>
                <span className="specialty-number">0{i + 1}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="about" id="sobre">
          <div className="about-art" aria-hidden="true">
            <div className="arch arch-one" />
            <div className="arch arch-two" />
            <span>
              {lang === "pt" ? "um espaço" : "un espacio"}
              <br />
              <em>{lang === "pt" ? "para ser." : "para ser."}</em>
            </span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">
              {t.aboutLabel} {nombre.toUpperCase()}
            </p>
            <h2>
              {t.aboutTitle}
              <br />
              <em>{t.aboutEm}</em>
            </h2>
            <p>{bio}</p>
            <blockquote>“{cita}”</blockquote>
            <span className="about-signature">{nombre}</span>
            <p className="about-location">{perfil?.ubicacion || t.ubicacion}</p>
          </div>
        </section>
        <section className="how-section" id="como">
          <p className="eyebrow">{t.howLabel}</p>
          <h2>{t.howTitle}</h2>
          <div className="how-grid">
            {t.steps.map(([title, desc], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="home-faq">
          <h2>{t.faq}</h2>
          <div>
            {t.questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="agendamento-cta">
          <span aria-hidden="true" className="cta-flower">
            ✳
          </span>
          <p className="eyebrow">{t.online}</p>
          <h2>
            {t.ready}
            <br />
            <em>{t.readyEm}</em>
          </h2>
          <p>{t.readyText}</p>
          <Link className="hero__button" to="/agendar">
            {t.agendaBtn}
            <span>↗</span>
          </Link>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-brand">
          {nombre}
          <small>{perfil?.ubicacion || t.footer}</small>
        </div>
        <div>
          {perfil?.email_contato && (
            <a href={`mailto:${perfil.email_contato}`}>
              {perfil.email_contato}
            </a>
          )}
          {instaUrl && (
            <a href={instaUrl} target="_blank" rel="noopener noreferrer">
              Instagram ↗
            </a>
          )}
          <Link to="/admin">{t.admin}</Link>
        </div>
        <span>
          © {new Date().getFullYear()} {nombre}
        </span>
      </footer>
    </div>
  );
}
