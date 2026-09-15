import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../context/LanguageContext.jsx'

const STATUS_OPCOES = ['pendente_pago', 'confirmada', 'realizada', 'cancelada']

export default function Agendamentos() {
  const { t } = useLanguage()
  const [consultas, setConsultas] = useState(null)

  async function carregar() {
    const { data } = await supabase
      .from('consultas')
      .select('*, clientes(nombre, telefone)')
      .order('data_hora', { ascending: true })
    setConsultas(data ?? [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function mudarStatus(id, status) {
    await supabase.from('consultas').update({ status }).eq('id', id)
    carregar()
  }

  if (consultas === null) return null

  if (consultas.length === 0) {
    return <p className="agendar-vazio">{t.agendamentosVazio}</p>
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>{t.colunaData}</th>
          <th>{t.colunaCliente}</th>
          <th>{t.colunaStatus}</th>
        </tr>
      </thead>
      <tbody>
        {consultas.map((c) => (
          <tr key={c.id}>
            <td>{new Date(c.data_hora).toLocaleString()}</td>
            <td>{c.clientes?.nombre ?? '—'}{c.clientes?.telefone ? ` · ${c.clientes.telefone}` : ''}</td>
            <td>
              <select value={c.status} onChange={(e) => mudarStatus(c.id, e.target.value)}>
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
