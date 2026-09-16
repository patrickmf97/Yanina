import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase, isConfigured } from "../lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  dayKey,
  formatSlot,
  startPayment,
  bookingError,
} from "../lib/booking.js";
import LangSwitch from "../components/LangSwitch.jsx";
import "./Agendar.css";
export default function Agendar() {
  const { t, lang } = useLanguage(),
    { user, session } = useAuth(),
    [params] = useSearchParams();
  const [slots, setSlots] = useState([]),
    [price, setPrice] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [paymentMessage, setPaymentMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!isConfigured) {
      setError(t.unavailable);
      setLoading(false);
      return;
    }
    try {
      const [availability, profile] = await Promise.all([
        supabase.rpc("horarios_livres"),
        supabase
          .from("perfil_psicologa")
          .select("precio_consulta,moeda_consulta")
          .limit(1)
          .maybeSingle(),
      ]);
      if (availability.error || profile.error) throw new Error();
      setSlots(
        (availability.data || []).filter(
          (s) => new Date(s.data_hora) > new Date(),
        ),
      );
      setPrice(profile.data);
    } catch {
      setError(t.unavailable);
    } finally {
      setLoading(false);
    }
  }, [t.unavailable]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const id = params.get("session_id");
    if (!id || !session) return;
    let active = true;
    setPaymentMessage(t.paymentWait);
    fetch(`/api/status-pagamento?session_id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (active) {
          setPaymentMessage(
            data.confirmed
              ? t.pagoOkMsg
              : data.paid
                ? t.paymentReview
                : t.paymentWait,
          );
          load();
        }
      })
      .catch(() => {
        if (active) setPaymentMessage(t.statusError);
      });
    return () => {
      active = false;
    };
  }, [
    params,
    session,
    t.paymentWait,
    t.pagoOkMsg,
    t.paymentReview,
    t.statusError,
    load,
  ]);
  async function confirm() {
    if (!session || !selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error: reservationError } = await supabase.rpc(
        "reservar_consulta",
        { p_data_hora: selected },
      );
      if (reservationError) throw reservationError;
      const result = await startPayment(data, session);
      if (result) {
        setPaymentMessage(result === "paid" ? t.pagoOkMsg : t.paymentWait);
        setSelected("");
        await load();
      }
    } catch (e) {
      setError(bookingError(e, t));
    } finally {
      setBusy(false);
    }
  }
  const groups = slots.reduce((all, s) => {
    (all[dayKey(s.data_hora)] ||= []).push(s);
    return all;
  }, {});
  const canPay =
    Number(price?.precio_consulta) > 0 &&
    ["ARS", "BRL", "USD", "EUR"].includes(price?.moeda_consulta);
  return (
    <main className="agendar-page">
      <div className="page-top">
        <Link to="/">← {t.nombre}</Link>
        <div>
          <Link to={user ? "/mis-consultas" : "/entrar"}>
            {user ? t.account : t.loginTitulo}
          </Link>
          <LangSwitch />
        </div>
      </div>
      <p className="eyebrow">{t.online} · 50 MIN</p>
      <h1>{t.agendarTitulo}</h1>
      <p className="booking-subtitle">{t.timezone}</p>
      {paymentMessage && (
        <p className="notice" role="status">
          {paymentMessage} <Link to="/mis-consultas">{t.account} ↗</Link>
        </p>
      )}
      {params.has("cancelado") && (
        <p className="notice">
          {t.cancelled} <Link to="/mis-consultas">{t.account} ↗</Link>
        </p>
      )}
      <div className="booking-layout">
        <section aria-label={t.choose}>
          {loading ? (
            <p className="notice" role="status">
              {t.loading}
            </p>
          ) : error && slots.length === 0 ? (
            <div className="notice error" role="alert">
              {error}{" "}
              <button className="inline-button" onClick={load}>
                {t.retry}
              </button>
            </div>
          ) : slots.length === 0 ? (
            <p className="notice">{t.empty}</p>
          ) : (
            <div className="agendar-grid">
              {Object.entries(groups).map(([day, list]) => (
                <div className="agendar-dia" key={day}>
                  <h3>
                    {formatSlot(list[0].data_hora, lang, {
                      weekday: "long",
                      hour: undefined,
                      minute: undefined,
                    })}
                  </h3>
                  <div className="agendar-slots">
                    {list.map((s) => (
                      <button
                        aria-pressed={selected === s.data_hora}
                        className={
                          selected === s.data_hora
                            ? "agendar-slot is-selected"
                            : "agendar-slot"
                        }
                        key={s.data_hora}
                        onClick={() => setSelected(s.data_hora)}
                        disabled={busy}
                      >
                        {formatSlot(s.data_hora, lang, {
                          day: undefined,
                          month: undefined,
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <aside className="booking-summary">
          <span className="booking-symbol" aria-hidden="true">
            ◷
          </span>
          <h2>{t.selected}</h2>
          <p>{t.agendarSubtitulo}</p>
          <div className="booking-price">
            <span>{t.price}</span>
            <strong>
              {canPay
                ? new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "es-AR", {
                    style: "currency",
                    currency: price.moeda_consulta,
                  }).format(price.precio_consulta)
                : "—"}
            </strong>
          </div>
          <p className="chosen-slot">
            {selected ? formatSlot(selected, lang) : t.choose}
          </p>
          <p className="booking-note">{t.bookingNote}</p>
          {!user ? (
            <>
              <p className="muted">{t.precisaLogin}</p>
              <Link className="hero__button" to="/entrar">
                {t.loginTitulo} ↗
              </Link>
            </>
          ) : (
            <button
              className="hero__button"
              onClick={confirm}
              disabled={!selected || busy || !canPay}
            >
              {busy ? t.loading : t.confirmarAgendamento} ↗
            </button>
          )}
          {!canPay && !loading && <p className="muted">{t.priceUnavailable}</p>}
          {error && slots.length > 0 && (
            <p className="notice error" role="alert">
              {error} <Link to="/mis-consultas">{t.account}</Link>
            </p>
          )}
          <p className="checkout-provider">{t.security}</p>
        </aside>
      </div>
    </main>
  );
}
