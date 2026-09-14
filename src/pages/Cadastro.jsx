import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import './Auth.css'

export default function Cadastro() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signUp({ email, password: senha })

    if (error || !data.user) {
      setCarregando(false)
      setErro(t.erroGenerico)
      return
    }

    // Cria o registro complementar na tabela `clientes` (nome, telefone)
    const { error: erroPerfil } = await supabase.from('clientes').insert({
      id: data.user.id,
      nombre: nome,
      telefone,
    })

    setCarregando(false)

    if (erroPerfil) {
      setErro(t.erroGenerico)
      return
    }

    navigate('/agendar')
  }

  return (
    <div className="auth-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link className="auth-page__back" to="/">← {t.nombre}</Link>
        <LangSwitch />
      </div>

      <h1>{t.cadastroTitulo}</h1>
      <p className="auth-page__subtitle">{t.cadastroSubtitulo}</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t.campoNombre}
          <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          {t.campoTelefone}
          <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>
        <label>
          {t.campoEmail}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.campoSenha}
          <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        {erro && <p className="auth-form__error">{erro}</p>}

        <button className="auth-form__submit" type="submit" disabled={carregando}>
          {t.botaoCrearCuenta}
        </button>
      </form>

      <p className="auth-page__switch">
        <Link to="/entrar">{t.linkParaLogin}</Link>
      </p>
    </div>
  )
}
