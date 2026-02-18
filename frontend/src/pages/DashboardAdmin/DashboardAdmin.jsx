import React, { useState, useEffect } from 'react';
import { 
  Activity,
  TrendingUp,
  LogOut,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus
} from 'lucide-react';
import styles from './DashboardAdmin.module.css';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Card from '../../components/Card/Card';
import Tabs from '../../components/Tabs/Tabs';
import UserManagement from '../../components/UserManagement';
import TeamManagement from '../../components/TeamManagement';
import StatusControl from '../../components/StatusControl';

const DashboardAdmin = () => {
  const [userData, setUserData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

      // Buscar dados do usuário
      const userResponse = await fetch('http://localhost:8000/api/auth/meu_perfil/', { headers });
      if (userResponse.status === 401 || userResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!userResponse.ok) throw new Error('Erro ao buscar perfil');
      const userData = await userResponse.json();

      setUserData(userData);

      // Buscar status do sistema
      const statusResponse = await fetch('http://localhost:8000/api/admin/status_sistema/', { headers });
      if (statusResponse.status === 401 || statusResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!statusResponse.ok) throw new Error('Erro ao buscar status');
      const statusData = await statusResponse.json();

      setSystemStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  const handleCreateUser = () => {
    setShowUserForm(true);
    setActiveTab('users');
  };

  const handleCreateTeam = () => {
    setShowTeamForm(true);
    setActiveTab('teams');
  };

  const handleConfigureSystem = () => {
    setActiveTab('system');
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    // Reset forms when switching tabs
    if (value !== 'users') {
      setShowUserForm(false);
    }
    if (value !== 'teams') {
      setShowTeamForm(false);
    }
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
        <AlertCircle className={styles.errorIcon} />
        <h2>Erro ao carregar dashboard</h2>
        <p>{error}</p>
        <Button onClick={fetchData}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoSection}>
              <div>
                <h1 className={styles.headerTitle}>Acelerador de Vendas</h1>
                <p className={styles.headerSubtitle}>Painel Administrativo</p>
              </div>
            </div>
          </div>
          
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userData?.user?.username}</span>
                <Badge variant="primary" size="small">Administrador</Badge>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                className={styles.logoutButton}
              >
                <LogOut className={styles.buttonIcon} />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Welcome Section */}
          <div className={styles.welcomeSection}>
            <h2 className={styles.welcomeTitle}>
              Bem-vindo, {userData?.user?.username}!
            </h2>
            <p className={styles.welcomeSubtitle}>
              Gerencie todo o sistema do Acelerador de Vendas
            </p>
          </div>

          {/* System Status */}
          <Card className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <Activity className={styles.statusIcon} />
              <h2 className={styles.statusTitle}>Status do Sistema</h2>
            </div>
            <div className={styles.statusContent}>
              <div className={styles.statusInfo}>
                <Badge 
                  variant={systemStatus?.status_atual === 'workshop' ? 'primary' : 'secondary'}
                  size="medium"
                >
                  {systemStatus?.status_display || 'Carregando...'}
                </Badge>
                <span className={styles.statusText}>
                  Status atual do sistema: {systemStatus?.status_display || 'Carregando...'}
                </span>
              </div>
            </div>
          </Card>

          {/* Management Tabs - Apenas Visão Geral */}
          <Card className={styles.tabsCard}>
            <Tabs defaultValue="overview" className={styles.tabsContainer} onValueChange={handleTabChange}>
              <Tabs.List className={styles.tabsList}>
                <Tabs.Trigger value="overview" className={styles.tabTrigger}>
                  Visão Geral
                </Tabs.Trigger>
                <Tabs.Trigger value="users" className={styles.tabTrigger}>
                  Usuários
                </Tabs.Trigger>
                <Tabs.Trigger value="teams" className={styles.tabTrigger}>
                  Equipes
                </Tabs.Trigger>
                <Tabs.Trigger value="system" className={styles.tabTrigger}>
                  Sistema
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="overview" className={styles.tabContent}>
                <div className={styles.overviewGrid}>
                  <Card className={styles.activityCard}>
                    <div className={styles.cardHeader}>
                      <TrendingUp className={styles.headerIcon} />
                      <h3 className={styles.cardTitle}>Atividade Recente</h3>
                    </div>
                    <div className={styles.activityList}>
                      <div className={styles.activityItem}>
                        <div className={styles.activityIndicator}></div>
                        <span className={styles.activityText}>Sistema operacional</span>
                        <span className={styles.activityTime}>Agora</span>
                      </div>
                      <div className={styles.activityItem}>
                        <div className={`${styles.activityIndicator} ${styles.blue}`}></div>
                        <span className={styles.activityText}>Usuários ativos</span>
                        <span className={styles.activityTime}>Hoje</span>
                      </div>
                      <div className={styles.activityItem}>
                        <div className={`${styles.activityIndicator} ${styles.yellow}`}></div>
                        <span className={styles.activityText}>Workshop em andamento</span>
                        <span className={styles.activityTime}>2 dias</span>
                      </div>
                    </div>
                  </Card>

                  <Card className={styles.actionsCard}>
                    <div className={styles.cardHeader}>
                      <Settings className={styles.headerIcon} />
                      <h3 className={styles.cardTitle}>Ações Rápidas</h3>
                    </div>
                    <div className={styles.actionsList}>
                      <Button variant="outline" className={styles.actionButton} onClick={handleCreateUser}>
                        <Plus className={styles.buttonIcon} />
                        Criar Novo Usuário
                      </Button>
                      <Button variant="outline" className={styles.actionButton} onClick={handleCreateTeam}>
                        <Plus className={styles.buttonIcon} />
                        Criar Nova Equipe
                      </Button>
                      <Button variant="outline" className={styles.actionButton} onClick={handleConfigureSystem}>
                        <Settings className={styles.buttonIcon} />
                        Configurar Sistema
                      </Button>
                    </div>
                  </Card>
                </div>
              </Tabs.Content>

              <Tabs.Content value="users" className={styles.tabContent}>
                <UserManagement token={sessionStorage.getItem('token')} initialShowForm={showUserForm} />
              </Tabs.Content>

              <Tabs.Content value="teams" className={styles.tabContent}>
                <TeamManagement token={sessionStorage.getItem('token')} initialShowForm={showTeamForm} />
              </Tabs.Content>

              <Tabs.Content value="system" className={styles.tabContent}>
                <StatusControl token={sessionStorage.getItem('token')} />
              </Tabs.Content>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;
