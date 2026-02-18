import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Settings, 
  Database, 
  Shield, 
  Activity,
  TrendingUp,
  UserPlus,
  TeamIcon,
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
      const userResponse = await fetch('http://localhost:8000/api/auth/meu_perfil/', { headers });
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
        fetch('http://localhost:8000/api/admin/usuarios/', { headers }),
        fetch('http://localhost:8000/api/admin/equipes/', { headers }),
        fetch('http://localhost:8000/api/regionais/', { headers }),
        fetch('http://localhost:8000/api/admin/status_sistema/', { headers })
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
    <div className="min-h-screen bg-background-secondary">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Sistema operacional</span>
                      </div>
                      <span className="text-xs text-gray-500">Agora</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Usuários ativos</span>
                      </div>
                      <span className="text-xs text-gray-500">Hoje</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Workshop em andamento</span>
                      </div>
                      <span className="text-xs text-gray-500">2 dias</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement token={sessionStorage.getItem('token')} />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamManagement token={sessionStorage.getItem('token')} />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <StatusControl token={sessionStorage.getItem('token')} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Informações Técnicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Banco de Dados</h3>
                      <p className="text-sm text-gray-500">SQLite local</p>
                    </div>
                    <Badge className="bg-green-100 text-green-primary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">API Backend</h3>
                      <p className="text-sm text-gray-500">Django REST Framework</p>
                    </div>
                    <Badge className="bg-green-100 text-green-primary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardAdmin;
