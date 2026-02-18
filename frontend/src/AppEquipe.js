import React, { useState, useEffect } from 'react';
import LoginEquipe from './components/LoginEquipe';
import DashboardEquipe from './components/DashboardEquipe';
import GerenciarPropostasEquipe from './components/GerenciarPropostasEquipe';
import './App.css';

function AppEquipe() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [equipeSelecionada, setEquipeSelecionada] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Verificar se já está logado
    const token = sessionStorage.getItem('token');
    const equipe = sessionStorage.getItem('equipe');

    if (token && equipe) {
      setIsLoggedIn(true);
      setEquipeSelecionada(JSON.parse(equipe));
    }
  }, []);

  const handleLogin = (loginData) => {
    // Para outros perfis (admin, gestor, banca)
    sessionStorage.setItem('token', loginData.token);
    sessionStorage.setItem('user', JSON.stringify(loginData.user));
    setIsLoggedIn(true);

    // Redirecionar para página apropriada baseada no perfil
    if (loginData.user.nivel === 'administrador') {
      window.location.href = '/admin';
    } else if (loginData.user.nivel === 'gestor') {
      window.location.href = '/gestor';
    } else if (loginData.user.nivel === 'banca') {
      window.location.href = '/banca';
    }
  };

  const handleEquipeSelection = (selectionData) => {
    setIsLoggedIn(true);
    setEquipeSelecionada(selectionData.equipe);
  };

  const logout = () => {
    sessionStorage.clear();
    setIsLoggedIn(false);
    setEquipeSelecionada(null);
    setCurrentPage('dashboard');
  };

  // Se não está logado, mostrar tela de login
  if (!isLoggedIn) {
    return <LoginEquipe onLogin={handleLogin} onEquipeSelection={handleEquipeSelection} />;
  }

  // Se está logado como equipe
  if (equipeSelecionada) {
    // Navegação interna
    if (currentPage === 'corrigir-propostas') {
      return (
        <div style={{ backgroundColor: '#1A3A41', minHeight: '100vh', position: 'relative', overflowX: 'hidden', paddingBottom: '100px' }}>
          {/* Header Bar like Landing Page */}
          <header style={{ backgroundColor: '#FFFFFF', borderBottom: '2px solid #FF5E3A', padding: '0 2rem', height: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src="/img/vendamais_logo.png"
                alt="Venda Mais Logo"
                style={{ height: '40px', width: 'auto' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ color: '#1A3A41', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Corrigir Propostas - {equipeSelecionada.nome}
              </div>
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{ backgroundColor: '#FF5E3A', color: '#FFFFFF', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="bi bi-arrow-left"></i> Dashboard
              </button>
            </div>
          </header>

          <main style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
            <GerenciarPropostasEquipe />
          </main>

          {/* Wave Decoration */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '10vw', maxHeight: '150px', zIndex: 1, pointerEvents: 'none', opacity: 0.8 }}>
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
              <path
                fill="#FF5E3A"
                fillOpacity="1"
                d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </svg>
          </div>
        </div>
      );
    }

    return <DashboardEquipe />;
  }

  // Fallback
  return <LoginEquipe onLogin={handleLogin} onEquipeSelection={handleEquipeSelection} />;
}

export default AppEquipe;
