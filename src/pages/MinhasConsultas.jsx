import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase, isConfigured } from "../lib/supabaseClient.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  formatSlot,
  startPayment,
  bookingError,
  safeMeetingUrl,
} from "../lib/booking.js";
import LangSwitch from "../components/LangSwitch.jsx";
import "./Agendar.css";
export default function MinhasConsultas() {
  const { t, lang } = useLanguage(),
    { user, session, loading: authLoading, signOut } = useAuth();
  const requestVersion = useRef(0);
  const [items, setItems] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const version = ++requestVersion.current;
    setError("");
    if (!isConfigured || !user) return;
    try {
      const { data, error } = await supabase.rpc("minhas_consultas");
      if (version !== requestVersion.current) return;
      if (error) setError(t.erroGenerico);
      else setItems(data || []);
    } catch {
      if (version === requestVersion.current) setError(t.erroGenerico);
    }
  }
  useEffect(() => {
    setItems(null);
    setError("");
    load();
    return () => {
      requestVersion.current++;
    };
  }, [user?.id, lang]);
  async function pay(id) {
    setBusy(id);
    setError("");
    try {
      const result = await startPayment(id, session);
      if (result) await load();
    } catch (e) {
      setError(bookingError(e, t));
    } finally {
      setBusy("");
    }
  }
  const statusName = {
    pendente_pago: t.pending,
    confirmada: t.confirmed,
    realizada: t.completed,
    cancelada: t.cancelledStatus,
  };
  return (
    <main className="agendar-page">
      <div className="page-top">
        <Link to="/">← {t.nombre}</Link>
        <div>
          <LangSwitch />
          {user && (
            <button className="inline-button" onClick={signOut}>
              {t.logout}
            </button>
          )}
        </div>
      </div>
      <div className="account-title">
        <div>
          <p className="eyebrow">{t.nombre}</p>
          <h1>{t.account}</h1>
        </div>
        <Link className="hero__button" to="/agendar">
          {t.navCta} ↗
        </Link>
      </div>
      <p className="booking-subtitle">
        {t.myIntro} {t.timezone}
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button className="inline-button" onClick={load}>
            {t.retry}
          </button>
        </p>
      )}
      {authLoading ? (
        <p className="notice">{t.loading}</p>
      ) : !user ? (
        <p className="notice">
          {t.precisaLogin} <Link to="/entrar">{t.loginTitulo}</Link>
        </p>
      ) : !items && !error ? (
        <p className="notice">{t.loading}</p>
      ) : items?.length === 0 ? (
        <p className="notice">{t.myEmpty}</p>
      ) : (
        <div className="consultation-list">
          {items?.map((c) => {
            const expired =
                c.status === "pendente_pago" &&
                c.reserva_expira_em &&
                new Date(c.reserva_expira_em) <= new Date(),
              link = safeMeetingUrl(c.link_chamada),
              payment =
                c.pagamentos?.find((p) => p.status === "aprovado") ||
                c.pagamentos?.[0];
            return (
              <article className="consultation-card" key={c.id}>
                <div>
                  <span className="status-badge">
                    {expired ? t.expired : statusName[c.status]}
                  </span>
                  <h2>{formatSlot(c.data_hora, lang)}</h2>
                  <p>
                    {t.duration}
                    {payment
                      ? ` · ${new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "es-AR", { style: "currency", currency: payment.moeda }).format(payment.valor)}`
                      : ""}
                  </p>
                  {payment?.status === "aprovado" &&
                    c.status === "cancelada" && (
                      <p className="notice">{t.paymentReview}</p>
                    )}
                </div>
                <div className="consultation-actions">
                  {c.status === "pendente_pago" &&
                    payment?.status === "processando" && <p>{t.paymentWait}</p>}
                  {c.status === "pendente_pago" &&
                    !expired &&
                    payment?.status !== "processando" && (
                      <button
                        className="hero__button"
                        disabled={Boolean(busy)}
                        onClick={() => pay(c.id)}
                      >
                        {busy === c.id ? t.loading : t.resume} ↗
                      </button>
                    )}
                  {["confirmada", "realizada"].includes(c.status) &&
                    (link ? (
                      <a
                        className="hero__button"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.join} ↗
                      </a>
                    ) : (
                      <p>{t.linkPending}</p>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
