import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function services() {
  const {
    STRIPE_SECRET_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SITE_URL,
  } = process.env;
  if (
    !STRIPE_SECRET_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !SITE_URL
  )
    throw new HttpError(503, "PAYMENTS_UNAVAILABLE");
  const origin = new URL(SITE_URL);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost")
    throw new HttpError(503, "PAYMENTS_UNAVAILABLE");
  return {
    stripe: new Stripe(STRIPE_SECRET_KEY),
    db: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    site: origin.origin,
  };
}
export async function authenticatedUser(req, db) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "AUTH_REQUIRED");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "AUTH_REQUIRED");
  return data.user;
}
export function fail(res, error) {
  // Never log SDK payloads, tokens, personal data or raw database errors.
  return res.status(error.status || 500).json({
    error: error instanceof HttpError ? error.message : "PAYMENT_ERROR",
  });
}
export async function fulfill(session, db) {
  if (session.payment_status !== "paid" || session.status !== "complete")
    return false;
  const { error } = await db.rpc("confirmar_pagamento_stripe", {
    p_session: session.id,
    p_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
    p_amount: session.amount_total,
    p_currency: session.currency,
  });
  if (error) throw new Error("FULFILLMENT_FAILED");
  return true;
}
export function validCheckoutUrl(value) {
  try {
    return (
      new URL(value).hostname === "checkout.stripe.com" &&
      new URL(value).protocol === "https:"
    );
  } catch {
    return false;
  }
}
