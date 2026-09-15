import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

// Usa a SERVICE ROLE KEY (não a anon key) — só existe aqui no servidor,
// nunca é exposta ao navegador. Ela ignora as regras de RLS.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { consulta_id } = req.body

    if (!consulta_id) {
      return res.status(400).json({ error: 'consulta_id é obrigatório' })
    }

    const { data: consulta, error: erroConsulta } = await supabaseAdmin
      .from('consultas')
      .select('id, data_hora, status')
      .eq('id', consulta_id)
      .single()

    if (erroConsulta || !consulta) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    const { data: perfil } = await supabaseAdmin
      .from('perfil_psicologa')
      .select('precio_consulta')
      .limit(1)
      .maybeSingle()

    const valor = Number(perfil?.precio_consulta) || 0

    if (valor <= 0) {
      return res.status(400).json({ error: 'Preço da consulta ainda não foi configurado no painel admin' })
    }

    const preference = new Preference(mpClient)
    const resultado = await preference.create({
      body: {
        items: [
          {
            title: 'Consulta psicológica online',
            quantity: 1,
            unit_price: valor,
            currency_id: 'ARS',
          },
        ],
        external_reference: consulta_id,
        back_urls: {
          success: `${process.env.SITE_URL}/agendar?pago=ok`,
          failure: `${process.env.SITE_URL}/agendar?pago=erro`,
          pending: `${process.env.SITE_URL}/agendar?pago=pendente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.SITE_URL}/api/webhook-mercadopago`,
      },
    })

    // Registra o pagamento como "pendente" — o webhook atualiza quando o MP confirmar
    await supabaseAdmin.from('pagamentos').insert({
      consulta_id,
      valor,
      moeda: 'ARS',
      status: 'pendente',
      mercadopago_payment_id: resultado.id,
    })

    return res.status(200).json({ url: resultado.init_point })
  } catch (err) {
    console.error('Erro ao criar pagamento:', err)
    return res.status(500).json({ error: 'Erro ao criar pagamento' })
  }
}
