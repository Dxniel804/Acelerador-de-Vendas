import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  LogOut,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import styles from './DashboardEquipe.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import VendasPosWorkshop from './VendasPosWorkshop';

const DashboardEquipe = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [propostas, setPropostas] = useState([]);
  const [minhasVendasPos, setMinhasVendasPos] = useState({
    aguardando_validacao: [],
    vendas_validadas: [],
    vendas_rejeitadas: [],
    total_aguardando: 0,
    total_validadas: 0,
    total_rejeitadas: 0
  });
  const [novaProposta, setNovaProposta] = useState({
    cliente: '',
    vendedor: '',
    valor_proposta: '',
    descricao: '',
    quantidade_produtos: 0,
    arquivo_pdf: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [showVendaForm, setShowVendaForm] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState(null);
  const [formDataVenda, setFormDataVenda] = useState({
    quantidade_produtos_vendidos: 0,
    valor_total_venda: 0,
    observacoes: ''
  });

  const API_BASE = 'http://localhost:8000/api';

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

      // Buscar dashboard
      const dashboardResponse = await fetch(`${API_BASE}/equipe/dashboard/`, { headers });
      if (dashboardResponse.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!dashboardResponse.ok) throw new Error('Erro ao buscar dashboard');
      const dashboard = await dashboardResponse.json();

      // Buscar propostas
      const propostasResponse = await fetch(`${API_BASE}/equipe/propostas/`, { headers });
      if (propostasResponse.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!propostasResponse.ok) throw new Error('Erro ao buscar propostas');
      const propostasData = await propostasResponse.json();

      // Buscar minhas vendas no Pós-Workshop (para listar rejeitadas)
      let minhasVendasData = {
        aguardando_validacao: [],
        vendas_validadas: [],
        vendas_rejeitadas: [],
        total_aguardando: 0,
        total_validadas: 0,
        total_rejeitadas: 0
      };
      if (dashboard?.status_sistema === 'pos_workshop') {
        const minhasVendasResponse = await fetch(`${API_BASE}/equipe/minhas-vendas-concretizadas/`, { headers });
        if (minhasVendasResponse.status === 401) {
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        if (minhasVendasResponse.ok) {
          minhasVendasData = await minhasVendasResponse.json();
        }
      }

      setDashboardData(dashboard);
      setPropostas(propostasData);
      setMinhasVendasPos(minhasVendasData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cadastrarProposta = async () => {
    if (!dashboardData?.pode_enviar_propostas) {
      setError('Envio de propostas não permitido no status atual do sistema');
      return;
    }

    try {
      setSalvando(true);
      const token = sessionStorage.getItem('token');

      if (!token) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      
      const formDataToSend = new FormData();
      formDataToSend.append('cliente', novaProposta.cliente);
      formDataToSend.append('vendedor', novaProposta.vendedor);
      formDataToSend.append('valor_proposta', novaProposta.valor_proposta);
      formDataToSend.append('descricao', novaProposta.descricao);
      formDataToSend.append('quantidade_produtos', novaProposta.quantidade_produtos);
      
      if (novaProposta.arquivo_pdf) {
        formDataToSend.append('arquivo_pdf', novaProposta.arquivo_pdf);
      }

      // Debug: Mostrar dados sendo enviados
      console.log('DEBUG: Dados sendo enviados:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await fetch(`${API_BASE}/equipe/propostas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`
        },
        body: formDataToSend
      });

      if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('DEBUG: Erro response:', errorData);
        throw new Error(errorData.error || 'Erro ao cadastrar proposta');
      }
      
      const result = await response.json();
      console.log('DEBUG: Proposta criada:', result);
      
      // Limpar formulário e recarregar
      setNovaProposta({
        cliente: '',
        vendedor: '',
        valor_proposta: '',
        descricao: '',
        quantidade_produtos: 0,
        arquivo_pdf: null
      });
      fetchData();
      
      setError(null);
      alert('Proposta cadastrada com sucesso!');
    } catch (err) {
      setError(err.message);
      alert('Erro ao cadastrar proposta: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRegistrarVenda = (proposta) => {
    setSelectedProposta(proposta);
    setFormDataVenda({
      quantidade_produtos_vendidos: proposta.quantidade_produtos,
      valor_total_venda: proposta.valor_proposta,
      observacoes: ''
    });
    setShowVendaForm(true);
  };

  const confirmarVenda = async () => {
    if (!selectedProposta) return;

    try {
      setSalvando(true);
      const token = sessionStorage.getItem('token');

      if (!token) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${API_BASE}/propostas/${selectedProposta.id}/registrar_venda_pre_workshop/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDataVenda)
      });

      if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar venda');
      }
      
      const result = await response.json();
      
      // Fechar formulário e recarregar dados
      setShowVendaForm(false);
      setSelectedProposta(null);
      setFormDataVenda({
        quantidade_produtos_vendidos: 0,
        valor_total_venda: 0,
        observacoes: ''
      });
      fetchData();
      
      alert('Venda registrada com sucesso! Aguardando validação do gestor.');
    } catch (err) {
      setError(err.message);
      alert('Erro ao registrar venda: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'enviada': 'bg-blue-100 text-blue-800',
      'validada': 'bg-green-100 text-green-800',
      'rejeitada': 'bg-red-100 text-red-800',
      'vendida': 'bg-purple-100 text-purple-800',
      'nao_vendida': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'enviada': <Clock className="h-4 w-4" />,
      'validada': <CheckCircle className="h-4 w-4" />,
      'rejeitada': <XCircle className="h-4 w-4" />,
      'vendida': <TrendingUp className="h-4 w-4" />,
      'nao_vendida': <AlertCircle className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const downloadPDF = (url) => {
    if (!url) return;

    const pdfUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Erro ao carregar dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  const equipe = JSON.parse(sessionStorage.getItem('equipe') || '{}');

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.headerTitle}>Dashboard da Equipe</h1>
            <div className={styles.badgesRow}>
              <span className={`${styles.badge} ${styles.badgeEquipe}`}>
                <Users className="h-4 w-4" style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {equipe.nome || 'Equipe'}
              </span>
              <span className={`${styles.badge} ${styles.badgeRegional}`}>
                Regional: {dashboardData?.regional}
              </span>
              <span className={`${styles.badge} ${styles.badgeStatus}`}>
                Status: {dashboardData?.status_sistema?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button onClick={fetchData} className={styles.refreshButton}>
              <RefreshCw className={styles.buttonIcon} />
              Atualizar
            </button>
            <button onClick={logout} className={styles.logoutButton}>
              <LogOut className={styles.buttonIcon} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
        {/* Alertas */}
        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {!dashboardData?.pode_enviar_propostas && (
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <AlertCircle className="h-4 w-4" />
            <span>
              O envio de propostas não está permitido no status atual do sistema: {dashboardData?.status_sistema}
            </span>
          </div>
        )}

        <Tabs defaultValue={(dashboardData?.status_sistema === 'pre_workshop') ? "vendas" : (dashboardData?.status_sistema === 'pos_workshop') ? "vendas-concretizadas" : "dashboard"} className="space-y-6" style={{ width: '100%' }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="propostas">
              {dashboardData?.status_sistema === 'pos_workshop' ? 'Propostas Vendidas Rejeitadas' : 'Minhas Propostas'}
            </TabsTrigger>
            {(dashboardData?.status_sistema === 'pre_workshop') ? (
              <TabsTrigger value="vendas">Vender</TabsTrigger>
            ) : (dashboardData?.status_sistema === 'pos_workshop') ? (
              <TabsTrigger value="vendas-concretizadas">Vendas Concretizadas</TabsTrigger>
            ) : (
              <TabsTrigger value="nova">Nova Proposta</TabsTrigger>
            )}
          </TabsList>

          {/* Aba Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Cards de Métricas */}
            {dashboardData?.status_sistema === 'pos_workshop' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData?.total_propostas || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Todas as propostas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Propostas Vendidas Validadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{dashboardData?.vendas_validadas || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Aceitas pelo gestor
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Propostas Vendidas Rejeitadas</CardTitle>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{dashboardData?.vendas_rejeitadas || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Rejeitadas pelo gestor
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData?.total_propostas || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Todas as propostas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Propostas Enviadas</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{dashboardData?.propostas_enviadas || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Aguardando validação
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Propostas Validadas</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{dashboardData?.propostas_validadas || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Aprovadas pelo gestor
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Propostas Rejeitadas</CardTitle>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{dashboardData?.propostas_rejeitadas || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Precisam correção
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Vendas Concretizadas</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{dashboardData?.vendas_concretizadas || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Apenas vendas aceitas pelo gestor
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Aba Minhas Propostas */}
          <TabsContent value="propostas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {dashboardData?.status_sistema === 'pos_workshop' ? 'Propostas Vendidas Rejeitadas' : 'Minhas Propostas'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.status_sistema === 'pos_workshop' ? (
                  (minhasVendasPos?.vendas_rejeitadas || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma venda rejeitada encontrada</p>
                      <p className="text-sm mt-2">Aqui aparecerão as propostas que o gestor rejeitar como venda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {minhasVendasPos.vendas_rejeitadas.map((proposta) => (
                        <div key={proposta.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">Proposta #{proposta.id}</h3>
                                <Badge className={getStatusColor(proposta.status)}>
                                  {getStatusIcon(proposta.status)}
                                  <span className="ml-1">{proposta.status_display}</span>
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Cliente:</span> {proposta.cliente_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Vendedor:</span> {proposta.vendedor_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Valor:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div>
                                  <span className="font-medium">Produtos:</span> {proposta.quantidade_produtos}
                                </div>
                              </div>
                              {(proposta.motivo_rejeicao_venda || proposta.motivo_rejeicao) && (
                                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm">
                                  <span className="font-medium text-red-700">Motivo da rejeição:</span>
                                  <p className="text-red-600">{proposta.motivo_rejeicao_venda || proposta.motivo_rejeicao}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {proposta.arquivo_pdf && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadPDF(proposta.arquivo_pdf)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : propostas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma proposta cadastrada ainda</p>
                    <p className="text-sm mt-2">Crie sua primeira proposta na aba "Nova Proposta"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {propostas.map((proposta) => (
                      <div key={proposta.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">Proposta #{proposta.id}</h3>
                              <Badge className={getStatusColor(proposta.status)}>
                                {getStatusIcon(proposta.status)}
                                <span className="ml-1">{proposta.status_display}</span>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Cliente:</span> {proposta.cliente_nome}
                              </div>
                              <div>
                                <span className="font-medium">Vendedor:</span> {proposta.vendedor_nome}
                              </div>
                              <div>
                                <span className="font-medium">Valor:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div>
                                <span className="font-medium">Produtos:</span> {proposta.quantidade_produtos}
                              </div>
                            </div>
                            {proposta.descricao && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Descrição:</span> {proposta.descricao}
                              </div>
                            )}
                            {proposta.motivo_rejeicao && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm">
                                <span className="font-medium text-red-700">Motivo da rejeição:</span>
                                <p className="text-red-600">{proposta.motivo_rejeicao}</p>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                              Enviada em: {new Date(proposta.data_envio).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {proposta.arquivo_pdf && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadPDF(proposta.arquivo_pdf)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                PDF
                              </Button>
                            )}
                            {proposta.status === 'rejeitada' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = '/corrigir-propostas'}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Corrigir
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Nova Proposta - Apenas fora do Pós-Workshop */}
          {(dashboardData?.status_sistema !== 'pos_workshop') && (
            <TabsContent value="nova" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Cadastrar Nova Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!dashboardData?.pode_enviar_propostas ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Envio de propostas não permitido</p>
                      <p className="text-sm mt-2">
                        Status atual: {dashboardData?.status_sistema?.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cliente">Cliente *</Label>
                          <Input
                            id="cliente"
                            value={novaProposta.cliente}
                            onChange={(e) => setNovaProposta({...novaProposta, cliente: e.target.value})}
                            placeholder="Nome do cliente"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vendedor">Vendedor *</Label>
                          <Input
                            id="vendedor"
                            value={novaProposta.vendedor}
                            onChange={(e) => setNovaProposta({...novaProposta, vendedor: e.target.value})}
                            placeholder="Nome do vendedor"
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="valor_proposta">Valor da Proposta *</Label>
                          <Input
                            id="valor_proposta"
                            type="number"
                            step="0.01"
                            value={novaProposta.valor_proposta}
                            onChange={(e) => setNovaProposta({...novaProposta, valor_proposta: e.target.value})}
                            placeholder="0,00"
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quantidade_produtos">Quantidade de Produtos *</Label>
                          <Input
                            id="quantidade_produtos"
                            type="number"
                            value={novaProposta.quantidade_produtos}
                            onChange={(e) => setNovaProposta({...novaProposta, quantidade_produtos: parseInt(e.target.value) || 0})}
                            placeholder="0"
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea
                          id="descricao"
                          value={novaProposta.descricao}
                          onChange={(e) => setNovaProposta({...novaProposta, descricao: e.target.value})}
                          placeholder="Descreva os detalhes da proposta..."
                          className="mt-2"
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="arquivo_pdf">Arquivo PDF *</Label>
                        <Input
                          id="arquivo_pdf"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setNovaProposta({...novaProposta, arquivo_pdf: e.target.files[0]})}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Anexe a proposta em formato PDF
                        </p>
                      </div>

                      <div className="flex justify-end gap-4">
                        <Button
                          variant="outline"
                          onClick={() => setNovaProposta({
                            cliente: '',
                            vendedor: '',
                            valor_proposta: '',
                            descricao: '',
                            quantidade_produtos: 0,
                            arquivo_pdf: null
                          })}
                        >
                          Limpar
                        </Button>
                        <Button
                          onClick={cadastrarProposta}
                          disabled={salvando || !novaProposta.cliente || !novaProposta.vendedor || !novaProposta.valor_proposta || !novaProposta.arquivo_pdf}
                        >
                          {salvando ? (
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Cadastrar Proposta
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Aba Vendas - Pré-Workshop */}
          {dashboardData?.status_sistema === 'pre_workshop' && (
            <TabsContent value="vendas" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Registrar Vendas
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Selecione uma proposta validada para registrar como venda
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Lista de propostas validadas */}
                    <div>
                      <Label className="text-sm font-medium">Propostas Validadas</Label>
                      <div className="mt-2 space-y-2">
                        {propostas.filter(p => p.status === 'validada').length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma proposta validada encontrada</p>
                            <p className="text-sm mt-2">
                              Aguarde a validação das propostas pelo gestor
                            </p>
                          </div>
                        ) : (
                          propostas.filter(p => p.status === 'validada').map((proposta) => (
                            <div key={proposta.id} className="border rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">Proposta #{proposta.id}</h4>
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Validada
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>
                                      <span className="font-medium">Cliente:</span> {proposta.cliente_nome}
                                    </div>
                                    <div>
                                      <span className="font-medium">Valor:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div>
                                      <span className="font-medium">Produtos:</span> {proposta.quantidade_produtos}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Button
                                    onClick={() => handleRegistrarVenda(proposta)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    VENDER
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Aba Vendas Concretizadas - Pós-Workshop */}
          {dashboardData?.status_sistema === 'pos_workshop' && (
            <TabsContent value="vendas-concretizadas" className="space-y-6">
              <VendasPosWorkshop />
            </TabsContent>
          )}
        </Tabs>
        </div>
      </main>

      {/* Modal de Formulário de Venda */}
      {showVendaForm && selectedProposta && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Registrar Venda</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowVendaForm(false);
                  setSelectedProposta(null);
                }}
              >
                ✕
              </Button>
            </div>

            {/* Informações da Proposta Selecionada */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Proposta Selecionada</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Proposta #{selectedProposta.id}</span>
                </div>
                <div>
                  <span className="font-medium">Cliente:</span> {selectedProposta.cliente_nome}
                </div>
                <div>
                  <span className="font-medium">Valor Original:</span> R$ {selectedProposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div>
                  <span className="font-medium">Produtos:</span> {selectedProposta.quantidade_produtos}
                </div>
              </div>
            </div>

            {/* Formulário de Venda */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantidade_produtos_vendidos">Quantidade de Produtos Vendidos *</Label>
                  <Input
                    id="quantidade_produtos_vendidos"
                    type="number"
                    value={formDataVenda.quantidade_produtos_vendidos}
                    onChange={(e) => setFormDataVenda({...formDataVenda, quantidade_produtos_vendidos: parseInt(e.target.value) || 0})}
                    className="mt-2"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="valor_total_venda">Valor Total da Venda *</Label>
                  <Input
                    id="valor_total_venda"
                    type="number"
                    step="0.01"
                    value={formDataVenda.valor_total_venda}
                    onChange={(e) => setFormDataVenda({...formDataVenda, valor_total_venda: parseFloat(e.target.value) || 0})}
                    className="mt-2"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formDataVenda.observacoes}
                  onChange={(e) => setFormDataVenda({...formDataVenda, observacoes: e.target.value})}
                  placeholder="Adicione observações sobre esta venda..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVendaForm(false);
                    setSelectedProposta(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarVenda}
                  disabled={salvando || !formDataVenda.quantidade_produtos_vendidos || !formDataVenda.valor_total_venda}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {salvando ? (
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Venda
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEquipe;
