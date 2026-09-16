import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, isConfigured } from "../lib/supabaseClient.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import LangSwitch from "../components/LangSwitch.jsx";
import "./Auth.css";

export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    if (!isConfigured) {
      setErro(t.notConfigured);
      setCarregando(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setCarregando(false);
    if (error) {
      setErro(t.erroGenerico);
      return;
    }
    navigate("/agendar");
  }

  return (
    <div className="auth-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link className="auth-page__back" to="/">
          ← {t.nombre}
        </Link>
        <LangSwitch />
      </div>

      <h1>{t.loginTitulo}</h1>
      <p className="auth-page__subtitle">{t.loginSubtitulo}</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t.campoEmail}
          <input
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t.campoSenha}
          <input
            autoComplete="current-password"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>

        {erro && (
          <p className="auth-form__error" role="alert">
            {erro}
          </p>
        )}

        <button
          className="auth-form__submit"
          type="submit"
          disabled={carregando}
        >
          {t.botaoEntrar}
        </button>
      </form>
      <p className="auth-page__switch">
        <Link to="/recuperar">{t.forgot}</Link>
      </p>

      <p className="auth-page__switch">
        <Link to="/cadastro">{t.linkParaCadastro}</Link>
      </p>
    </div>
  );
}
