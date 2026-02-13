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
        <div>
          <div className="bg-white border-b p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Corrigir Propostas - {equipeSelecionada.nome}</h1>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Voltar para Dashboard
              </button>
            </div>
          </div>
          <GerenciarPropostasEquipe />
        </div>
      );
    }

    return <DashboardEquipe />;
  }

  // Fallback
  return <LoginEquipe onLogin={handleLogin} onEquipeSelection={handleEquipeSelection} />;
}

export default AppEquipe;
