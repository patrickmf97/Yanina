import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export default async function handler(req, res) {
  // O Mercado Pago manda um "ping" de teste via GET às vezes — sempre responde 200
  if (req.method !== 'POST') {
    return res.status(200).end()
  }

  try {
    const { type, data } = req.body

    if (type === 'payment' && data?.id) {
      const payment = new Payment(mpClient)
      const info = await payment.get({ id: data.id })

      const consultaId = info.external_reference
      const statusMP = info.status // approved | pending | rejected | ...

      let statusConsulta = 'pendente_pago'
      let statusPagamento = 'pendente'

      if (statusMP === 'approved') {
        statusConsulta = 'confirmada'
        statusPagamento = 'aprovado'
      } else if (statusMP === 'rejected') {
        statusPagamento = 'rejeitado'
      }

      await supabaseAdmin
        .from('pagamentos')
        .update({ status: statusPagamento, mercadopago_payment_id: String(info.id) })
        .eq('consulta_id', consultaId)

      await supabaseAdmin
        .from('consultas')
        .update({ status: statusConsulta })
        .eq('id', consultaId)
    }

    return res.status(200).end()
  } catch (err) {
    console.error('Erro no webhook do Mercado Pago:', err)
    // Responde 200 mesmo assim — se responder erro, o MP fica retentando indefinidamente
    return res.status(200).end()
  }
}
