import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  ArrowRight
} from 'lucide-react';
import ValidarVendas from './ValidarVendas';
import styles from './DashboardGestor.module.css';

const DashboardGestor = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [equipes, setEquipes] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [vendasPendentes, setVendasPendentes] = useState([]);
  const [propostaSelecionada, setPropostaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validando, setValidando] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

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
      const storedUser = getStoredUser();
      if (!storedUser || (storedUser.nivel !== 'gestor' && storedUser.nivel !== 'administrador')) {
        window.location.href = '/dashboard';
        return;
      }

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
      const dashboardResponse = await fetch(`${API_BASE}/gestor/dashboard/`, { headers });
      if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!dashboardResponse.ok) throw new Error('Erro ao buscar dashboard');
      const dashboard = await dashboardResponse.json();

      // Buscar equipes
      const equipesResponse = await fetch(`${API_BASE}/gestor/equipes/`, { headers });
      if (equipesResponse.status === 401 || equipesResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!equipesResponse.ok) throw new Error('Erro ao buscar equipes');
      const equipesData = await equipesResponse.json();

      // Buscar propostas pendentes (não exibir no Pós-Workshop)
      let propostasData = [];
      if (dashboard.status_sistema !== 'pos_workshop') {
        const propostasResponse = await fetch(`${API_BASE}/gestor/propostas/`, { headers });
        if (propostasResponse.status === 401 || propostasResponse.status === 403) {
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        if (!propostasResponse.ok) throw new Error('Erro ao buscar propostas');
        propostasData = await propostasResponse.json();
      }

      // Buscar vendas pendentes (apenas no Pré-Workshop)
      let vendasPendentesData = [];
      if (dashboard.status_sistema === 'pre_workshop') {
        const vendasResponse = await fetch(`${API_BASE}/vendas/para_validar/`, { headers });
        if (vendasResponse.status === 401 || vendasResponse.status === 403) {
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        if (vendasResponse.ok) {
          vendasPendentesData = await vendasResponse.json();
        }
      }

      setDashboardData(dashboard);
      setEquipes(equipesData);
      setPropostas(propostasData);
      setVendasPendentes(vendasPendentesData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verDetalhesProposta = async (propostaId) => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/gestor/propostas/${propostaId}/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar detalhes da proposta');
      const proposta = await response.json();
      setPropostaSelecionada(proposta);
    } catch (err) {
      setError(err.message);
    }
  };

  const validarProposta = async (acao) => {
    if (!propostaSelecionada) return;

    if (acao === 'rejeitar' && !motivoRejeicao.trim()) {
      setError('Motivo da rejeição é obrigatório');
      return;
    }

    try {
      setValidando(true);
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/gestor/propostas/${propostaSelecionada.id}/validar/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          acao: acao,
          motivo: motivoRejeicao
        })
      });

      if (!response.ok) throw new Error('Erro ao validar proposta');
      
      const result = await response.json();
      
      // Fechar modal e recarregar dados
      setPropostaSelecionada(null);
      setMotivoRejeicao('');
      fetchData();
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setValidando(false);
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
    sessionStorage.clear();
    window.location.reload();
  };

  const downloadPDF = (url) => {
    if (url) {
      // Construir URL completa para o arquivo PDF
      const pdfUrl = `http://localhost:8000${url}`;
      console.log('DEBUG: Abrindo PDF:', pdfUrl);
      window.open(pdfUrl, '_blank');
    }
  };

  const validarVenda = async (vendaId, acao) => {
    if (!window.confirm(`Tem certeza que deseja ${acao === 'validar' ? 'validar' : 'rejeitar'} esta venda?`)) {
      return;
    }

    try {
      setValidando(true);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${API_BASE}/vendas/${vendaId}/validar_pre_workshop/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          acao: acao,
          motivo: motivoRejeicao
        })
      });

      if (response.status === 401 || response.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao validar venda');
      }
      
      const result = await response.json();
      
      // Recarregar dados
      fetchData();
      setMotivoRejeicao('');
      
      alert(result.message);
    } catch (err) {
      setError(err.message);
      alert('Erro ao validar venda: ' + err.message);
    } finally {
      setValidando(false);
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
        <h2>Erro ao carregar dashboard</h2>
        <p>{error}</p>
        <Button onClick={fetchData}>Tentar novamente</Button>
      </div>
    );
  }

  const isPosWorkshop = dashboardData?.status_sistema === 'pos_workshop';

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div>
              <h1 className={styles.headerTitle}>Dashboard do Gestor</h1>
              <p className={styles.headerSubtitle}>Painel de Validação e Equipes</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.badgesRow}>
              <span className={`${styles.badge} ${styles.badgeRegional}`}>
                Regional: {dashboardData?.regional}
              </span>
              <span className={`${styles.badge} ${styles.badgeStatus}`}>
                Status: {dashboardData?.status_sistema?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <button onClick={fetchData} className={styles.refreshButton}>
              <RefreshCw className={styles.buttonIcon} />
              Atualizar
            </button>
            <div className={styles.userInfo}>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{getStoredUser()?.username}</span>
                <span className={styles.userRole}>Gestor</span>
              </div>
              <button onClick={logout} className={styles.logoutButton}>
                <LogOut className={styles.buttonIcon} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
        <div className={styles.tabsCard}>
        <Tabs defaultValue={(dashboardData?.status_sistema === 'pre_workshop') ? "vendas" : (dashboardData?.status_sistema === 'pos_workshop') ? "validar-vendas" : "propostas"} className="space-y-0">
          <TabsList className={styles.tabsList}>
            {!isPosWorkshop && (
              <TabsTrigger value="propostas" className={styles.tabTrigger}>Propostas</TabsTrigger>
            )}
            {(dashboardData?.status_sistema === 'pre_workshop') && (
              <TabsTrigger value="vendas" className={styles.tabTrigger}>Vendas para Validar</TabsTrigger>
            )}
            {(dashboardData?.status_sistema === 'pos_workshop') && (
              <TabsTrigger value="validar-vendas" className={styles.tabTrigger}>Validar Vendas</TabsTrigger>
            )}
            <TabsTrigger value="equipes" className={styles.tabTrigger}>Equipes</TabsTrigger>
          </TabsList>

          
          {/* Aba Propostas */}
          {!isPosWorkshop && (
            <TabsContent value="propostas" className={`space-y-6 ${styles.tabContent}`}>
              <Card className={styles.contentCard}>
                <CardHeader className={styles.contentCardHeader}>
                  <FileText className={styles.contentCardTitleIcon} />
                  <CardTitle className={styles.contentCardTitle}>
                    Propostas Aguardando Validação
                  </CardTitle>
                </CardHeader>
                <CardContent className={styles.contentCardBody}>
                  {propostas.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}><FileText className="h-16 w-16" /></div>
                      <p className={styles.emptyStateTitle}>Nenhuma proposta aguardando validação</p>
                      <p className={styles.emptyStateText}>As propostas enviadas pelas equipes aparecerão aqui para validação</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {propostas.map((proposta) => (
                        <div key={proposta.id} className={styles.propostaItem}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">Proposta #{proposta.id}</h3>
                                <Badge className={getStatusColor(proposta.status)}>
                                  {getStatusIcon(proposta.status)}
                                  <span className="ml-1">{proposta.status_display}</span>
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Equipe:</span> {proposta.equipe_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Cliente:</span> {proposta.cliente_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Valor:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div>
                                  <span className="font-medium">Vendedor:</span> {proposta.vendedor_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Produtos:</span> {proposta.quantidade_produtos}
                                </div>
                                <div>
                                  <span className="font-medium">Data:</span> {new Date(proposta.data_envio).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                              {proposta.descricao && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Descrição:</span> {proposta.descricao}
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
                                  <Download className="h-4 w-4 mr-2" />
                                  PDF
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verDetalhesProposta(proposta.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Validar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Aba Vendas para Validar - Apenas no Pré-Workshop */}
          {(dashboardData?.status_sistema === 'pre_workshop') && (
            <TabsContent value="vendas" className={`space-y-6 ${styles.tabContent}`}>
              <Card className={styles.contentCard}>
                <CardHeader className={styles.contentCardHeader}>
                  <TrendingUp className={styles.contentCardTitleIcon} />
                  <div>
                    <CardTitle className={styles.contentCardTitle}>
                      Vendas para Validar
                    </CardTitle>
                    <p className={styles.emptyStateText} style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.8)' }}>
                      Valide as vendas registradas pelas equipes
                    </p>
                  </div>
                </CardHeader>
                <CardContent className={styles.contentCardBody}>
                  {vendasPendentes.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}><TrendingUp className="h-16 w-16" /></div>
                      <p className={styles.emptyStateTitle}>Nenhuma venda pendente de validação</p>
                      <p className={styles.emptyStateText}>As equipes ainda não registraram vendas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vendasPendentes.map((venda) => (
                        <div key={venda.id} className={styles.propostaItem}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">Venda #{venda.id}</h3>
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {venda.status_validacao_display}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Equipe:</span> {venda.equipe_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Cliente:</span> {venda.cliente_nome}
                                </div>
                                <div>
                                  <span className="font-medium">Valor:</span> R$ {venda.valor_total_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div>
                                  <span className="font-medium">Produtos Vendidos:</span> {venda.quantidade_produtos_vendidos}
                                </div>
                                <div>
                                  <span className="font-medium">Data da Venda:</span> {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                                </div>
                                <div>
                                  <span className="font-medium">Observações:</span> {venda.observacoes || 'Nenhuma'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                onClick={() => validarVenda(venda.id, 'validar')}
                                disabled={validando}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {validando ? (
                                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Validar
                              </Button>
                              <Button
                                onClick={() => validarVenda(venda.id, 'rejeitar')}
                                disabled={validando}
                                variant="destructive"
                              >
                                {validando ? (
                                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Rejeitar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Aba Equipes */}
          <TabsContent value="equipes" className={`space-y-6 ${styles.tabContent}`}>
            <Card className={styles.contentCard}>
              <CardHeader className={styles.contentCardHeader}>
                <Users className={styles.contentCardTitleIcon} />
                <CardTitle className={styles.contentCardTitle}>
                  Equipes da Regional
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.contentCardBody}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipes.map((equipe) => (
                    <div key={equipe.id} className={styles.propostaItem}>
                      <h3 className="font-semibold text-lg mb-2">{equipe.nome}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><span className="font-medium">Código:</span> {equipe.codigo}</div>
                        <div><span className="font-medium">Regional:</span> {equipe.regional_nome}</div>
                        <div><span className="font-medium">Vendedores:</span> {equipe.vendedores_count}</div>
                        <div><span className="font-medium">Status:</span> 
                          <Badge className={equipe.ativo ? 'bg-green-100 text-green-800 ml-2' : 'bg-red-100 text-red-800 ml-2'}>
                            {equipe.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Validar Vendas (Pós-Workshop) */}
          {dashboardData?.status_sistema === 'pos_workshop' && (
            <TabsContent value="validar-vendas" className={`space-y-6 ${styles.tabContent}`}>
              <ValidarVendas />
            </TabsContent>
          )}
        </Tabs>
        </div>
        </div>
      </main>

      {/* Modal de Validação de Proposta */}
      {propostaSelecionada && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalBody}>
                <h2 className={styles.modalTitle}>Validar Proposta #{propostaSelecionada.id}</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Equipe</Label>
                      <p className="font-medium">{propostaSelecionada.equipe_nome}</p>
                    </div>
                    <div>
                      <Label>Cliente</Label>
                      <p className="font-medium">{propostaSelecionada.cliente_nome}</p>
                    </div>
                    <div>
                      <Label>Vendedor</Label>
                      <p className="font-medium">{propostaSelecionada.vendedor_nome}</p>
                    </div>
                    <div>
                      <Label>Valor da Proposta</Label>
                      <p className="font-medium">R$ {propostaSelecionada.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <Label>Quantidade de Produtos</Label>
                      <p className="font-medium">{propostaSelecionada.quantidade_produtos}</p>
                    </div>
                    <div>
                      <Label>Data de Envio</Label>
                      <p className="font-medium">{new Date(propostaSelecionada.data_envio).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <p className="text-gray-700">{propostaSelecionada.descricao || 'Nenhuma descrição'}</p>
                  </div>

                  {propostaSelecionada.arquivo_pdf && (
                    <div>
                      <Label>Arquivo PDF</Label>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => downloadPDF(propostaSelecionada.arquivo_pdf)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                      </Button>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="motivo">Motivo da Rejeição (opcional para validação)</Label>
                    <Textarea
                      id="motivo"
                      value={motivoRejeicao}
                      onChange={(e) => setMotivoRejeicao(e.target.value)}
                      placeholder="Descreva o motivo da rejeição..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPropostaSelecionada(null);
                      setMotivoRejeicao('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => validarProposta('rejeitar')}
                    disabled={validando || !motivoRejeicao.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {validando ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => validarProposta('validar')}
                    disabled={validando}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {validando ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Validar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default DashboardGestor;
