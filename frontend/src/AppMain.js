import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import Login from './pages/Login/Login';
import DashboardAdmin from './pages/DashboardAdmin/DashboardAdmin';
import DashboardEquipe from './components/DashboardEquipe';
import DashboardGestor from './components/DashboardGestor';
import DashboardBanca from './components/DashboardBanca';
import GerenciarPropostasEquipe from './components/GerenciarPropostasEquipe';
import { API_URL } from './api_config';
import { storage } from './utils/storage';
import './styles/globals.css';

const getStoredUser = () => {
  const token = storage.getToken();
  const user = storage.getUser();
  if (!token || !user) return null;
  return user;
};

const DashboardByRole = ({ user, authChecked }) => {
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (user.nivel) {
    case 'administrador':
    case 'geral':
    case 'admin':
      return <DashboardAdmin />;
    case 'gestor':
      return <DashboardGestor />;
    case 'banca':
      return <DashboardBanca />;
    case 'equipe':
      return <DashboardEquipe />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const RequireEquipe = ({ children, user, authChecked }) => {
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.nivel !== 'equipe') return <Navigate to="/dashboard" replace />;
  return children;
};

const RequireNivel = ({ children, user, authChecked, nivel }) => {
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.nivel !== nivel) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppMain() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = storage.getToken();
      if (!token) {
        setUser(null);
        setAuthChecked(true);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/meu_perfil/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          storage.clear();
          setUser(null);
          setAuthChecked(true);
          return;
        }

        const profileData = await response.json();
        const normalizedUser = {
          id: profileData?.user?.id,
          username: profileData?.user?.username,
          nivel: profileData?.perfil?.nivel,
          nivel_display: profileData?.perfil?.nivel_display,
          equipe: profileData?.perfil?.equipe || null
        };

        storage.setUser(normalizedUser);
        if (normalizedUser.nivel === 'equipe' && normalizedUser.equipe) {
          const existingEquipe = storage.getEquipe();
          if (!existingEquipe) {
            storage.setEquipe({ nome: normalizedUser.equipe });
          }
        }

        setUser(normalizedUser);
        setAuthChecked(true);
      } catch {
        storage.clear();
        setUser(null);
        setAuthChecked(true);
      }
    };

    bootstrapAuth();
  }, []);

  const handleLogin = (loginData) => {
    if (loginData?.user) {
      setUser(loginData.user);
    }
    navigate('/dashboard', { replace: true });
  };

  const handleSwitchUser = () => {
    storage.clear();
    setUser(null);
    setAuthChecked(true);
  };

  const handleEquipeSelection = () => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onLoginClick={() => navigate('/login')} />}
      />

      <Route
        path="/login"
        element={
          <Login
            onLogin={handleLogin}
            onEquipeSelection={handleEquipeSelection}
            existingUser={authChecked ? user : null}
            onSwitchUser={handleSwitchUser}
          />
        }
      />

      <Route path="/dashboard" element={<DashboardByRole user={user} authChecked={authChecked} />} />
      <Route path="/painel" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/admin"
        element={
          <RequireNivel user={user} authChecked={authChecked} nivel="administrador">
            <DashboardAdmin />
          </RequireNivel>
        }
      />
      <Route
        path="/gestor"
        element={
          <RequireNivel user={user} authChecked={authChecked} nivel="gestor">
            <DashboardGestor />
          </RequireNivel>
        }
      />
      <Route
        path="/banca"
        element={
          <RequireNivel user={user} authChecked={authChecked} nivel="banca">
            <DashboardBanca />
          </RequireNivel>
        }
      />
      <Route
        path="/dashequipe"
        element={
          <RequireNivel user={user} authChecked={authChecked} nivel="equipe">
            <DashboardEquipe />
          </RequireNivel>
        }
      />

      <Route
        path="/corrigir-propostas"
        element={
          <RequireEquipe user={user} authChecked={authChecked}>
            <GerenciarPropostasEquipe />
          </RequireEquipe>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppMain;


