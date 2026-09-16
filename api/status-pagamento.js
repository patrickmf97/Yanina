import {
  services,
  authenticatedUser,
  HttpError,
  fail,
  fulfill,
} from "../server/payments.js";
export function createHandler(getServices = services) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    }
    try {
      const { db, stripe } = getServices();
      const user = await authenticatedUser(req, db);
      const id = req.query?.session_id;
      if (typeof id !== "string" || !id.startsWith("cs_") || id.length > 250)
        throw new HttpError(400, "INVALID_SESSION");
      const { data: payment, error } = await db
        .from("pagamentos")
        .select("consulta_id,consultas!inner(cliente_id,status)")
        .eq("stripe_checkout_session_id", id)
        .eq("consultas.cliente_id", user.id)
        .single();
      if (error || !payment) throw new HttpError(404, "PAYMENT_NOT_FOUND");
      const session = await stripe.checkout.sessions.retrieve(id);
      const paid = await fulfill(session, db);
      const { data: consulta, error: consultaError } = await db
        .from("consultas")
        .select("status")
        .eq("id", payment.consulta_id)
        .eq("cliente_id", user.id)
        .single();
      if (consultaError) throw new Error("STATUS_FAILED");
      return res.status(200).json({
        paid,
        confirmed:
          paid && ["confirmada", "realizada"].includes(consulta?.status),
        status: session.status,
      });
    } catch (error) {
      return fail(res, error);
    }
  };
}
export default createHandler();
