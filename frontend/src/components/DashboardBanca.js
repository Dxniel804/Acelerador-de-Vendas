import React, { useState, useEffect } from 'react';
import { Trophy, Users, DollarSign, LogOut } from 'lucide-react';
import RegrasPontuacao from './RegrasPontuacao';
import styles from './DashboardBanca.module.css';

const DashboardBanca = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const getStoredUser = () => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };

      // Buscar dados do dashboard
      const dashboardResponse = await fetch(`${API_BASE}/banca/dashboard/`, { headers });
      if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!dashboardResponse.ok) throw new Error('Erro ao buscar dashboard');
      const dashboard = await dashboardResponse.json();

      // Buscar ranking
      const rankingResponse = await fetch(`${API_BASE}/banca/ranking/`, { headers });
      if (rankingResponse.status === 401 || rankingResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!rankingResponse.ok) throw new Error('Erro ao buscar ranking');
      const ranking = await rankingResponse.json();

      setDashboardData(dashboard);
      setRankingData(ranking);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pre_workshop': 'bg-gray-100 text-gray-800',
      'workshop': 'bg-blue-100 text-blue-800',
      'pos_workshop': 'bg-green-100 text-green-800',
      'encerrado': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const logout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Erro ao carregar dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>🏆</div>
            <div>
              <h1 className={styles.headerTitle}>Dashboard da Banca</h1>
              <p className={styles.headerSubtitle}>Visualização e Configuração de Pontuação</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{getStoredUser()?.username}</span>
              <span className={styles.userRole}>Banca</span>
            </div>
            <button onClick={logout} className={styles.logoutButton}>
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
        <div className={styles.tabsContainer}>
          <button className={`${styles.tabButton} ${activeTab === 'dashboard' ? styles.active : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`${styles.tabButton} ${activeTab === 'ranking' ? styles.active : ''}`} onClick={() => setActiveTab('ranking')}>Ranking</button>
          <button className={`${styles.tabButton} ${activeTab === 'regras' ? styles.active : ''}`} onClick={() => setActiveTab('regras')}>Regras de Pontuação</button>
        </div>

        {/* Aba Dashboard */}
        {activeTab === 'dashboard' && (
        <>
          {/* Totais Gerais */}
          <div className={styles.statsOverview}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={`${styles.statIcon} ${styles.sales}`}>
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
              <div className={styles.statValue}>
                R$ {Number(dashboardData?.faturamento_previsto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className={styles.statLabel}>Faturamento Previsto Total</div>
              <div className={styles.statTrend}>
                Soma total das propostas validadas
              </div>
            </div>
              
              {dashboardData?.status_sistema === 'pre_workshop' && (
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={`${styles.statIcon} ${styles.trophy}`}>
                      <Trophy className="h-8 w-8" />
                    </div>
                  </div>
                  <div className={styles.statValue}>
                    {dashboardData?.propostas_vendidas || 0}
                  </div>
                  <div className={styles.statLabel}>Propostas Vendidas</div>
                  <div className={styles.statTrend}>
                    Propostas validadas e vendidas no Pré-Workshop
                  </div>
                </div>
              )}
              
              {dashboardData?.status_sistema === 'pos_workshop' && (
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={`${styles.statIcon} ${styles.performance}`}>
                      <DollarSign className="h-8 w-8" />
                    </div>
                  </div>
                  <div className={styles.statValue}>
                    R$ {Number(dashboardData?.faturamento_realizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={styles.statLabel}>Faturamento Realizado Total</div>
                  <div className={styles.statTrend}>
                    Soma total das vendas validadas pelo gestor
                  </div>
                </div>
              )}
            </div>

            {/* Tabela de Equipes */}
            <div className={styles.managementSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    <Users className="h-6 w-6" />
                  </div>
                  {dashboardData?.status_sistema === 'pos_workshop'
                    ? 'Vendas Validadas por Equipe'
                    : 'Propostas e Produtos por Equipe'}
                </div>
              </div>
              <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Equipe</th>
                      <th>
                        {dashboardData?.status_sistema === 'pos_workshop' ? 'Propostas Vendidas' : 'Propostas'}
                      </th>
                      <th>
                        {dashboardData?.status_sistema === 'pos_workshop' ? 'Produtos Vendidos' : 'Produtos'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.equipes?.map((equipe, index) => (
                      <tr key={index}>
                        <td>{equipe.equipe}</td>
                        <td>
                          {dashboardData?.status_sistema === 'pos_workshop'
                            ? (equipe.propostas_vendidas_validada || equipe.vendas_concretizadas || 0)
                            : (equipe.propostas_enviadas || 0)}
                        </td>
                        <td>
                          {dashboardData?.status_sistema === 'pos_workshop'
                            ? (equipe.produtos_vendidos || equipe.quantidade_produtos || 0)
                            : (equipe.quantidade_produtos || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!dashboardData?.equipes || dashboardData.equipes.length === 0) && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📋</div>
                    <div>Nenhuma equipe encontrada</div>
                  </div>
                )}
            </div>
        </>
          )}
        {activeTab === 'ranking' && (
            <div className={styles.managementSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    <Trophy className="h-6 w-6" />
                  </div>
                  Ranking em Tempo Real
                </div>
              </div>
              <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Equipe</th>
                      <th>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData?.ranking?.map((equipe, index) => (
                      <tr key={equipe.equipe_id}>
                        <td>
                          <div className="flex items-center gap-2">
                            {equipe.posicao === 1 && <Trophy className="h-4 w-4" style={{ color: '#f59e0b' }} />}
                            {equipe.posicao === 2 && <Trophy className="h-4 w-4" style={{ color: '#94a3b8' }} />}
                            {equipe.posicao === 3 && <Trophy className="h-4 w-4" style={{ color: '#f59e0b' }} />}
                            <span className="font-bold">#{equipe.posicao}</span>
                          </div>
                        </td>
                        <td>{equipe.equipe}</td>
                        <td className="text-right font-bold">{equipe.pontos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
        )}
        {activeTab === 'regras' && (
            <RegrasPontuacao />
        )}
        </div>
      </main>
    </div>
  );
};

export default DashboardBanca;
