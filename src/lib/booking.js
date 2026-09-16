export const TIME_ZONE = "America/Argentina/Buenos_Aires";
export function dayKey(iso) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const p = (k) => parts.find((x) => x.type === k).value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
export function formatSlot(iso, lang, options = {}) {
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "es-AR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(iso));
}
export function safeMeetingUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
export async function startPayment(id, session) {
  const response = await fetch("/api/criar-pagamento", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ consulta_id: id }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "PAYMENT_ERROR");
  if (json.paid) return "paid";
  if (json.pending) return "pending";
  const u = new URL(json.url);
  if (u.protocol !== "https:" || u.hostname !== "checkout.stripe.com")
    throw new Error("PAYMENT_ERROR");
  window.location.assign(u.href);
  return false;
}
export function bookingError(error, t) {
  const msg = error?.message || "";
  if (msg.includes("SLOT_TAKEN") || error?.code === "23505") return t.slotTaken;
  if (msg.includes("PENDING_RESERVATION")) return t.pendingExists;
  if (msg.includes("PRICE_UNAVAILABLE")) return t.priceUnavailable;
  if (msg.includes("PROFILE_REQUIRED")) return t.profileRequired;
  if (msg.includes("RESERVATION_EXPIRED")) return t.expired;
  return t.erroGenerico;
}
