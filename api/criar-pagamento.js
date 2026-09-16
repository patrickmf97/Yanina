import {
  services,
  authenticatedUser,
  HttpError,
  fail,
  fulfill,
  validCheckoutUrl,
} from "../server/payments.js";
export function createHandler(getServices = services) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    }
    try {
      const { db, stripe, site } = getServices();
      const user = await authenticatedUser(req, db);
      const id = req.body?.consulta_id;
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
        throw new HttpError(400, "INVALID_RESERVATION");
      const { data: consulta, error } = await db
        .from("consultas")
        .select("id,cliente_id,status,reserva_expira_em")
        .eq("id", id)
        .eq("cliente_id", user.id)
        .single();
      if (error || !consulta) throw new HttpError(404, "RESERVATION_NOT_FOUND");
      if (consulta.status !== "pendente_pago")
        throw new HttpError(409, "RESERVATION_NOT_PENDING");
      const { data: payment, error: paymentError } = await db
        .from("pagamentos")
        .select("*")
        .eq("consulta_id", id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();
      if (paymentError || !payment)
        throw new HttpError(409, "PAYMENT_NOT_FOUND");
      if (payment.stripe_checkout_session_id) {
        const existing = await stripe.checkout.sessions.retrieve(
          payment.stripe_checkout_session_id,
        );
        if (await fulfill(existing, db))
          return res.status(200).json({ paid: true });
        if (existing.status === "open" && validCheckoutUrl(existing.url))
          return res.status(200).json({ url: existing.url });
        if (
          existing.status === "complete" &&
          existing.payment_status === "unpaid"
        ) {
          const { error } = await db.rpc("processar_pagamento_stripe", {
            p_session: existing.id,
          });
          if (error) throw new Error("PROCESSING_FAILED");
          return res.status(200).json({ pending: true });
        }
        throw new HttpError(409, "RESERVATION_EXPIRED");
      }
      const expiry = Math.floor(
        new Date(consulta.reserva_expira_em).getTime() / 1000,
      );
      if (
        !Number.isFinite(expiry) ||
        expiry < Math.floor(Date.now() / 1000) + 1801
      )
        throw new HttpError(409, "RESERVATION_EXPIRED");
      const amount = Math.round(Number(payment.valor) * 100);
      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        !["ARS", "BRL", "USD", "EUR"].includes(payment.moeda)
      )
        throw new HttpError(503, "PRICE_UNAVAILABLE");
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          integration_identifier: "yanina-checkout-qhvrnmaz",
          locale: "auto",
          client_reference_id: id,
          metadata: { consulta_id: id, payment_id: payment.id },
          line_items: [
            {
              price_data: {
                currency: payment.moeda.toLowerCase(),
                unit_amount: amount,
                product_data: { name: "Sesión online · Yanina" },
              },
              quantity: 1,
            },
          ],
          expires_at: expiry,
          success_url: `${site}/agendar?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${site}/agendar?cancelado=1`,
        },
        { idempotencyKey: `yanina-checkout-${payment.id}` },
      );
      if (!validCheckoutUrl(session.url))
        throw new Error("INVALID_CHECKOUT_URL");
      const { error: saveError } = await db
        .from("pagamentos")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", payment.id);
      if (saveError) throw new Error("PAYMENT_SAVE_FAILED");
      return res.status(200).json({ url: session.url });
    } catch (error) {
      return fail(res, error);
    }
  };
}
export default createHandler();
