import { services, fulfill } from "../server/payments.js";
export const config = { api: { bodyParser: false } };
export function createHandler(
  getServices = services,
  secret = () => process.env.STRIPE_WEBHOOK_SECRET,
) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).end();
    }
    let stripe, db, event;
    try {
      ({ stripe, db } = getServices());
      if (!secret())
        return res.status(503).json({ error: "WEBHOOK_UNAVAILABLE" });
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        const b = Buffer.from(chunk);
        size += b.length;
        if (size > 1024 * 1024) return res.status(413).end();
        chunks.push(b);
      }
      event = stripe.webhooks.constructEvent(
        Buffer.concat(chunks),
        req.headers["stripe-signature"],
        secret(),
      );
    } catch {
      return res.status(400).json({ error: "INVALID_WEBHOOK" });
    }
    try {
      if (
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "checkout.session.expired",
          "checkout.session.async_payment_failed",
        ].includes(event.type)
      ) {
        // Ignore events belonging to other applications sharing this Stripe account.
        if (
          !event.data.object.metadata?.consulta_id ||
          !event.data.object.metadata?.payment_id
        )
          return res.status(200).json({ received: true });
        const session = await stripe.checkout.sessions.retrieve(
          event.data.object.id,
        );
        if (
          (event.type === "checkout.session.expired" &&
            session.status === "expired") ||
          (event.type === "checkout.session.async_payment_failed" &&
            session.payment_status !== "paid")
        ) {
          const { error } = await db.rpc("expirar_reserva_stripe", {
            p_session: session.id,
          });
          if (error) throw new Error("EXPIRY_FAILED");
        } else if (
          session.status === "complete" &&
          session.payment_status === "unpaid"
        ) {
          const { error } = await db.rpc("processar_pagamento_stripe", {
            p_session: session.id,
          });
          if (error) throw new Error("PROCESSING_FAILED");
        } else await fulfill(session, db);
      }
      return res.status(200).json({ received: true });
    } catch {
      return res.status(500).json({ error: "RETRY_WEBHOOK" });
    }
  };
}
export default createHandler();
