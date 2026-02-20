import { API_URL } from '../../api_config';
import React, { useState, useEffect } from 'react';
import {
    Activity,
    TrendingUp,
    LogOut,
    AlertCircle,
} from 'lucide-react';
import styles from './DashboardAdmin.module.css';
import Button from '../../components/Button/Button';
import Badge from '../../components/Badge/Badge';
import Card from '../../components/Card/Card';
import UserManagement from '../../components/UserManagement';
import TeamManagement from '../../components/TeamManagement';
import StatusControl from '../../components/StatusControl';

const DashboardAdmin = () => {
    const [userData, setUserData] = useState(null);
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            };

            // Buscar dados do usuário
            const userResponse = await fetch(`${API_URL}/api/auth/meu_perfil/`, { headers });
            if (userResponse.status === 401 || userResponse.status === 403) {
                sessionStorage.clear();
                window.location.href = '/login';
                return;
            }
            if (!userResponse.ok) throw new Error('Erro ao buscar perfil');
            const userData = await userResponse.json();

            setUserData(userData);

            // Buscar status do sistema
            const statusResponse = await fetch(`${API_URL}/api/admin/status_sistema/`, { headers });
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
                                <Badge variant="primary" size="small">
                                    Administrador
                                </Badge>
                            </div>
                            <Button variant="outline" onClick={logout} className={styles.logoutButton}>
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
                        <h2 className={styles.welcomeTitle}>Bem-vindo, {userData?.user?.username}!</h2>
                        <p className={styles.welcomeSubtitle}>Gerencie todo o sistema do Acelerador de Vendas</p>
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

                    {/* Management Sections – tudo sempre visível */}
                    <div className={styles.managementGrid}>
                        <div className={styles.managementColumn}>
                            <Card className={styles.simpleCard}>
                                <div className={styles.cardHeader}>
                                    <TrendingUp className={styles.headerIcon} />
                                    <h3 className={styles.cardTitle}>Gestão de Usuários</h3>
                                </div>
                                <div className={styles.cardBody}>
                                    <UserManagement
                                        token={sessionStorage.getItem('token')}
                                        initialShowForm={true}
                                    />
                                </div>
                            </Card>
                        </div>

                        <div className={styles.managementColumn}>
                            <Card className={styles.simpleCard}>
                                <div className={styles.cardHeader}>
                                    <TrendingUp className={styles.headerIcon} />
                                    <h3 className={styles.cardTitle}>Gestão de Equipes</h3>
                                </div>
                                <div className={styles.cardBody}>
                                    <TeamManagement
                                        token={sessionStorage.getItem('token')}
                                        initialShowForm={true}
                                    />
                                </div>
                            </Card>
                        </div>
                    </div>

                    <Card className={styles.simpleCard}>
                        <div className={styles.cardHeader}>
                            <TrendingUp className={styles.headerIcon} />
                            <h3 className={styles.cardTitle}>Controle do Sistema</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <StatusControl token={sessionStorage.getItem('token')} />
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default DashboardAdmin;
