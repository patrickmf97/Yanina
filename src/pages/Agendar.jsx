import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import './Agendar.css'

const DIAS = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
}

// Gera os próximos 7 dias a partir de hoje
function proximosDias() {
  const dias = []
  const hoje = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    dias.push(d)
  }
  return dias
}

export default function Agendar() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()

  const [disponibilidade, setDisponibilidade] = useState([])
  const [consultasOcupadas, setConsultasOcupadas] = useState([]) // array de timestamps ISO já reservados
  const [selecionado, setSelecionado] = useState(null) // { dia, hora }
  const [confirmando, setConfirmando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const dias = useMemo(proximosDias, [])

  useEffect(() => {
    async function carregar() {
      const { data: disp } = await supabase
        .from('disponibilidade')
        .select('dia_semana, hora')
        .eq('ativo', true)

      const inicio = dias[0].toISOString()
      const fim = new Date(dias[6].getTime() + 24 * 60 * 60 * 1000).toISOString()

      const { data: consultas } = await supabase
        .from('consultas')
        .select('data_hora')
        .gte('data_hora', inicio)
        .lt('data_hora', fim)
        .neq('status', 'cancelada')

      setDisponibilidade(disp ?? [])
      setConsultasOcupadas((consultas ?? []).map((c) => c.data_hora))
    }
    carregar()
  }, [dias])

  function horariosDoDia(dia) {
    const diaSemana = dia.getDay()
    return disponibilidade
      .filter((h) => h.dia_semana === diaSemana)
      .map((h) => h.hora.slice(0, 5))
      .sort()
  }

  function slotISO(dia, hora) {
    const [h, m] = hora.split(':')
    const d = new Date(dia)
    d.setHours(Number(h), Number(m), 0, 0)
    return d.toISOString()
  }

  function estaOcupado(iso) {
    return consultasOcupadas.includes(iso)
  }

  async function confirmar() {
    if (!user) return
    setConfirmando(true)
    setMensagem('')

    const iso = slotISO(selecionado.dia, selecionado.hora)

    const { error } = await supabase.from('consultas').insert({
      cliente_id: user.id,
      data_hora: iso,
      status: 'pendente_pago',
    })

    setConfirmando(false)

    if (error) {
      setMensagem(t.erroGenerico)
      return
    }

    // A próxima etapa (integração Mercado Pago) vai redirecionar para o checkout
    // aqui, usando o id da consulta criada. Por enquanto, apenas confirma a reserva.
    setMensagem('OK')
  }

  return (
    <div className="agendar-page">
      <div className="agendar-page__header">
        <Link to="/">← {t.nombre}</Link>
        <LangSwitch />
      </div>

      <h1>{t.agendarTitulo}</h1>
      <p>{t.agendarSubtitulo}</p>

      {!user && (
        <p className="agendar-confirmar__aviso" style={{ marginTop: '1rem' }}>
          {t.precisaLogin} — <Link to="/entrar">{t.loginTitulo}</Link>
        </p>
      )}

      <div className="agendar-grid">
        {dias.map((dia) => {
          const horarios = horariosDoDia(dia)
          return (
            <div className="agendar-dia" key={dia.toDateString()}>
              <h3>{DIAS[lang][dia.getDay()]} {dia.getDate()}/{dia.getMonth() + 1}</h3>
              {horarios.length === 0 ? (
                <p className="agendar-vazio">{t.semHorarios}</p>
              ) : (
                <div className="agendar-slots">
                  {horarios.map((hora) => {
                    const iso = slotISO(dia, hora)
                    const ocupado = estaOcupado(iso)
                    const isSelected = selecionado?.dia === dia && selecionado?.hora === hora
                    return (
                      <button
                        key={hora}
                        className={isSelected ? 'agendar-slot is-selected' : 'agendar-slot'}
                        disabled={ocupado || !user}
                        onClick={() => setSelecionado({ dia, hora })}
                      >
                        {ocupado ? t.horarioReservado : hora}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selecionado && user && (
        <div className="agendar-confirmar">
          {mensagem === 'OK' ? (
            <p>✅ {selecionado.hora} — {DIAS[lang][selecionado.dia.getDay()]} {selecionado.dia.getDate()}/{selecionado.dia.getMonth() + 1}</p>
          ) : (
            <>
              <p className="agendar-confirmar__aviso">
                {selecionado.hora} — {DIAS[lang][selecionado.dia.getDay()]} {selecionado.dia.getDate()}/{selecionado.dia.getMonth() + 1}
              </p>
              {mensagem && <p className="auth-form__error">{mensagem}</p>}
              <button className="auth-form__submit" onClick={confirmar} disabled={confirmando}>
                {t.confirmarAgendamento}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
