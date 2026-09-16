import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { formatSlot, safeMeetingUrl } from "../../lib/booking.js";
export default function Agendamentos() {
  const { t, lang } = useLanguage(),
    [items, setItems] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    const { data, error } = await supabase.rpc("consultas_admin");
    if (error) setError(t.erroGenerico);
    else setItems(data || []);
  }
  useEffect(() => {
    load();
  }, [lang]);
  async function update(e, c) {
    e.preventDefault();
    setBusy(c.id);
    setError("");
    const form = new FormData(e.currentTarget),
      link = String(form.get("link") || "").trim();
    if (link && !safeMeetingUrl(link)) {
      setError(
        lang === "pt"
          ? "Use um link HTTPS válido."
          : "Usá un enlace HTTPS válido.",
      );
      setBusy("");
      return;
    }
    const { error } = await supabase
      .from("consultas")
      .update({ status: form.get("status"), link_chamada: link || null })
      .eq("id", c.id);
    if (error) setError(t.erroGenerico);
    else await load();
    setBusy("");
  }
  const labels = {
    pendente_pago: t.pending,
    confirmada: t.confirmed,
    realizada: t.completed,
    cancelada: t.cancelledStatus,
  };
  return (
    <section>
      <p className="notice">{t.timezone}</p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {items === null ? (
        <p>{t.loading}</p>
      ) : items.length === 0 ? (
        <p>{t.agendamentosVazio}</p>
      ) : (
        <div className="admin-appointments">
          {items.map((c) => (
            <form
              key={c.id}
              className="admin-appointment"
              onSubmit={(e) => update(e, c)}
            >
              <div>
                <h3>{formatSlot(c.data_hora, lang)}</h3>
                <p>
                  {c.clientes?.nombre || "—"}
                  {c.clientes?.telefone ? ` · ${c.clientes.telefone}` : ""}
                </p>
                {c.status === "cancelada" &&
                  c.pagamentos?.some((p) => p.status === "aprovado") && (
                    <p className="notice error">{t.paymentReview}</p>
                  )}
              </div>
              <label>
                {t.colunaStatus}
                <select name="status" defaultValue={c.status}>
                  {Object.entries(labels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.videoLink}
                <input
                  name="link"
                  type="url"
                  placeholder="https://meet.google.com/…"
                  defaultValue={c.link_chamada || ""}
                />
              </label>
              <button className="auth-form__submit" disabled={Boolean(busy)}>
                {busy === c.id ? t.saving : t.botaoSalvar}
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
