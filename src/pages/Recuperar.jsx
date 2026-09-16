import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase, isConfigured } from "../lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import LangSwitch from "../components/LangSwitch.jsx";
import "./Auth.css";
export default function Recuperar() {
  const { t } = useLanguage(),
    { session } = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    updating = location.pathname === "/redefinir-senha";
  const [value, setValue] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setMessage("");
    if (!isConfigured) {
      setMessage(t.notConfigured);
      return;
    }
    setBusy(true);
    try {
      if (updating) {
        if (!session) throw new Error();
        const { error } = await supabase.auth.updateUser({ password: value });
        if (error) throw error;
        navigate("/mis-consultas");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          value.trim(),
          { redirectTo: `${window.location.origin}/redefinir-senha` },
        );
        if (error) throw error;
        setMessage(t.resetSent);
      }
    } catch {
      setMessage(t.erroGenerico);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="page-top">
        <Link to="/">← {t.nombre}</Link>
        <LangSwitch />
      </div>
      <p className="eyebrow">{t.account}</p>
      <h1>{updating ? t.newPassword : t.resetTitle}</h1>
      <p className="auth-page__subtitle">
        {updating && !session ? t.resetExpired : t.forgot}
      </p>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {updating ? t.newPassword : t.campoEmail}
          <input
            type={updating ? "password" : "email"}
            autoComplete={updating ? "new-password" : "email"}
            minLength={updating ? 8 : undefined}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button
          className="auth-form__submit"
          disabled={busy || (updating && !session)}
        >
          {busy ? t.loading : updating ? t.savePassword : t.resetSend}
        </button>
      </form>
      <p className="auth-page__switch">
        <Link to="/entrar">{t.linkParaLogin}</Link>
      </p>
    </main>
  );
}
