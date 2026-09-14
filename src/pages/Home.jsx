import './Home.css'

// Estes dados virão do painel de administrador (tabela `perfil_psicologa` no Supabase).
// Por enquanto ficam aqui como placeholder editável.
const perfil = {
  nome: 'Nome da Psicóloga',
  titulo: 'Psicóloga Clínica · CRP/Matrícula pendente',
  frase: 'Um espaço para você se ouvir com mais clareza.',
  bio: 'Recém-formada com foco em terapia cognitivo-comportamental e escuta acolhedora para adultos jovens. Atendimento 100% online, pensado para caber na sua rotina.',
  especialidades: [
    { titulo: 'Ansiedade', desc: 'Manejo de crises e pensamentos ruminantes no dia a dia.' },
    { titulo: 'Transições de vida', desc: 'Faculdade, primeiro emprego, mudanças de cidade ou país.' },
    { titulo: 'Autoconhecimento', desc: 'Processos de escuta para entender padrões e escolhas.' },
  ],
  contato: {
    email: 'contato@exemplo.com',
    instagram: '@exemplo.psi',
  },
}

export default function Home() {
  return (
    <div className="page">
      <header className="nav">
        <span className="nav__brand">{perfil.nome}</span>
        <a className="nav__cta" href="#agendar">Agendar consulta</a>
      </header>

      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{perfil.titulo}</p>
          <h1 className="hero__headline">{perfil.frase}</h1>
          <p className="hero__lead">{perfil.bio}</p>
          <a className="hero__button" href="#agendar">Marcar primeira sessão</a>
        </div>
        <div className="hero__shape" aria-hidden="true">
          <svg viewBox="0 0 400 400" fill="none">
            <path
              fill="var(--accent-soft)"
              d="M 320 90 C 370 140 380 230 330 290 C 280 350 180 370 120 330 C 60 290 40 200 80 130 C 120 60 270 40 320 90 Z"
            />
          </svg>
        </div>
      </section>

      <section className="especialidades">
        <h2>Como posso te ajudar</h2>
        <div className="especialidades__grid">
          {perfil.especialidades.map((item) => (
            <article key={item.titulo} className="especialidade">
              <h3>{item.titulo}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="agendar" className="agendamento-cta">
        <h2>Pronto para dar o primeiro passo?</h2>
        <p>As sessões acontecem por videochamada, com horários flexíveis. Escolha o melhor dia para você.</p>
        <a className="hero__button" href="/agendar">Ver horários disponíveis</a>
      </section>

      <footer className="footer">
        <p>{perfil.contato.email} · {perfil.contato.instagram}</p>
      </footer>
    </div>
  )
}
