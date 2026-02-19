import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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
    arquivo_pdf: null,
    bonus_vinhos_casa_perini_mundo: false,
    bonus_vinhos_fracao_unica: false,
    bonus_espumantes_vintage: false,
    bonus_espumantes_premium: false,
    bonus_aceleracao: false
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

  const [showCorrigirVenda, setShowCorrigirVenda] = useState(false);
  const [vendaParaCorrigir, setVendaParaCorrigir] = useState(null);
  const [formCorrecao, setFormCorrecao] = useState({
    valor_venda: '',
    cliente_venda: '',
    quantidade_produtos_venda: '',
    observacoes_venda: ''
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

      const dashboardResponse = await fetch(`${API_BASE}/equipe/dashboard/`, { headers });
      if (dashboardResponse.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!dashboardResponse.ok) {
        const errorData = await dashboardResponse.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Erro ao buscar dashboard');
      }
      const dashboard = await dashboardResponse.json();

      const propostasResponse = await fetch(`${API_BASE}/equipe/propostas/`, { headers });
      if (propostasResponse.status === 401) {
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
      if (!propostasResponse.ok) throw new Error('Erro ao buscar propostas');
      const propostasData = await propostasResponse.json();

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

      const formDataToSend = new FormData();
      formDataToSend.append('cliente', novaProposta.cliente);
      formDataToSend.append('vendedor', novaProposta.vendedor);
      formDataToSend.append('valor_proposta', novaProposta.valor_proposta);
      formDataToSend.append('descricao', novaProposta.descricao);
      formDataToSend.append('quantidade_produtos', novaProposta.quantidade_produtos);

      formDataToSend.append('bonus_vinhos_casa_perini_mundo', novaProposta.bonus_vinhos_casa_perini_mundo);
      formDataToSend.append('bonus_vinhos_fracao_unica', novaProposta.bonus_vinhos_fracao_unica);
      formDataToSend.append('bonus_espumantes_vintage', novaProposta.bonus_espumantes_vintage);
      formDataToSend.append('bonus_espumantes_premium', novaProposta.bonus_espumantes_premium);
      formDataToSend.append('bonus_aceleracao', novaProposta.bonus_aceleracao);

      if (novaProposta.arquivo_pdf) {
        formDataToSend.append('arquivo_pdf', novaProposta.arquivo_pdf);
      }

      const response = await fetch(`${API_BASE}/equipe/propostas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cadastrar proposta');
      }

      setNovaProposta({
        cliente: '',
        vendedor: '',
        valor_proposta: '',
        descricao: '',
        quantidade_produtos: 0,
        arquivo_pdf: null,
        bonus_vinhos_casa_perini_mundo: false,
        bonus_vinhos_fracao_unica: false,
        bonus_espumantes_vintage: false,
        bonus_espumantes_premium: false,
        bonus_aceleracao: false
      });
      fetchData();
      alert('Proposta cadastrada com sucesso!');
    } catch (err) {
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
      const response = await fetch(`${API_BASE}/propostas/${selectedProposta.id}/registrar_venda_pre_workshop/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDataVenda)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar venda');
      }

      setShowVendaForm(false);
      setSelectedProposta(null);
      fetchData();
      alert('Venda registrada com sucesso! Aguardando validação do gestor.');
    } catch (err) {
      alert('Erro ao registrar venda: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleCorrigirVenda = (venda) => {
    setVendaParaCorrigir(venda);
    setFormCorrecao({
      valor_venda: venda.valor_venda,
      cliente_venda: venda.cliente_venda || venda.cliente_nome,
      quantidade_produtos_venda: venda.quantidade_produtos_venda,
      observacoes_venda: venda.observacoes_venda || ''
    });
    setShowCorrigirVenda(true);
  };

  const submitCorrecaoVenda = async () => {
    if (!vendaParaCorrigir) return;
    try {
      setSalvando(true);
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/equipe/vendas-concretizadas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposta_id: vendaParaCorrigir.id,
          valor_venda: formCorrecao.valor_venda,
          cliente_venda: formCorrecao.cliente_venda,
          quantidade_produtos_venda: formCorrecao.quantidade_produtos_venda,
          observacoes: formCorrecao.observacoes_venda
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao corrigir venda');
      }

      setShowCorrigirVenda(false);
      setVendaParaCorrigir(null);
      fetchData();
      alert('Venda corrigida e reenviada para validação!');
    } catch (err) {
      alert('Erro: ' + err.message);
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
      'enviada': <i className="bi bi-clock-fill" />,
      'validada': <i className="bi bi-check-circle-fill" />,
      'rejeitada': <i className="bi bi-x-circle-fill" />,
      'vendida': <i className="bi bi-graph-up-arrow" />,
      'nao_vendida': <i className="bi bi-exclamation-circle-fill" />
    };
    return icons[status] || <i className="bi bi-clock-fill" />;
  };

  const logout = () => {
    sessionStorage.clear();
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
        <h2 className="bi bi-exclamation-triangle-fill"> Erro ao carregar dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchData} className={styles.logoutButton}>Tentar Novamente</button>
      </div>
    );
  }

  const equipe = JSON.parse(sessionStorage.getItem('equipe') || '{}');

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerContainer}>
            <img src="/IMG/vendamais_logo.png" alt="Venda Mais Logo" className={styles.headerLogo} />
          </div>
          <div className={styles.headerControls}>
            <div className={styles.userInfo}>
              <span className={`${styles.badge} ${styles.badgeEquipe}`}>
                <i className="bi bi-people-fill" style={{ marginRight: '0.4rem' }}></i>
                {equipe.nome || 'Equipe'}
              </span>
              <span className={`${styles.badge} ${styles.badgeStatus}`}>
                <i className="bi bi-activity" style={{ marginRight: '0.4rem' }}></i>
                {dashboardData?.status_sistema?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className={styles.actionButtons}>
              <button onClick={fetchData} className={styles.refreshButton}>
                <i className="bi bi-arrow-clockwise"></i>
                <span className={styles.buttonText}>Atualizar</span>
              </button>
              <button onClick={logout} className={styles.logoutButton}>
                <i className="bi bi-box-arrow-right"></i>
                <span className={styles.buttonText}>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {!dashboardData?.pode_enviar_propostas && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <i className="bi bi-info-circle-fill"></i>
              <span>O envio de propostas não permitido: {dashboardData?.status_sistema}</span>
            </div>
          )}

          <Tabs
            defaultValue={(dashboardData?.status_sistema === 'pre_workshop') ? "vendas" : (dashboardData?.status_sistema === 'pos_workshop') ? "propostas-vendidas" : "dashboard"}
            className={styles.tabsContainer}
          >
            <TabsList className={styles.tabsList}>
              <TabsTrigger value="dashboard" className={styles.tabItem}>
                DASHBOARD
              </TabsTrigger>
              {dashboardData?.status_sistema !== 'pos_workshop' && (
                <TabsTrigger value="propostas" className={styles.tabItem}>
                  MINHAS PROPOSTAS
                </TabsTrigger>
              )}
              {(dashboardData?.status_sistema === 'pre_workshop') ? (
                <TabsTrigger value="vendas" className={styles.tabItem}>
                  REGISTRAR VENDA
                </TabsTrigger>
              ) : (dashboardData?.status_sistema === 'pos_workshop') ? (
                <TabsTrigger value="propostas-vendidas" className={styles.tabItem}>
                  MINHAS VENDAS
                </TabsTrigger>
              ) : (
                <TabsTrigger value="nova" className={styles.tabItem}>
                  NOVA PROPOSTA
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className={styles.statsGrid}>
                {dashboardData?.status_sistema === 'pos_workshop' ? (
                  <>
                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-file-earmark-text"></i></div>
                      <h3 className={styles.metricTitle}>Total de Propostas</h3>
                      <p className={styles.metricValue}>{dashboardData?.total_propostas || 0}</p>
                      <div className={styles.metricBadge}>Todas as propostas enviadas</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-check-circle-fill"></i></div>
                      <h3 className={styles.metricTitle}>Minhas Vendas</h3>
                      <p className={styles.metricValue}>{dashboardData?.vendas_validadas || 0}</p>
                      <div className={styles.metricBadge}>Vendas confirmadas pelo gestor</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-x-circle-fill"></i></div>
                      <h3 className={styles.metricTitle}>Vendas Rejeitadas</h3>
                      <p className={styles.metricValue}>{dashboardData?.vendas_rejeitadas || 0}</p>
                      <div className={styles.metricBadge}>Vendas que precisam de correção</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-file-earmark"></i></div>
                      <h3 className={styles.metricTitle}>Minhas Propostas</h3>
                      <p className={styles.metricValue}>{dashboardData?.total_propostas || 0}</p>
                      <div className={styles.metricBadge}>Total enviado pela sua equipe</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-shield-check"></i></div>
                      <h3 className={styles.metricTitle}>Propostas Validadas</h3>
                      <p className={styles.metricValue}>{dashboardData?.propostas_validadas || 0}</p>
                      <div className={styles.metricBadge}>Aguardando fechamento</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-x-octagon-fill"></i></div>
                      <h3 className={styles.metricTitle}>Propostas Rejeitadas</h3>
                      <p className={styles.metricValue}>{dashboardData?.propostas_rejeitadas || 0}</p>
                      <div className={styles.metricBadge} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Necessitam de revisão</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricFloatingIcon}><i className="bi bi-star-fill"></i></div>
                      <h3 className={styles.metricTitle}>Pontos Acumulados</h3>
                      <p className={styles.metricValue}>{dashboardData?.pontos_totais || 0}</p>
                      <div className={styles.metricBadge}>Sua pontuação total</div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="propostas" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle><i className="bi bi-list-task mr-2"></i> {dashboardData?.status_sistema === 'pos_workshop' ? 'Propostas Rejeitadas' : 'Listagem de Propostas'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dashboardData?.status_sistema === 'pos_workshop' ? (minhasVendasPos?.vendas_rejeitadas || []) : propostas).length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                        <i className="bi bi-clipboard-x" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-4">Nenhum registro encontrado</p>
                      </div>
                    ) : (
                      (dashboardData?.status_sistema === 'pos_workshop' ? minhasVendasPos.vendas_rejeitadas : propostas).map((p) => (
                        <div key={p.id} className={styles.listItem}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="font-bold text-white text-lg m-0">{p.equipe_nome || equipe.nome} – Proposta {p.numero_proposta_equipe || p.id} – {p.cliente_nome}</h4>
                              <Badge className={`${getStatusColor(p.status)} font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider`}>
                                {getStatusIcon(p.status)} <span className="ml-1">{p.status_display}</span>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                              <span className="flex items-center gap-2 text-white/80"><i className="bi bi-person text-orange-400"></i> <b className="text-white/40 uppercase text-[10px] tracking-widest mr-1">Consultor:</b> {p.vendedor_nome}</span>
                              <span className="flex items-center gap-2 text-white/80"><i className="bi bi-cash text-green-400"></i> <b className="text-white/40 uppercase text-[10px] tracking-widest mr-1">Valor:</b> R$ {p.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className="flex items-center gap-2 text-white/80"><i className="bi bi-box-seam text-blue-400"></i> <b className="text-white/40 uppercase text-[10px] tracking-widest mr-1">Mix:</b> {p.quantidade_produtos} produtos</span>
                              {p.arquivo_pdf && (
                                <span className="flex items-center gap-2 text-teal-400 cursor-pointer hover:underline" onClick={() => downloadPDF(p.arquivo_pdf)}>
                                  <i className="bi bi-file-earmark-pdf"></i> <b className="text-white/40 uppercase text-[10px] tracking-widest mr-1">Documento:</b> Visualizar PDF
                                </span>
                              )}
                            </div>
                            {p.status === 'rejeitada' && p.motivo_rejeicao && (
                              <div className="mt-4 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-sm">
                                <div className="flex items-center gap-2 text-red-400 font-bold uppercase text-[10px] tracking-widest mb-1">
                                  <i className="bi bi-exclamation-triangle"></i> Feedback do Gestor
                                </div>
                                <p className="text-red-100 m-0 italic">{p.motivo_rejeicao}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-3 min-w-[140px]">
                            {p.status === 'rejeitada' && (
                              <Button size="sm" className={styles.corrigirButton} onClick={() => window.location.href = '/corrigir-propostas'}>
                                <i className="bi bi-pencil-square mr-2"></i> CORRIGIR
                              </Button>
                            )}
                            {p.status === 'nao_vendida' && (
                              <Button size="sm" className={styles.corrigirButton} onClick={() => handleCorrigirVenda(p)}>
                                <i className="bi bi-arrow-repeat mr-2"></i> CORRIGIR VENDA
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nova" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle><i className="bi bi-plus-circle mr-2"></i> Nova Proposta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={styles.formGroup}>
                      <Label className={styles.formLabel}>Cliente / Empresa *</Label>
                      <Input className={styles.formInput} value={novaProposta.cliente} onChange={(e) => setNovaProposta({ ...novaProposta, cliente: e.target.value })} placeholder="Nome completo do cliente" />
                    </div>
                    <div className={styles.formGroup}>
                      <Label className={styles.formLabel}>Vendedor Responśavel *</Label>
                      <Input className={styles.formInput} value={novaProposta.vendedor} onChange={(e) => setNovaProposta({ ...novaProposta, vendedor: e.target.value })} placeholder="Seu nome" />
                    </div>
                    <div className={styles.formGroup}>
                      <Label className={styles.formLabel}>Valor da Proposta *</Label>
                      <Input type="number" className={styles.formInput} value={novaProposta.valor_proposta} onChange={(e) => setNovaProposta({ ...novaProposta, valor_proposta: e.target.value })} placeholder="0.00" />
                    </div>
                    <div className={styles.formGroup}>
                      <Label className={styles.formLabel}>Mix de Produtos *</Label>
                      <Input type="number" className={styles.formInput} value={novaProposta.quantidade_produtos} onChange={(e) => setNovaProposta({ ...novaProposta, quantidade_produtos: e.target.value })} placeholder="Ex: 10" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <Label className={styles.formLabel}>Detalhamento da Proposta</Label>
                    <Textarea className={styles.formTextarea} value={novaProposta.descricao} onChange={(e) => setNovaProposta({ ...novaProposta, descricao: e.target.value })} rows={4} placeholder="Descreva os produtos e condições..." />
                  </div>
                  <div className={styles.formGroup}>
                    <Label className={styles.formLabel}>PDF da Proposta Comercial *</Label>
                    <Input type="file" className={`${styles.formInput} py-2`} accept=".pdf" onChange={(e) => setNovaProposta({ ...novaProposta, arquivo_pdf: e.target.files[0] })} />
                  </div>

                  {/* SEÇÃO DE PONTOS BÔNUS */}
                  <div className="mt-8 border-t border-white/10 pt-8 pb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-orange-500/20 p-2 rounded-lg">
                        <i className="bi bi-stars text-orange-500 text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg uppercase tracking-wider m-0">Pontos Bônus (Workshop)</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">Selecione os bônus aplicáveis para turbinar sua pontuação</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* PONTOS EXTRAS */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-1 w-4 bg-orange-500 rounded-full"></div>
                          <p className="text-orange-500 font-extrabold text-[11px] uppercase tracking-[0.2em] m-0">Mix por Linha (+5 pts cada)</p>
                        </div>

                        <div
                          className={`${styles.bonusCard} ${novaProposta.bonus_vinhos_casa_perini_mundo ? styles.bonusCardActive : ''}`}
                          onClick={() => setNovaProposta({ ...novaProposta, bonus_vinhos_casa_perini_mundo: !novaProposta.bonus_vinhos_casa_perini_mundo })}
                        >
                          <div className={styles.bonusCheckbox}>
                            {novaProposta.bonus_vinhos_casa_perini_mundo && <i className="bi bi-check-lg"></i>}
                          </div>
                          <div className={styles.bonusInfo}>
                            <span className={styles.bonusLabel}>Linha Vinhos Casa Perini Mundo</span>
                            <span className={styles.bonusSublabel}>Mix mínimo de 5 Caixas</span>
                          </div>
                          <span className="ml-auto text-orange-500 font-bold text-xs">+5 PTS</span>
                        </div>

                        <div
                          className={`${styles.bonusCard} ${novaProposta.bonus_vinhos_fracao_unica ? styles.bonusCardActive : ''}`}
                          onClick={() => setNovaProposta({ ...novaProposta, bonus_vinhos_fracao_unica: !novaProposta.bonus_vinhos_fracao_unica })}
                        >
                          <div className={styles.bonusCheckbox}>
                            {novaProposta.bonus_vinhos_fracao_unica && <i className="bi bi-check-lg"></i>}
                          </div>
                          <div className={styles.bonusInfo}>
                            <span className={styles.bonusLabel}>Linha Vinhos Fração Única</span>
                            <span className={styles.bonusSublabel}>Mix mínimo de 5 Caixas</span>
                          </div>
                          <span className="ml-auto text-orange-500 font-bold text-xs">+5 PTS</span>
                        </div>

                        <div
                          className={`${styles.bonusCard} ${novaProposta.bonus_espumantes_vintage ? styles.bonusCardActive : ''}`}
                          onClick={() => setNovaProposta({ ...novaProposta, bonus_espumantes_vintage: !novaProposta.bonus_espumantes_vintage })}
                        >
                          <div className={styles.bonusCheckbox}>
                            {novaProposta.bonus_espumantes_vintage && <i className="bi bi-check-lg"></i>}
                          </div>
                          <div className={styles.bonusInfo}>
                            <span className={styles.bonusLabel}>Linha Espumantes Vintage</span>
                            <span className={styles.bonusSublabel}>Mix mínimo de 5 Caixas</span>
                          </div>
                          <span className="ml-auto text-orange-500 font-bold text-xs">+5 PTS</span>
                        </div>

                        <div
                          className={`${styles.bonusCard} ${novaProposta.bonus_espumantes_premium ? styles.bonusCardActive : ''}`}
                          onClick={() => setNovaProposta({ ...novaProposta, bonus_espumantes_premium: !novaProposta.bonus_espumantes_premium })}
                        >
                          <div className={styles.bonusCheckbox}>
                            {novaProposta.bonus_espumantes_premium && <i className="bi bi-check-lg"></i>}
                          </div>
                          <div className={styles.bonusInfo}>
                            <span className={styles.bonusLabel}>Linha Espumantes Premium</span>
                            <span className={styles.bonusSublabel}>Mix mínimo de 2 Caixas</span>
                          </div>
                          <span className="ml-auto text-orange-500 font-bold text-xs">+5 PTS</span>
                        </div>
                      </div>

                      {/* BÔNUS DE ACELERAÇÃO */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-1 w-4 bg-red-500 rounded-full"></div>
                          <p className="text-red-500 font-extrabold text-[11px] uppercase tracking-[0.2em] m-0">Impulsionador (+25 pts)</p>
                        </div>

                        <div
                          className={`${styles.bonusCard} ${styles.bonusCardAcceleration} ${novaProposta.bonus_aceleracao ? styles.bonusCardAccelerationActive : ''}`}
                          onClick={() => setNovaProposta({ ...novaProposta, bonus_aceleracao: !novaProposta.bonus_aceleracao })}
                        >
                          <div className={styles.bonusCheckbox}>
                            {novaProposta.bonus_aceleracao && <i className="bi bi-check-lg"></i>}
                          </div>
                          <div className={styles.bonusInfo}>
                            <span className={styles.bonusLabel}>BÔNUS DE ACELERAÇÃO MÁXIMA</span>
                            <span className={styles.bonusSublabel}>Venda concretizada durante o evento</span>
                          </div>
                          <span className="ml-auto text-red-500 font-bold text-xs">+25 PTS</span>
                        </div>

                        <div className="p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10 mt-6 group hover:bg-orange-500/10 transition-all">
                          <div className="flex items-start gap-4">
                            <i className="bi bi-info-circle-fill text-orange-500 text-lg mt-1"></i>
                            <p className="text-xs text-white/50 leading-relaxed m-0">
                              Os bônus selecionados estarão sujeitos à <b className="text-white/80">validação técnica do gestor</b>. Certifique-se de que os critérios mínimos de caixas por linha foram atingidos conforme o regulamento do workshop.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button className={`${styles.primaryButton} h-14 !rounded-2xl shadow-2xl mb-4`} onClick={cadastrarProposta} disabled={salvando}>
                    {salvando ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>ENVIANDO...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <i className="bi bi-send-fill text-lg"></i>
                        <span>CADASTRAR E ENVIAR PROPOSTA</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendas" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle><i className="bi bi-cart-check mr-2"></i> Registrar Venda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {propostas.filter(p => p.status === 'validada').length === 0 ? (
                      <p className="text-center py-6 opacity-60">Nenhuma proposta aprovada para vender no momento.</p>
                    ) : (
                      propostas.filter(p => p.status === 'validada').map(p => (
                        <div key={p.id} className={styles.listItem}>
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg mb-2">{p.equipe_nome} – Proposta {p.numero_proposta_equipe || p.id} – {p.cliente_nome}</h4>
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-white/50">
                              <span className="flex items-center gap-1"><i className="bi bi-cash text-green-400"></i> R$ {p.valor_proposta?.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><i className="bi bi-box-seam text-blue-400"></i> {p.quantidade_produtos} produtos</span>
                            </div>
                          </div>
                          <Button className={`${styles.corrigirButton} !bg-green-500 hover:!bg-green-600 shadow-green-500/20`} onClick={() => handleRegistrarVenda(p)}>
                            <i className="bi bi-cart-check-fill mr-2"></i> REGISTRAR VENDA
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="propostas-vendidas" className="space-y-6">
              <VendasPosWorkshop />
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Modais */}
      {showVendaForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}><i className="bi bi-cart-check"></i> Finalizar Venda</h2>
            <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">{selectedProposta?.cliente_nome}</p>

            <div className="space-y-4">
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Produtos Vendidos</Label>
                <Input
                  type="number"
                  className={styles.formInput}
                  value={formDataVenda.quantidade_produtos_vendidos}
                  onChange={(e) => setFormDataVenda({ ...formDataVenda, quantidade_produtos_vendidos: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Valor Final</Label>
                <Input
                  type="number"
                  className={styles.formInput}
                  value={formDataVenda.valor_total_venda}
                  onChange={(e) => setFormDataVenda({ ...formDataVenda, valor_total_venda: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Observações</Label>
                <Textarea
                  className={styles.formTextarea}
                  value={formDataVenda.observacoes}
                  onChange={(e) => setFormDataVenda({ ...formDataVenda, observacoes: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-6">
                <Button className={`${styles.primaryButton} flex-1`} onClick={confirmarVenda} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Confirmar Venda'}
                </Button>
                <Button variant="outline" className="flex-1 border-2 py-6 rounded-xl font-bold" onClick={() => setShowVendaForm(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCorrigirVenda && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}><i className="bi bi-pencil-square"></i> Corrigir Venda</h2>
            <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">{vendaParaCorrigir?.cliente_nome}</p>

            <div className="space-y-4">
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Cliente</Label>
                <Input
                  className={styles.formInput}
                  value={formCorrecao.cliente_venda}
                  onChange={(e) => setFormCorrecao({ ...formCorrecao, cliente_venda: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Valor da Venda</Label>
                <Input
                  type="number"
                  className={styles.formInput}
                  value={formCorrecao.valor_venda}
                  onChange={(e) => setFormCorrecao({ ...formCorrecao, valor_venda: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Quantidade de Produtos</Label>
                <Input
                  type="number"
                  className={styles.formInput}
                  value={formCorrecao.quantidade_produtos_venda}
                  onChange={(e) => setFormCorrecao({ ...formCorrecao, quantidade_produtos_venda: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <Label className={styles.formLabel}>Observações</Label>
                <Textarea
                  className={styles.formTextarea}
                  value={formCorrecao.observacoes_venda}
                  onChange={(e) => setFormCorrecao({ ...formCorrecao, observacoes_venda: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-6">
                <Button className={`${styles.primaryButton} flex-1`} onClick={submitCorrecaoVenda} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Reenviar para Validação'}
                </Button>
                <Button variant="outline" className="flex-1 border-2 py-6 rounded-xl font-bold" onClick={() => setShowCorrigirVenda(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onda no rodapé */}
      <div className={styles.waveDivider}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="var(--color-orange)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
    </div>
  );
};

export default DashboardEquipe;
