import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import './Faturamento.css'

const formatoARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export default function Faturamento() {
  const { t, lang } = useLanguage()
  const [pagamentos, setPagamentos] = useState(null)
  const [totalConsultasConfirmadas, setTotalConsultasConfirmadas] = useState(0)

  useEffect(() => {
    supabase
      .from('pagamentos')
      .select('valor, status, criado_em')
      .then(({ data }) => setPagamentos(data ?? []))

    supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .in('status', ['confirmada', 'realizada'])
      .then(({ count }) => setTotalConsultasConfirmadas(count ?? 0))
  }, [])

  const stats = useMemo(() => {
    if (!pagamentos) return null

    const aprovados = pagamentos.filter((p) => p.status === 'aprovado')
    const receitaTotal = aprovados.reduce((soma, p) => soma + Number(p.valor), 0)

    const agora = new Date()
    const receitaMes = aprovados
      .filter((p) => {
        const d = new Date(p.criado_em)
        return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
      })
      .reduce((soma, p) => soma + Number(p.valor), 0)

    const pendentesOuRejeitados = pagamentos.filter((p) => p.status !== 'aprovado').length
    const taxaInadimplencia = pagamentos.length > 0 ? (pendentesOuRejeitados / pagamentos.length) * 100 : 0

    // Agrupa receita aprovada dos últimos 6 meses
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-AR', { month: 'short' }), valor: 0 })
    }
    aprovados.forEach((p) => {
      const d = new Date(p.criado_em)
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const mes = meses.find((m) => m.chave === chave)
      if (mes) mes.valor += Number(p.valor)
    })

    return { receitaTotal, receitaMes, taxaInadimplencia, meses }
  }, [pagamentos, lang])

  if (!stats) return null

  if (pagamentos.length === 0) {
    return <p className="agendar-vazio">{t.semDadosFaturamento}</p>
  }

  return (
    <div>
      <div className="faturamento-cards">
        <div className="faturamento-card">
          <p className="faturamento-card__label">{t.receitaTotal}</p>
          <p className="faturamento-card__valor">{formatoARS.format(stats.receitaTotal)}</p>
        </div>
        <div className="faturamento-card">
          <p className="faturamento-card__label">{t.receitaMes}</p>
          <p className="faturamento-card__valor">{formatoARS.format(stats.receitaMes)}</p>
        </div>
        <div className="faturamento-card">
          <p className="faturamento-card__label">{t.consultasConfirmadas}</p>
          <p className="faturamento-card__valor">{totalConsultasConfirmadas}</p>
        </div>
        <div className="faturamento-card">
          <p className="faturamento-card__label">{t.taxaInadimplencia}</p>
          <p className="faturamento-card__valor">{stats.taxaInadimplencia.toFixed(0)}%</p>
        </div>
      </div>

      <div className="faturamento-grafico">
        <h3>{t.graficoReceitaTitulo}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.meses}>
            <XAxis dataKey="label" stroke="#4A4D57" fontSize={12} />
            <YAxis stroke="#4A4D57" fontSize={12} />
            <Tooltip formatter={(valor) => formatoARS.format(valor)} />
            <Bar dataKey="valor" fill="#7A9B7E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
