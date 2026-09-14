import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Agendar from './pages/Agendar.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/agendar" element={<Agendar />} />
    </Routes>
  )
}

export default App
