import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function PerfilForm() {
  const { t } = useLanguage()
  const [perfil, setPerfil] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase
      .from('perfil_psicologa')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPerfil(data ?? { nombre: '', titulo: '', bio: '', frase: '', cita: '', foto_url: '', email_contato: '', instagram: '', ubicacion: '' }))
  }, [])

  function campo(nome, valor) {
    setPerfil((p) => ({ ...p, [nome]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setMsg('')

    const payload = { ...perfil, actualizado_em: new Date().toISOString() }

    let error
    if (perfil.id) {
      ;({ error } = await supabase.from('perfil_psicologa').update(payload).eq('id', perfil.id))
    } else {
      const resp = await supabase.from('perfil_psicologa').insert(payload).select().single()
      error = resp.error
      if (resp.data) setPerfil(resp.data)
    }

    setSalvando(false)
    setMsg(error ? t.erroGenerico : t.guardadoOk)
  }

  if (!perfil) return null

  return (
    <form className="admin-form" onSubmit={salvar}>
      <label>
        {t.campoNombre}
        <input value={perfil.nombre ?? ''} onChange={(e) => campo('nombre', e.target.value)} />
      </label>
      <label>
        {t.campoFrase}
        <input value={perfil.frase ?? ''} onChange={(e) => campo('frase', e.target.value)} />
      </label>
      <label>
        {t.campoBio}
        <textarea value={perfil.bio ?? ''} onChange={(e) => campo('bio', e.target.value)} />
      </label>
      <label>
        {t.campoCita}
        <input value={perfil.cita ?? ''} onChange={(e) => campo('cita', e.target.value)} />
      </label>
      <label>
        {t.campoFotoUrl}
        <input value={perfil.foto_url ?? ''} onChange={(e) => campo('foto_url', e.target.value)} />
      </label>
      <label>
        {t.campoEmail}
        <input value={perfil.email_contato ?? ''} onChange={(e) => campo('email_contato', e.target.value)} />
      </label>
      <label>
        {t.campoInstagram}
        <input value={perfil.instagram ?? ''} onChange={(e) => campo('instagram', e.target.value)} />
      </label>
      <label>
        {t.ubicacion}
        <input value={perfil.ubicacion ?? ''} onChange={(e) => campo('ubicacion', e.target.value)} />
      </label>

      <button className="auth-form__submit" type="submit" disabled={salvando}>
        {t.botaoSalvar}
      </button>
      {msg && <p className="admin-msg">{msg}</p>}
    </form>
  )
}
