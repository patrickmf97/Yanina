import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function PerfilForm() {
  const { t, lang } = useLanguage();
  const [perfil, setPerfil] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase
      .from("perfil_psicologa")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setMsg(t.erroGenerico);
          return;
        }
        setPerfil(
          data ?? {
            nombre: "",
            titulo: "",
            bio: "",
            frase: "",
            cita: "",
            foto_url: "",
            email_contato: "",
            instagram: "",
            ubicacion: "",
            precio_consulta: "",
            moeda_consulta: "ARS",
            frase_pt: "",
            bio_pt: "",
            cita_pt: "",
            titulo_pt: "",
          },
        );
      });
  }, []);

  function campo(nome, valor) {
    setPerfil((p) => ({ ...p, [nome]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg("");

    const payload = {
      ...perfil,
      precio_consulta: Number(perfil.precio_consulta) || 0,
      actualizado_em: new Date().toISOString(),
    };

    let error;
    if (perfil.id) {
      ({ error } = await supabase
        .from("perfil_psicologa")
        .update(payload)
        .eq("id", perfil.id));
    } else {
      const resp = await supabase
        .from("perfil_psicologa")
        .insert(payload)
        .select()
        .single();
      error = resp.error;
      if (resp.data) setPerfil(resp.data);
    }

    setSalvando(false);
    setMsg(error ? t.erroGenerico : t.guardadoOk);
  }

  if (!perfil)
    return (
      <p className="notice" role="status">
        {msg || t.loading}
      </p>
    );

  return (
    <form className="admin-form" onSubmit={salvar}>
      <label>
        {t.campoNombre}
        <input
          required
          value={perfil.nombre ?? ""}
          onChange={(e) => campo("nombre", e.target.value)}
        />
      </label>
      <label>
        {t.titleField}
        <input
          value={perfil.titulo ?? ""}
          onChange={(e) => campo("titulo", e.target.value)}
        />
      </label>
      <p className="notice">
        {lang === "pt"
          ? "Textos principais em espanhol. Traduções em português abaixo."
          : "Textos principales en español. Traducciones en portugués al final."}
      </p>
      <label>
        {t.campoFrase}
        <input
          value={perfil.frase ?? ""}
          onChange={(e) => campo("frase", e.target.value)}
        />
      </label>
      <label>
        {t.campoBio}
        <textarea
          value={perfil.bio ?? ""}
          onChange={(e) => campo("bio", e.target.value)}
        />
      </label>
      <label>
        {t.campoCita}
        <input
          value={perfil.cita ?? ""}
          onChange={(e) => campo("cita", e.target.value)}
        />
      </label>
      <label>
        {t.campoFotoUrl}
        <input
          type="url"
          value={perfil.foto_url ?? ""}
          onChange={(e) => campo("foto_url", e.target.value)}
        />
      </label>
      <label>
        {lang === "pt" ? "Preço da consulta" : "Precio de la consulta"}
        <input
          type="number"
          min="0"
          step="0.01"
          value={perfil.precio_consulta ?? ""}
          onChange={(e) => campo("precio_consulta", e.target.value)}
        />
      </label>
      <label>
        {t.campoEmail}
        <input
          type="email"
          value={perfil.email_contato ?? ""}
          onChange={(e) => campo("email_contato", e.target.value)}
        />
      </label>
      <label>
        {t.campoInstagram}
        <input
          value={perfil.instagram ?? ""}
          onChange={(e) => campo("instagram", e.target.value)}
        />
      </label>
      <label>
        {t.locationField}
        <input
          value={perfil.ubicacion ?? ""}
          onChange={(e) => campo("ubicacion", e.target.value)}
        />
      </label>

      <label>
        {t.currency}
        <select
          value={perfil.moeda_consulta || "ARS"}
          onChange={(e) => campo("moeda_consulta", e.target.value)}
        >
          {["ARS", "BRL", "USD", "EUR"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <fieldset className="translation-fields">
        <legend>Português</legend>
        {[
          ["titulo_pt", t.titleField],
          ["frase_pt", t.campoFrase],
          ["bio_pt", t.campoBio],
          ["cita_pt", t.campoCita],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              value={perfil[key] || ""}
              onChange={(e) => campo(key, e.target.value)}
            />
          </label>
        ))}
      </fieldset>
      <button className="auth-form__submit" type="submit" disabled={salvando}>
        {t.botaoSalvar}
      </button>
      {msg && <p className="admin-msg">{msg}</p>}
    </form>
  );
}
