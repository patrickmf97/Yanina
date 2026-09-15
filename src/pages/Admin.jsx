import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useIsAdmin } from '../context/useIsAdmin.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import '../pages/Auth.css'

export default function Admin() {
  const { t } = useLanguage()
  const { user, signOut, loading: authLoading } = useAuth()
  const { isAdmin, checking } = useIsAdmin()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) setErro(t.erroGenerico)
  }

  if (authLoading || (user && checking)) {
    return <div className="auth-page">…</div>
  }

  if (user && isAdmin) {
    return <AdminDashboard />
  }

  return (
    <div className="auth-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link className="auth-page__back" to="/">← {t.nombre}</Link>
        <LangSwitch />
      </div>

      <h1>{t.loginTitulo}</h1>
      <p className="auth-page__subtitle">{t.adminLoginSubtitulo}</p>

      {user && !isAdmin ? (
        <>
          <p className="auth-form__error">{t.semAcesso}</p>
          <button className="auth-form__submit" onClick={signOut}>{t.botaoEntrar}</button>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t.campoEmail}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            {t.campoSenha}
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {erro && <p className="auth-form__error">{erro}</p>}
          <button className="auth-form__submit" type="submit" disabled={carregando}>
            {t.botaoEntrar}
          </button>
        </form>
      )}
    </div>
  )
}
