import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import PerfilForm from './admin/PerfilForm.jsx'
import HorariosManager from './admin/HorariosManager.jsx'
import Agendamentos from './admin/Agendamentos.jsx'
import './Admin.css'

const ABAS = ['perfil', 'horarios', 'agendamentos']

export default function AdminDashboard() {
  const { t, lang } = useLanguage()
  const { signOut } = useAuth()
  const [aba, setAba] = useState('perfil')

  const labels = {
    perfil: t.adminTabPerfil,
    horarios: t.adminTabHorarios,
    agendamentos: t.adminTabAgendamentos,
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <Link to="/">← {t.nombre}</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <LangSwitch />
          <button className="nav__cta nav__cta--ghost" onClick={signOut}>
            {lang === 'pt' ? 'Sair' : 'Salir'}
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {ABAS.map((a) => (
          <button
            key={a}
            className={aba === a ? 'admin-tabs__btn is-active' : 'admin-tabs__btn'}
            onClick={() => setAba(a)}
          >
            {labels[a]}
          </button>
        ))}
      </div>

      {aba === 'perfil' && <PerfilForm />}
      {aba === 'horarios' && <HorariosManager />}
      {aba === 'agendamentos' && <Agendamentos />}
    </div>
  )
}
