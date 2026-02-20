import React, { useState, useEffect } from 'react';
import { API_URL, API_BASE_URL } from '../api_config';
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
  ArrowRight,
  Hash,
  User,
  Info
} from 'lucide-react';
import ValidarVendas from './ValidarVendas';
import styles from './DashboardGestor.module.css';
import logoImg from '../assets/img/vendamais_logo.png';

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
  const [activeTab, setActiveTab] = useState('propostas');

  const API_BASE = API_URL;

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
      const dashboardResponse = await fetch(`${API_BASE}/api/gestor/dashboard/`, { headers });
      if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!dashboardResponse.ok) throw new Error('Erro ao buscar dashboard');
      const dashboard = await dashboardResponse.json();

      // Buscar equipes
      const equipesResponse = await fetch(`${API_BASE}/api/gestor/equipes/`, { headers });
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
        const propostasResponse = await fetch(`${API_BASE}/api/gestor/propostas/`, { headers });
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
        const vendasResponse = await fetch(`${API_BASE}/api/vendas/para_validar/`, { headers });
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

      // Definir aba inicial com base no status do sistema
      if (dashboard.status_sistema === 'pre_workshop') {
        setActiveTab('vendas');
      } else if (dashboard.status_sistema === 'pos_workshop') {
        setActiveTab('validar-vendas');
      } else {
        setActiveTab('propostas');
      }

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
      const response = await fetch(`${API_BASE}/api/gestor/propostas/${propostaId}/`, {
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
      const response = await fetch(`${API_BASE}/api/gestor/propostas/${propostaSelecionada.id}/validar/`, {
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
      const pdfUrl = `${API_BASE_URL}${url}`;
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

      const response = await fetch(`${API_BASE}/api/vendas/${vendaId}/validar_pre_workshop/`, {
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
            <img src={logoImg} alt="Venda Mais Logo" className={styles.logoImg} />
            <div>
              <h1 className={styles.headerTitle}>Dashboard do Gestor</h1>
              <p className={styles.headerSubtitle}>Painel de Validação e Equipes</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.badgesRow}>
              <span className={`${styles.badge} ${styles.badgeStatus}`}>
                Status: {dashboardData?.status_sistema?.replace('_', ' ').toUpperCase()}
              </span>
            </div>

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
          <div className={styles.tabsContainer}>
            {!isPosWorkshop && (
              <button
                className={`${styles.tabButton} ${activeTab === 'propostas' ? styles.active : ''}`}
                onClick={() => setActiveTab('propostas')}
              >
                Propostas
              </button>
            )}
            {dashboardData?.status_sistema === 'pre_workshop' && (
              <button
                className={`${styles.tabButton} ${activeTab === 'vendas' ? styles.active : ''}`}
                onClick={() => setActiveTab('vendas')}
              >
                Vendas para Validar
              </button>
            )}
            {dashboardData?.status_sistema === 'pos_workshop' && (
              <button
                className={`${styles.tabButton} ${activeTab === 'validar-vendas' ? styles.active : ''}`}
                onClick={() => setActiveTab('validar-vendas')}
              >
                Validar Vendas
              </button>
            )}
            <button
              className={`${styles.tabButton} ${activeTab === 'equipes' ? styles.active : ''}`}
              onClick={() => setActiveTab('equipes')}
            >
              Equipes
            </button>
          </div>

          <div className={styles.tabContent}>
            {/* Aba Propostas */}
            {!isPosWorkshop && activeTab === 'propostas' && (
              <div className="space-y-6">
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
                        <div className="space-y-6">
                          {propostas.map((proposta) => (
                            <div key={proposta.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all relative">
                              <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#FF5E3A]"></div>

                              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                <div>
                                  <h3 className="font-bold text-[#1A3A41] text-2xl uppercase tracking-tighter" style={{ fontFamily: "'Jaro', sans-serif" }}>
                                    {proposta.equipe_nome} – PROPOSTA {proposta.numero_proposta_equipe || proposta.id}
                                  </h3>
                                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Registrado em {new Date(proposta.data_envio).toLocaleDateString('pt-BR')} às {new Date(proposta.data_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <Badge className="bg-orange-50 text-orange-600 border border-orange-100 font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.15em]">
                                  AGUARDANDO VALIDAÇÃO
                                </Badge>
                              </div>

                              <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cliente / Empresa</label>
                                    <span className="text-[#1A3A41] font-bold text-lg leading-tight">{proposta.cliente_nome}</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Valor Estimado</label>
                                    <span className="text-[#10B981] font-black text-2xl">
                                      <span className="text-sm font-bold mr-1">R$</span>
                                      {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mix de Produtos</label>
                                    <span className="text-[#3B82F6] font-black text-2xl">
                                      {proposta.quantidade_produtos} <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Linhas</span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-2 text-right lg:text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consultor</label>
                                    <span className="text-slate-600 font-bold text-lg">{proposta.vendedor_nome}</span>
                                  </div>
                                </div>

                                {proposta.descricao && (
                                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Resumo e Detalhamento</label>
                                    <p className="text-slate-500 font-medium italic text-sm leading-relaxed">{proposta.descricao}</p>
                                  </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t border-slate-100">
                                  <Button
                                    variant="outline"
                                    onClick={() => downloadPDF(proposta.arquivo_pdf)}
                                    className="h-14 px-8 border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl transition-all"
                                  >
                                    <Download className="h-5 w-5 mr-3" />
                                    PDF Comercial
                                  </Button>
                                  <Button
                                    onClick={() => verDetalhesProposta(proposta.id)}
                                    className="h-14 px-10 bg-[#FF5E3A] hover:bg-[#E54D2A] text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-3 transform hover:-translate-y-1"
                                  >
                                    <Eye className="h-5 w-5" />
                                    <span>Analisar e Validar</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Aba Vendas para Validar - Apenas no Pré-Workshop */}
            {dashboardData?.status_sistema === 'pre_workshop' && activeTab === 'vendas' && (
              <div className="space-y-6">
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
                      <div className="space-y-6">
                        {vendasPendentes.map((venda) => (
                          <div key={venda.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all relative">
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#10B981]"></div>

                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                              <div>
                                <h3 className="font-bold text-[#1A3A41] text-2xl uppercase tracking-tighter" style={{ fontFamily: "'Jaro', sans-serif" }}>
                                  VENDA #{venda.id} — {venda.cliente_nome}
                                </h3>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Registrada em {new Date(venda.data_venda).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.15em]">
                                {venda.status_validacao_display}
                              </Badge>
                            </div>

                            <div className="p-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8">
                                <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Equipe Responsável</label>
                                  <span className="text-orange-500 font-bold text-lg leading-tight">{venda.equipe_nome}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Faturamento Realizado</label>
                                  <span className="text-[#10B981] font-black text-2xl">
                                    <span className="text-sm font-bold mr-1">R$</span>
                                    {venda.valor_total_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Volume de Itens</label>
                                  <span className="text-[#3B82F6] font-black text-2xl">
                                    {venda.quantidade_produtos_vendidos} <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Itens</span>
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2 text-right lg:text-left">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consultor</label>
                                  <span className="text-slate-600 font-bold text-lg">{venda.vendedor_nome}</span>
                                </div>
                              </div>

                              {venda.observacoes && (
                                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Observações do Vendedor</label>
                                  <p className="text-slate-500 font-medium italic text-sm leading-relaxed">{venda.observacoes}</p>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-10 pt-8 border-t border-slate-100">
                                <Button
                                  onClick={() => validarVenda(venda.id, 'rejeitar')}
                                  disabled={validando}
                                  variant="outline"
                                  className="h-14 px-8 border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl transition-all flex items-center gap-3"
                                >
                                  {validando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />}
                                  <span>Rejeitar Venda</span>
                                </Button>
                                <Button
                                  onClick={() => validarVenda(venda.id, 'validar')}
                                  disabled={validando}
                                  className="h-14 px-10 bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-3 transform hover:-translate-y-1"
                                >
                                  {validando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                                  <span>Validar Venda</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Aba Equipes */}
            {activeTab === 'equipes' && (
              <div className="space-y-6">
                <Card className={styles.contentCard}>
                  <CardHeader className={styles.contentCardHeader}>
                    <Users className={styles.contentCardTitleIcon} />
                    <CardTitle className={styles.contentCardTitle}>
                      Equipes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={styles.contentCardBody}>
                    <div className={styles.equipesGrid}>
                      {equipes.map((equipe) => (
                        <div key={equipe.id} className={styles.equipeCard}>
                          <div className={styles.equipeHeader}>
                            <h3 className={styles.equipeName}>{equipe.nome}</h3>
                            <Badge className={`${equipe.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} font-bold px-3 py-1 rounded-full text-[10px]`}>
                              {equipe.ativo ? 'ATIVA' : 'INATIVA'}
                            </Badge>
                          </div>

                          <div className={styles.equipeDataList}>
                            <div className={`${styles.equipeDataRow} ${styles.rowGray}`}>
                              <label>
                                <Hash className="h-4 w-4" />
                                <span>CÓDIGO DE IDENTIFICAÇÃO</span>
                              </label>
                              <span className={styles.equipeValue}>{equipe.codigo}</span>
                            </div>

                            <div className={`${styles.equipeDataRow} ${styles.rowBlue}`}>
                              <label>
                                <User className="h-4 w-4" />
                                <span>LÍDER RESPONSÁVEL</span>
                              </label>
                              <span className={styles.equipeValue}>{equipe.responsavel}</span>
                            </div>

                            <div className={`${styles.equipeDataRow} ${equipe.ativo ? styles.rowStatusAtiva : styles.rowStatusPausada}`}>
                              <label>
                                <Info className="h-4 w-4" />
                                <span>STATUS OPERACIONAL</span>
                              </label>
                              <span className={styles.equipeValue}>
                                {equipe.ativo ? 'EM ATIVIDADE' : 'PAUSADA'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Aba Validar Vendas (Pós-Workshop) */}
            {dashboardData?.status_sistema === 'pos_workshop' && activeTab === 'validar-vendas' && (
              <div className="space-y-6">
                <ValidarVendas />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Validação de Proposta */}
      {propostaSelecionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalBody}>
              <h2 className={styles.modalTitle}>Validar Proposta {propostaSelecionada.equipe_nome} – Proposta {propostaSelecionada.numero_proposta_equipe || propostaSelecionada.id}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Equipe Representante</Label>
                  <p className="font-bold text-orange-600 text-lg">{propostaSelecionada.equipe_nome}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Cliente / Empresa</Label>
                  <p className="font-bold text-blue-600 text-lg">{propostaSelecionada.cliente_nome}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Consultor Responsável</Label>
                  <p className="font-bold text-gray-700">{propostaSelecionada.vendedor_nome}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Valor da Proposta</Label>
                  <p className="font-bold text-green-600 text-xl">R$ {propostaSelecionada.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Mix de Produtos</Label>
                  <p className="font-bold text-purple-600">{propostaSelecionada.quantidade_produtos} itens selecionados</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="uppercase text-[10px] font-bold tracking-widest text-gray-400">Data de Registro</Label>
                  <p className="font-bold text-gray-600">{new Date(propostaSelecionada.data_envio).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* VISUALIZAÇÃO DOS BÔNUS SELECIONADOS PELA EQUIPE */}
              {(propostaSelecionada.bonus_vinhos_casa_perini_mundo ||
                propostaSelecionada.bonus_vinhos_fracao_unica ||
                propostaSelecionada.bonus_espumantes_vintage ||
                propostaSelecionada.bonus_espumantes_premium ||
                propostaSelecionada.bonus_aceleracao) && (
                  <div className="p-4 bg-orange-50/10 border border-orange-500/20 rounded-lg">
                    <h4 className="text-orange-500 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                      <i className="bi bi-stars"></i> Bônus Selecionados pela Equipe
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {propostaSelecionada.bonus_vinhos_casa_perini_mundo && (
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Casa Perini Mundo (+5)</Badge>
                      )}
                      {propostaSelecionada.bonus_vinhos_fracao_unica && (
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Fração Única (+5)</Badge>
                      )}
                      {propostaSelecionada.bonus_espumantes_vintage && (
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Esp. Vintage (+5)</Badge>
                      )}
                      {propostaSelecionada.bonus_espumantes_premium && (
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Esp. Premium (+5)</Badge>
                      )}
                      {propostaSelecionada.bonus_aceleracao && (
                        <Badge className="bg-red-500 text-white font-bold border-red-600 shadow-sm animate-pulse">ACELERAÇÃO (+25)</Badge>
                      )}
                    </div>
                  </div>
                )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Label className="uppercase text-[10px] font-bold tracking-widest text-slate-400 mb-2 block">Detalhamento da Proposta</Label>
                <p className="text-gray-600 leading-relaxed italic">{propostaSelecionada.descricao || 'Nenhuma descrição detalhada fornecida pela equipe.'}</p>
              </div>

              {propostaSelecionada.arquivo_pdf && (
                <div className="flex items-center justify-between p-4 bg-teal-50/30 rounded-xl border border-teal-100/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-500 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-teal-800 text-sm">Documento Digital Anexo</p>
                      <p className="text-teal-600 text-[10px] uppercase font-bold tracking-wider">Proposta Comercial.pdf</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-500 hover:text-white transition-all font-bold"
                    onClick={() => downloadPDF(propostaSelecionada.arquivo_pdf)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <Label htmlFor="motivo" className="uppercase text-[10px] font-bold tracking-widest text-orange-600">Considerações de Validação / Motivo da Rejeição</Label>
                </div>
                <Textarea
                  id="motivo"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Utilize este campo para observações internas ou para justificar uma eventual rejeição..."
                  className="w-100 min-h-[100px] border-2 border-slate-200 focus:border-orange-500 rounded-xl p-4 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => {
                  setPropostaSelecionada(null);
                  setMotivoRejeicao('');
                }}
                className="px-8 font-bold text-gray-400 uppercase tracking-widest text-xs h-12"
              >
                Voltar
              </Button>
              <Button
                onClick={() => validarProposta('rejeitar')}
                disabled={validando || !motivoRejeicao.trim()}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 h-12 uppercase tracking-widest text-xs shadow-lg shadow-red-200"
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
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 h-12 uppercase tracking-widest text-xs shadow-lg shadow-green-200"
              >
                {validando ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Validar Proposta
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.waveDivider}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#FF5E3A" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );
};

export default DashboardGestor;


