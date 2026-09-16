// Retired provider. Remove the old webhook in the Mercado Pago dashboard at cutover.
export default function handler(_req, res) {
  return res.status(410).json({ error: "PROVIDER_RETIRED" });
}
