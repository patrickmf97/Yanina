import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import Stripe from "stripe";
import { createHandler as createCheckout } from "../api/criar-pagamento.js";
import { createHandler as createStatus } from "../api/status-pagamento.js";
import { createHandler as createWebhook } from "../api/webhook-stripe.js";
import { validCheckoutUrl, services } from "../server/payments.js";
const userId = "00000000-0000-4000-8000-000000000001",
  reservationId = "00000000-0000-4000-8000-000000000002";
function fixture(options = {}) {
  const calls = [];
  const reservation = {
    id: reservationId,
    cliente_id: userId,
    status: "pendente_pago",
    reserva_expira_em: new Date(Date.now() + 35 * 60000).toISOString(),
    ...options.reservation,
  };
  const payment = {
    id: "payment1",
    consulta_id: reservationId,
    valor: 12000,
    moeda: "ARS",
    status: "pendente",
    stripe_checkout_session_id: options.existing ? "cs_test_fixture" : null,
    ...options.payment,
  };
  const session = {
    id: "cs_test_fixture",
    url: "https://checkout.stripe.com/c/pay/fixture",
    status: "open",
    payment_status: "unpaid",
    amount_total: 1200000,
    currency: "ars",
    payment_intent: "pi_fixture",
    metadata: { consulta_id: reservationId, payment_id: "payment1" },
    ...options.session,
  };
  const db = {
    auth: {
      getUser: async (token) =>
        token === "valid"
          ? { data: { user: { id: userId } } }
          : { data: { user: null }, error: { message: "invalid" } },
    },
    from(table) {
      const filters = [];
      let update;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push([k, v]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        update(value) {
          update = value;
          return q;
        },
        single: async () => {
          if (options.dbError) return { error: { message: "private failure" } };
          let row =
            table === "consultas"
              ? reservation
              : { ...payment, consultas: reservation };
          if (
            filters.some(
              ([k, v]) =>
                (k === "consultas.cliente_id"
                  ? reservation.cliente_id
                  : row[k]) !== v,
            )
          )
            return { data: null, error: {} };
          return { data: row };
        },
        then(resolve) {
          calls.push({ update, table });
          if (update) Object.assign(payment, update);
          return Promise.resolve({ error: options.saveError ? {} : null }).then(
            resolve,
          );
        },
      };
      return q;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (options.rpcError)
        return { error: { message: "private database detail" } };
      if (name === "confirmar_pagamento_stripe") {
        payment.status = "aprovado";
        if (reservation.status === "pendente_pago")
          reservation.status = "confirmada";
      }
      return { data: null, error: null };
    },
  };
  const stripe = {
    checkout: {
      sessions: {
        create: async (params, opts) => {
          calls.push({ create: params, opts });
          if (options.stripeError) throw new Error("private stripe detail");
          return session;
        },
        retrieve: async (id) => {
          calls.push({ retrieve: id });
          if (options.stripeError) throw new Error("private stripe detail");
          return session;
        },
      },
    },
    webhooks: new Stripe("sk_test_fixture_not_a_real_key").webhooks,
  };
  return {
    calls,
    reservation,
    payment,
    session,
    db,
    stripe,
    site: "https://yanina.example.com",
  };
}
function response() {
  return {
    code: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}
const request = (body = { consulta_id: reservationId }) => ({
  method: "POST",
  headers: { authorization: "Bearer valid" },
  body,
});
test("checkout requires authentication and rejects foreign reservations", async () => {
  for (const [headers, options, status] of [
    [{}, {}, 401],
    [{ authorization: "Bearer invalid" }, {}, 401],
    [
      { authorization: "Bearer valid" },
      { reservation: { cliente_id: "another-user" } },
      404,
    ],
  ]) {
    const f = fixture(options),
      res = response();
    await createCheckout(() => f)({ ...request(), headers }, res);
    assert.equal(res.code, status);
    assert.ok(!f.calls.some((x) => x.create));
  }
});
test("checkout validates method, reservation ID, state and expired holds", async () => {
  for (const [req, opts, code] of [
    [{ ...request(), method: "GET" }, {}, 405],
    [request({ consulta_id: "bad" }), {}, 400],
    [request(), { reservation: { status: "confirmada" } }, 409],
    [
      request(),
      {
        reservation: {
          reserva_expira_em: new Date(Date.now() + 10000).toISOString(),
        },
      },
      409,
    ],
  ]) {
    const res = response();
    await createCheckout(() => fixture(opts))(req, res);
    assert.equal(res.code, code);
  }
});
test("checkout uses database price, idempotency key and saves the Stripe session", async () => {
  const f = fixture(),
    res = response();
  await createCheckout(() => f)(
    request({ consulta_id: reservationId, valor: 1, moeda: "USD" }),
    res,
  );
  assert.equal(res.code, 200);
  const create = f.calls.find((x) => x.create);
  assert.equal(create.create.line_items[0].price_data.unit_amount, 1200000);
  assert.equal(create.create.line_items[0].price_data.currency, "ars");
  assert.equal(create.opts.idempotencyKey, "yanina-checkout-payment1");
  assert.equal(create.create.payment_method_types, undefined);
  assert.equal(f.payment.stripe_checkout_session_id, f.session.id);
  assert.equal(res.headers["Cache-Control"], "no-store");
});
test("resume reuses an open checkout and never creates a second session", async () => {
  const f = fixture({ existing: true }),
    res = response();
  await createCheckout(() => f)(request(), res);
  assert.equal(res.body.url, f.session.url);
  assert.equal(f.calls.filter((x) => x.create).length, 0);
});
test("pending processing is not paid and is not presented as expired", async () => {
  const f = fixture({
      existing: true,
      session: { status: "complete", payment_status: "unpaid" },
    }),
    res = response();
  await createCheckout(() => f)(request(), res);
  assert.deepEqual(res.body, { pending: true });
  assert.ok(f.calls.some((x) => x.rpc === "processar_pagamento_stripe"));
  assert.ok(!f.calls.some((x) => x.rpc === "confirmar_pagamento_stripe"));
});
test("server only confirms paid/complete sessions retrieved from Stripe", async () => {
  for (const paid of [false, true]) {
    const f = fixture({
        existing: true,
        session: {
          status: paid ? "complete" : "open",
          payment_status: paid ? "paid" : "unpaid",
        },
      }),
      res = response();
    await createStatus(() => f)(
      {
        method: "GET",
        headers: { authorization: "Bearer valid" },
        query: { session_id: f.session.id, pago: "ok", paid: true },
      },
      res,
    );
    assert.equal(res.body.confirmed, paid);
    assert.ok(f.calls.some((x) => x.retrieve));
    assert.equal(
      f.calls.some((x) => x.rpc === "confirmar_pagamento_stripe"),
      paid,
    );
  }
});
test("status endpoint does not reveal another patient payment", async () => {
  const f = fixture({ existing: true, reservation: { cliente_id: "foreign" } }),
    res = response();
  await createStatus(() => f)(
    {
      method: "GET",
      headers: { authorization: "Bearer valid" },
      query: { session_id: f.session.id },
    },
    res,
  );
  assert.equal(res.code, 404);
  assert.ok(!f.calls.some((x) => x.retrieve));
});
test("provider and database failures return errors without secrets", async () => {
  for (const opt of [{ stripeError: true }, { saveError: true }]) {
    const res = response();
    await createCheckout(() => fixture(opt))(request(), res);
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { error: "PAYMENT_ERROR" });
  }
});
function webhookRequest(
  f,
  eventType = "checkout.session.completed",
  valid = true,
) {
  const body = JSON.stringify({
      id: "evt_fixture",
      type: eventType,
      data: { object: f.session },
    }),
    req = Readable.from([Buffer.from(body)]);
  req.method = "POST";
  req.headers = {
    "stripe-signature": valid
      ? f.stripe.webhooks.generateTestHeaderString({
          payload: body,
          secret: "whsec_fixture",
        })
      : "invalid",
  };
  return req;
}
test("webhook validates the raw-body Stripe signature", async () => {
  const f = fixture(),
    res = response();
  await createWebhook(
    () => f,
    () => "whsec_fixture",
  )(webhookRequest(f, undefined, false), res);
  assert.equal(res.code, 400);
  assert.equal(f.calls.length, 0);
});
test("approved webhook consults Stripe and database errors request retries", async () => {
  for (const rpcError of [false, true]) {
    const f = fixture({
        rpcError,
        session: { status: "complete", payment_status: "paid" },
      }),
      res = response();
    await createWebhook(
      () => f,
      () => "whsec_fixture",
    )(webhookRequest(f), res);
    assert.equal(res.code, rpcError ? 500 : 200);
    assert.ok(f.calls.some((x) => x.retrieve));
    assert.ok(f.calls.some((x) => x.rpc === "confirmar_pagamento_stripe"));
  }
});
test("expired and async-failed checkouts release reservations", async () => {
  for (const type of [
    "checkout.session.expired",
    "checkout.session.async_payment_failed",
  ]) {
    const f = fixture({
        session: { status: type.endsWith("expired") ? "expired" : "complete" },
      }),
      res = response();
    await createWebhook(
      () => f,
      () => "whsec_fixture",
    )(webhookRequest(f, type), res);
    assert.equal(res.code, 200);
    assert.ok(f.calls.some((x) => x.rpc === "expirar_reserva_stripe"));
  }
});
test("completed unpaid session retains a processing reservation", async () => {
  const f = fixture({
      session: { status: "complete", payment_status: "unpaid" },
    }),
    res = response();
  await createWebhook(
    () => f,
    () => "whsec_fixture",
  )(webhookRequest(f), res);
  assert.equal(res.code, 200);
  assert.ok(f.calls.some((x) => x.rpc === "processar_pagamento_stripe"));
});
test("missing configuration fails closed and arbitrary redirect hosts are rejected", () => {
  assert.throws(() => services(), /PAYMENTS_UNAVAILABLE/);
  assert.equal(
    validCheckoutUrl("https://checkout.stripe.com.evil.test/"),
    false,
  );
  assert.equal(validCheckoutUrl("javascript:alert(1)"), false);
  assert.equal(validCheckoutUrl("https://checkout.stripe.com/c/pay/abc"), true);
});
