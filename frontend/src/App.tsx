import { Route, BrowserRouter, Routes } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { BackofficeLayout } from './components/BackofficeLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Home } from './pages/Home';
import { Sobre } from './pages/Sobre';
import { Programacao } from './pages/Programacao';
import { Bilhetes } from './pages/Bilhetes';
import { BilheteSucesso } from './pages/BilheteSucesso';
import { EuVou } from './pages/EuVou';
import { Faq } from './pages/Faq';
import { Contacto } from './pages/Contacto';
import { NotFound } from './pages/NotFound';
import { BackofficeLogin } from './pages/backoffice/Login';
import { Reservas } from './pages/backoffice/Reservas';
import { Checkin } from './pages/backoffice/Checkin';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/programacao" element={<Programacao />} />
            <Route path="/bilhetes" element={<Bilhetes />} />
            <Route path="/bilhetes/sucesso" element={<BilheteSucesso />} />
            <Route path="/eu-vou" element={<EuVou />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/contacto" element={<Contacto />} />
          </Route>

          <Route path="/backoffice/login" element={<BackofficeLogin />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<BackofficeLayout />}>
              <Route path="/backoffice" element={<Reservas />} />
              <Route path="/backoffice/checkin" element={<Checkin />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
