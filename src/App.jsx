import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Agendar from "./pages/Agendar.jsx";
const Admin = lazy(() => import("./pages/Admin.jsx"));

import MinhasConsultas from "./pages/MinhasConsultas.jsx";
import Recuperar from "./pages/Recuperar.jsx";
import { useLanguage } from "./context/LanguageContext.jsx";
function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="auth-page">
      <h1>404</h1>
      <p>{t.notFound}</p>
      <Link to="/">{t.back} →</Link>
    </main>
  );
}
function App() {
  return (
    <Suspense
      fallback={
        <main className="auth-page" aria-busy="true">
          …
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/agendar" element={<Agendar />} />
        <Route path="/mis-consultas" element={<MinhasConsultas />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/redefinir-senha" element={<Recuperar />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}

export default App;
