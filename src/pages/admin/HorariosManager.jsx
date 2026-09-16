import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
const DIAS = {
  es: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  pt: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
};
export default function HorariosManager() {
  const { t, lang } = useLanguage(),
    [items, setItems] = useState(null),
    [day, setDay] = useState("1"),
    [time, setTime] = useState("14:00"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const { data, error } = await supabase
      .from("disponibilidade")
      .select("*")
      .order("dia_semana")
      .order("hora");
    if (error) setError(t.erroGenerico);
    else setItems(data || []);
  }
  useEffect(() => {
    load();
  }, [lang]);
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (
      items?.some(
        (h) => h.dia_semana === Number(day) && h.hora.slice(0, 5) === time,
      )
    ) {
      setError(
        lang === "pt" ? "Esse horário já existe." : "Ese horario ya existe.",
      );
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("disponibilidade")
      .insert({ dia_semana: Number(day), hora: time, ativo: true });
    if (error) setError(t.erroGenerico);
    else await load();
    setBusy(false);
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("disponibilidade")
      .delete()
      .eq("id", id);
    if (error) setError(t.erroGenerico);
    else await load();
    setBusy(false);
  }
  return (
    <section>
      <p className="notice">{t.timezone}</p>
      <form className="horario-form" onSubmit={add}>
        <label>
          {t.diaSemanaLabel}
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {DIAS[lang].map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.horaLabel}
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <button className="auth-form__submit" disabled={busy || items === null}>
          {busy ? t.saving : t.botaoAdicionar}
        </button>
      </form>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {items === null ? (
        <p>{t.loading}</p>
      ) : items.length === 0 ? (
        <p>{t.horariosVazio}</p>
      ) : (
        <div className="horario-lista">
          {items.map((h) => (
            <div className="horario-item" key={h.id}>
              <span>
                {DIAS[lang][h.dia_semana]} — {h.hora.slice(0, 5)}
              </span>
              <button disabled={busy} onClick={() => remove(h.id)}>
                {t.botaoRemover}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
