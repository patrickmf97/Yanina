import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../context/LanguageContext.jsx'

const DIAS = {
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
}

export default function HorariosManager() {
  const { t, lang } = useLanguage()
  const [horarios, setHorarios] = useState([])
  const [diaSemana, setDiaSemana] = useState('1')
  const [hora, setHora] = useState('14:00')

  async function carregar() {
    const { data } = await supabase
      .from('disponibilidade')
      .select('*')
      .order('dia_semana')
      .order('hora')
    setHorarios(data ?? [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function adicionar(e) {
    e.preventDefault()
    await supabase.from('disponibilidade').insert({
      dia_semana: Number(diaSemana),
      hora,
      ativo: true,
    })
    carregar()
  }

  async function remover(id) {
    await supabase.from('disponibilidade').delete().eq('id', id)
    carregar()
  }

  return (
    <div>
      <form className="horario-form" onSubmit={adicionar}>
        <label>
          {t.diaSemanaLabel}
          <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
            {DIAS[lang].map((nome, i) => (
              <option key={i} value={i}>{nome}</option>
            ))}
          </select>
        </label>
        <label>
          {t.horaLabel}
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
        <button className="auth-form__submit" type="submit">{t.botaoAdicionar}</button>
      </form>

      {horarios.length === 0 ? (
        <p className="agendar-vazio">{t.horariosVazio}</p>
      ) : (
        <div className="horario-lista">
          {horarios.map((h) => (
            <div className="horario-item" key={h.id}>
              <span>{DIAS[lang][h.dia_semana]} — {h.hora.slice(0, 5)}</span>
              <button onClick={() => remover(h.id)}>{t.botaoRemover}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
