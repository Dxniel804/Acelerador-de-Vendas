import { API_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import Card from './Card/Card';
import Button from './Button/Button';
import Input from './Input/Input';
import Label from './Label/Label';
import Badge from './Badge/Badge';
import Tabs from './Tabs/Tabs';
import {
    Users,
    Settings,
    Database,
    Shield,
    Activity,
    TrendingUp,
    UserPlus,
    Building,
    LogOut,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Plus
} from 'lucide-react';
import UserManagement from './UserManagement';
import TeamManagement from './TeamManagement';
import StatusControl from './StatusControl';
import './DashboardAdmin.css';
import './AdminFix.css';

const DashboardAdmin = () => {
    const [userData, setUserData] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalEquipes: 0,
        totalPropostas: 0,
        totalRegionais: 0
    });
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
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            };

            // Buscar dados do usuário
            const userResponse = await fetch(`${API_URL}/auth/meu_perfil/`, { headers });
            if (userResponse.status === 401 || userResponse.status === 403) {
                sessionStorage.clear();
                window.location.href = '/login';
                return;
            }
            if (!userResponse.ok) throw new Error('Erro ao buscar perfil');
            const userData = await userResponse.json();

            setUserData(userData);

            // Buscar estatísticas reais da API
            const [usersResponse, equipesResponse, regionaisResponse, statusResponse] = await Promise.all([
                fetch(`${API_URL}/admin/usuarios/`, { headers }),
                fetch(`${API_URL}/admin/equipes/`, { headers }),
                fetch(`${API_URL}/regionais/`, { headers }),
                fetch(`${API_URL}/admin/status_sistema/`, { headers })
            ]);

            const anyForbidden = [usersResponse, equipesResponse, regionaisResponse, statusResponse].some(
                (r) => r.status === 401 || r.status === 403
            );
            if (anyForbidden) {
                sessionStorage.clear();
                window.location.href = '/login';
                return;
            }

            if (!usersResponse.ok) throw new Error('Erro ao buscar usuários');
            if (!equipesResponse.ok) throw new Error('Erro ao buscar equipes');
            if (!regionaisResponse.ok) throw new Error('Erro ao buscar regionais');
            if (!statusResponse.ok) throw new Error('Erro ao buscar status');

            const users = await usersResponse.json();
            const equipes = await equipesResponse.json();
            const regionais = await regionaisResponse.json();
            const statusData = await statusResponse.json();

            setStats({
                totalUsers: Array.isArray(users) ? users.length : 0,
                totalEquipes: Array.isArray(equipes) ? equipes.length : 0,
                totalPropostas: 0, // TODO: implementar quando tiver propostas
                totalRegionais: Array.isArray(regionais) ? regionais.length : 0
            });

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
            <div className="min-h-screen bg-background-secondary flex items-center justify-center">
                <div className="text-lg">Carregando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background-secondary flex items-center justify-center">
                <div className="text-red-600">Erro: {error}</div>
            </div>
        );
    }

    return (
        <div className="dashboard-admin min-h-screen bg-background-secondary">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="bg-orange-primary p-2 rounded-lg mr-3">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">Acelerador de Vendas</h1>
                                <p className="text-sm text-gray-500">Painel Administrativo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{userData?.user?.username}</p>
                                <p className="text-xs text-gray-500">Administrador</p>
                            </div>
                            <Button onClick={logout} variant="outline" size="sm">
                                <LogOut className="h-4 w-4 mr-2" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Bem-vindo, {userData?.user?.username}!
                    </h2>
                    <p className="text-gray-600">
                        Gerencie todo o sistema do Acelerador de Vendas
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUsers}</div>
                            <p className="text-xs text-muted-foreground">
                                Total de usuários cadastrados
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Equipes</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalEquipes}</div>
                            <p className="text-xs text-muted-foreground">
                                Equipes ativas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Propostas</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalPropostas}</div>
                            <p className="text-xs text-muted-foreground">
                                Propostas cadastradas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Regionais</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalRegionais}</div>
                            <p className="text-xs text-muted-foreground">
                                Regionais ativas
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* System Status */}
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Status do Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Badge
                                    variant={systemStatus?.status_atual === 'workshop' ? 'default' : 'secondary'}
                                    className="text-sm px-3 py-1"
                                >
                                    {systemStatus?.status_display || 'Carregando...'}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                    Status atual do sistema: {systemStatus?.status_display || 'Carregando...'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Management Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <Tabs.List className="grid w-full grid-cols-4">
                        <Tabs.Trigger value="overview">Visão Geral</Tabs.Trigger>
                        <Tabs.Trigger value="users">Usuários</Tabs.Trigger>
                        <Tabs.Trigger value="teams">Equipes</Tabs.Trigger>
                        <Tabs.Trigger value="system">Sistema</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <TrendingUp className="h-5 w-5" />
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Atividade Recente</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                                                <span style={{ fontSize: '0.875rem' }}>Sistema operacional</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Agora</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
                                                <span style={{ fontSize: '0.875rem' }}>Usuários ativos</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Hoje</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '8px', height: '8px', backgroundColor: '#eab308', borderRadius: '50%' }}></div>
                                                <span style={{ fontSize: '0.875rem' }}>Workshop em andamento</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>2 dias</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <Settings className="h-5 w-5" />
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Ações Rápidas</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <Button className="w-full justify-start" variant="outline">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar Novo Usuário
                                        </Button>
                                        <Button className="w-full justify-start" variant="outline">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar Nova Equipe
                                        </Button>
                                        <Button className="w-full justify-start" variant="outline">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Configurar Sistema
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="users" className="space-y-6">
                        <UserManagement token={sessionStorage.getItem('token')} />
                    </Tabs.Content>

                    <Tabs.Content value="teams" className="space-y-6">
                        <TeamManagement token={sessionStorage.getItem('token')} />
                    </Tabs.Content>

                    <Tabs.Content value="system" className="space-y-6">
                        <StatusControl token={sessionStorage.getItem('token')} />

                        <Card>
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Settings className="h-5 w-5" />
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Informações Técnicas</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 500 }}>Banco de Dados</h3>
                                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>SQLite local</p>
                                        </div>
                                        <Badge variant="success">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Ativo
                                        </Badge>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 500 }}>API Backend</h3>
                                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Django REST Framework</p>
                                        </div>
                                        <Badge variant="success">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Online
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Tabs.Content>
                </Tabs>
            </div>
        </div>
    );
};

export default DashboardAdmin;
