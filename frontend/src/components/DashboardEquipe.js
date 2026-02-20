import { API_URL, API_BASE_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import styles from './DashboardEquipe.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
    FileText,
    Download,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import VendasPosWorkshop from './VendasPosWorkshop';
import logoImg from '../assets/img/vendamais_logo.png';

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

    const API_BASE = API_URL;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = storage.getToken();
            const user = storage.getUser();

            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            // Só chamar API de equipe se o usuário for realmente da equipe
            const nivel = (user?.nivel || '').toLowerCase();
            if (nivel !== 'equipe') {
                window.location.href = '/dashboard';
                return;
            }

            const headers = {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            };

            const dashboardResponse = await fetch(`${API_BASE}/api/equipe/dashboard/`, { headers });
            if (dashboardResponse.status === 401) {
                storage.clear();
                window.location.href = '/login';
                return;
            }
            if (dashboardResponse.status === 403) {
                // Usuário não é equipe (admin, gestor, banca) - redirecionar para o dashboard correto
                window.location.href = '/dashboard';
                return;
            }
            if (!dashboardResponse.ok) {
                const errorData = await dashboardResponse.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Erro ao buscar dashboard');
            }
            const dashboard = await dashboardResponse.json();

            const propostasResponse = await fetch(`${API_BASE}/api/equipe/propostas/`, { headers });
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
            if (dashboard?.status_sistema?.atual === 'pos_workshop') {
                const minhasVendasResponse = await fetch(`${API_BASE}/api/equipe/minhas-vendas-concretizadas/`, { headers });
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
        const podeEnviar = dashboardData?.permissoes?.pode_enviar_propostas;
        const statusAtual = dashboardData?.status_sistema?.atual;
        if (!podeEnviar || (statusAtual !== 'workshop')) {
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

            const response = await fetch(`${API_BASE}/api/equipe/propostas/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}` },
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
            const response = await fetch(`${API_BASE}/api/propostas/${selectedProposta.id}/registrar_venda_pre_workshop/`, {
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
            const response = await fetch(`${API_BASE}/api/equipe/vendas-concretizadas/`, {
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

    const logout = () => {
        sessionStorage.clear();
        window.location.reload();
    };

    // ✅ CORRETO: usa API_BASE_URL dinâmico ao invés de localhost:8000 hardcoded
    const downloadPDF = (url) => {
        if (!url) return;
        const pdfUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
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
                        <img src={logoImg} alt="Venda Mais Logo" className={styles.headerLogo} />
                    </div>
                    <div className={styles.headerControls}>
                        <div className={styles.userInfo}>
                            <span className={`${styles.badge} ${styles.badgeEquipe}`}>
                                <i className="bi bi-people-fill" style={{ marginRight: '0.4rem' }}></i>
                                {equipe.nome || 'Equipe'}
                            </span>
                            <span className={`${styles.badge} ${styles.badgeStatus}`}>
                                <i className="bi bi-activity" style={{ marginRight: '0.4rem' }}></i>
                                {dashboardData?.status_sistema?.display || dashboardData?.status_sistema?.atual?.replace('_', ' ').toUpperCase() || 'PRÉ-WORKSHOP'}
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

                    {(dashboardData?.status_sistema?.atual === 'pre_workshop' || dashboardData?.status_sistema?.atual === 'encerrado') && (
                        <div className={`${styles.alert} ${styles.alertWarning}`}>
                            <i className="bi bi-info-circle-fill"></i>
                            <span>O envio de propostas não permitido no status atual ({dashboardData?.status_sistema?.display || dashboardData?.status_sistema?.atual})</span>
                        </div>
                    )}

                    <Tabs
                        defaultValue={
                            (dashboardData?.status_sistema?.atual === 'pre_workshop') ? "vendas" :
                                (dashboardData?.status_sistema?.atual === 'pos_workshop') ? "propostas-vendidas" :
                                    "dashboard"
                        }
                        className={styles.tabsContainer}
                    >
                        <TabsList className={styles.tabsList}>
                            <TabsTrigger value="dashboard" className={styles.tabItem}>DASHBOARD</TabsTrigger>
                            {dashboardData?.status_sistema?.atual !== 'pos_workshop' && (
                                <TabsTrigger value="propostas" className={styles.tabItem}>MINHAS PROPOSTAS</TabsTrigger>
                            )}
                            {(dashboardData?.status_sistema?.atual === 'pre_workshop') ? (
                                <TabsTrigger value="vendas" className={styles.tabItem}>REGISTRAR VENDA</TabsTrigger>
                            ) : (dashboardData?.status_sistema?.atual === 'pos_workshop') ? (
                                <TabsTrigger value="propostas-vendidas" className={styles.tabItem}>MINHAS VENDAS</TabsTrigger>
                            ) : (
                                <TabsTrigger value="nova" className={styles.tabItem}>NOVA PROPOSTA</TabsTrigger>
                            )}
                        </TabsList>

                        {/* ABA: DASHBOARD */}
                        <TabsContent value="dashboard" className="space-y-6">
                            <div className={styles.statsGrid}>
                                {dashboardData?.status_sistema?.atual === 'pos_workshop' ? (
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

                        {/* ABA: MINHAS PROPOSTAS */}
                        <TabsContent value="propostas" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={styles.propostasContainer}>
                                {(dashboardData?.status_sistema?.atual === 'pos_workshop'
                                    ? (minhasVendasPos?.vendas_rejeitadas || [])
                                    : propostas
                                ).length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <FileText className="h-20 w-20 mb-6 opacity-10" />
                                        <p className={styles.emptyStateTitle}>Nenhum registro encontrado</p>
                                        <p className={styles.emptyStateText}>Suas propostas cadastradas aparecerão nesta seção</p>
                                    </div>
                                ) : (
                                    (dashboardData?.status_sistema?.atual === 'pos_workshop'
                                        ? minhasVendasPos.vendas_rejeitadas
                                        : propostas
                                    ).map((p) => (
                                        <div key={p.id} className={styles.propostaWhiteCard}>
                                            <div className={styles.propostaSideIndicator}></div>
                                            <div className={styles.propostaCardHeader}>
                                                <h4 className={styles.propostaCardTitle}>
                                                    {p.equipe_nome || (dashboardData?.equipe?.nome || 'Minha Equipe')} – Proposta {p.numero_proposta_equipe || p.id}
                                                </h4>
                                                <Badge className={`${getStatusColor(p.status)} font-black px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.15em]`}>
                                                    {p.status_display || (p.status === 'rejeitada' ? 'Rejeitada' : p.status === 'validada' ? 'Validada' : p.status === 'enviada' ? 'Pendente' : p.status === 'vendida' ? 'Vendida' : p.status === 'nao_vendida' ? 'Não Vendida' : p.status || 'Pendente')}
                                                </Badge>
                                            </div>
                                            <div className={styles.propostaCardBody}>
                                                <div className={styles.propostaDataGrid}>
                                                    <div className={styles.dataField}>
                                                        <span className={styles.dataLabel}>Nome do Cliente</span>
                                                        <span className={styles.dataValue}>{p.cliente_nome}</span>
                                                    </div>
                                                    <div className={styles.dataField}>
                                                        <span className={styles.dataLabel}>Valor Estimado</span>
                                                        <span className={styles.dataValueHighlight}>R$ {p.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className={styles.dataField}>
                                                        <span className={styles.dataLabel}>Produtos</span>
                                                        <span className={styles.dataValueAccent}>{p.quantidade_produtos} Produtos</span>
                                                    </div>
                                                    <div className={styles.dataField}>
                                                        <span className={styles.dataLabel}>Responsável</span>
                                                        <span className={styles.dataValue}>{p.vendedor_nome}</span>
                                                    </div>
                                                </div>
                                                {p.status === 'rejeitada' && p.motivo_rejeicao && (
                                                    <div className={styles.feedbackAviso}>
                                                        <span className={styles.feedbackTitle}>Feedback da Gestão</span>
                                                        <p className={styles.feedbackText}>{p.motivo_rejeicao}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.propostaCardActions}>
                                                {p.arquivo_pdf && (
                                                    <button className={`${styles.actionButton} ${styles.btnSecondary}`} onClick={() => downloadPDF(p.arquivo_pdf)}>
                                                        <FileText className="h-5 w-5" />
                                                        <span>PDF da Proposta</span>
                                                    </button>
                                                )}
                                                {p.status === 'rejeitada' && (
                                                    <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={() => window.location.href = '/corrigir-propostas'}>
                                                        Corrigir Proposta
                                                    </button>
                                                )}
                                                {p.status === 'nao_vendida' && dashboardData?.status_sistema?.atual === 'pos_workshop' && (
                                                    <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={() => handleCorrigirVenda(p)}>
                                                        Registrar Correção
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        {/* ABA: NOVA PROPOSTA */}
                        <TabsContent value="nova" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={styles.novaPropostaCard}>
                                <div className={styles.novaPropostaHeader}>
                                    <div className={styles.headerIcon}><FileText className="h-6 w-6" /></div>
                                    <div className={styles.headerText}>
                                        <h2>Nova Proposta Comercial</h2>
                                        <p>Preencha os campos abaixo para registrar sua proposta</p>
                                    </div>
                                </div>
                                <div className={styles.novaPropostaContent}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Nome completo do Cliente *</label>
                                            <input className={styles.formInput} value={novaProposta.cliente} onChange={(e) => setNovaProposta({ ...novaProposta, cliente: e.target.value })} placeholder="Ex: Empresa de Bebidas LTDA" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Consultor Responsável *</label>
                                            <input className={styles.formInput} value={novaProposta.vendedor} onChange={(e) => setNovaProposta({ ...novaProposta, vendedor: e.target.value })} placeholder="Seu nome completo" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Valor Global da Proposta *</label>
                                            <div className={styles.inputIconWrapper}>
                                                <span className={styles.inputIcon}>R$</span>
                                                <input type="number" className={`${styles.formInput} ${styles.formInputCurrency}`} value={novaProposta.valor_proposta} onChange={(e) => setNovaProposta({ ...novaProposta, valor_proposta: e.target.value })} placeholder="0,00" />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Quantidade de Produtos *</label>
                                            <input type="number" className={`${styles.formInput} ${styles.formInputQuantity}`} value={novaProposta.quantidade_produtos} onChange={(e) => setNovaProposta({ ...novaProposta, quantidade_produtos: e.target.value })} placeholder="Ex: 12" />
                                        </div>
                                    </div>

                                    <div className={`${styles.formGroup} mt-8`}>
                                        <label className={styles.formLabel}>Observações e Detalhamento</label>
                                        <textarea className={styles.formTextarea} value={novaProposta.descricao} onChange={(e) => setNovaProposta({ ...novaProposta, descricao: e.target.value })} placeholder="Descreva condições especiais, mix de produtos ou observações relevantes..." />
                                    </div>

                                    <div className={styles.pdfUploadArea}>
                                        <label className={styles.formLabel}>Anexar Proposta Digital (PDF) *</label>
                                        <div className={styles.pdfUploadButton}>
                                            <input type="file" accept=".pdf" onChange={(e) => setNovaProposta({ ...novaProposta, arquivo_pdf: e.target.files[0] })} />
                                            <Download className="h-5 w-5 text-[#FF5E3A]" />
                                            <span>{novaProposta.arquivo_pdf ? novaProposta.arquivo_pdf.name : 'Clique para selecionar o arquivo PDF'}</span>
                                        </div>
                                    </div>

                                    <div className={styles.bonusPanel}>
                                        <div className={styles.bonusHeader}>
                                            <div className={styles.bonusTitleGroup}>
                                                <div className={styles.bonusTitleIcon}><TrendingUp className="h-6 w-6" /></div>
                                                <div className={styles.bonusTitleText}>
                                                    <h3>Aceleradores de Pontuação</h3>
                                                    <p>Selecione os bônus aplicáveis para turbinar seu ranking</p>
                                                </div>
                                            </div>
                                            <div className={styles.bonusTotalDisplay}>
                                                <div className={styles.bonusTotalValue}>+{
                                                    (novaProposta.bonus_vinhos_casa_perini_mundo ? 5 : 0) +
                                                    (novaProposta.bonus_vinhos_fracao_unica ? 5 : 0) +
                                                    (novaProposta.bonus_espumantes_vintage ? 5 : 0) +
                                                    (novaProposta.bonus_espumantes_premium ? 5 : 0) +
                                                    (novaProposta.bonus_aceleracao ? 25 : 0)
                                                }</div>
                                                <div className={styles.bonusTotalLabel}>Pontos Extras</div>
                                            </div>
                                        </div>

                                        <div className={styles.bonusGrid}>
                                            <div className="space-y-4">
                                                <p className={styles.bonusCategoryTitle}>Mix por Linha (Bônus Individual)</p>
                                                {[
                                                    { id: 'bonus_vinhos_casa_perini_mundo', label: 'Linha Vinhos Casa Perini Mundo', sub: 'Mix mínimo de 5 Caixas', pts: '+5' },
                                                    { id: 'bonus_vinhos_fracao_unica', label: 'Linha Vinhos Fração Única', sub: 'Mix mínimo de 5 Caixas', pts: '+5' },
                                                    { id: 'bonus_espumantes_vintage', label: 'Linha Espumantes Vintage', sub: 'Mix mínimo de 5 Caixas', pts: '+5' },
                                                    { id: 'bonus_espumantes_premium', label: 'Linha Espumantes Premium', sub: 'Mix mínimo de 2 Caixas', pts: '+5' }
                                                ].map(item => (
                                                    <div
                                                        key={item.id}
                                                        className={`${styles.bonusCard} ${novaProposta[item.id] ? styles.bonusCardActive : ''}`}
                                                        onClick={() => setNovaProposta({ ...novaProposta, [item.id]: !novaProposta[item.id] })}
                                                    >
                                                        <div className={styles.bonusCheckbox}>
                                                            {novaProposta[item.id] && <CheckCircle className="h-4 w-4" />}
                                                        </div>
                                                        <div className={styles.bonusInfo}>
                                                            <div className={styles.bonusLabel}>{item.label}</div>
                                                            <div className={styles.bonusSublabel}>{item.sub}</div>
                                                        </div>
                                                        <div className="ml-auto font-black text-xs text-[#FF5E3A]">{item.pts} PTS</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-4">
                                                <p className={`${styles.bonusCategoryTitle} ${styles.bonusCategoryTitleRed}`}>Aceleração de Evento</p>
                                                <div
                                                    className={`${styles.bonusCard} ${styles.bonusCardAcceleration} ${novaProposta.bonus_aceleracao ? styles.bonusCardActive : ''}`}
                                                    onClick={() => setNovaProposta({ ...novaProposta, bonus_aceleracao: !novaProposta.bonus_aceleracao })}
                                                >
                                                    <div className={styles.bonusCheckbox}>
                                                        {novaProposta.bonus_aceleracao && <CheckCircle className="h-4 w-4" />}
                                                    </div>
                                                    <div className={styles.bonusInfo}>
                                                        <div className={styles.bonusLabel} style={{ fontSize: '1.2rem', fontFamily: "'Jaro', sans-serif" }}>Aceleração Máxima</div>
                                                        <div className={styles.bonusSublabel}>Venda concretizada durante o workshop</div>
                                                    </div>
                                                    <div className="ml-auto font-extrabold text-xl text-[#ef4444]">+25 PTS</div>
                                                </div>

                                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm mt-4">
                                                    <div className="flex items-start gap-4">
                                                        <AlertCircle className="h-5 w-5 text-[#FF5E3A] mt-1 flex-shrink-0" />
                                                        <p className="text-[11px] text-white/40 leading-relaxed m-0 font-medium italic">
                                                            Ao cadastrar esta proposta, você declara que os bônus selecionados cumprem rigorosamente com o regulamento do workshop. A pontuação extra está sujeita à <b className="text-[#FF5E3A]">auditoria e validação final</b> da banca examinadora.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button className={styles.submitButton} onClick={cadastrarProposta} disabled={salvando}>
                                            {salvando ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span className="submitButtonText">Registrando...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <span className={styles.submitButtonText}>Confirmar e Enviar Proposta Digital</span>
                                                    <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ABA: REGISTRAR VENDA (pré-workshop) */}
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

                        {/* ABA: MINHAS VENDAS (pós-workshop) */}
                        <TabsContent value="propostas-vendidas" className="space-y-6">
                            <VendasPosWorkshop />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Modal: Finalizar Venda */}
            {showVendaForm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}><i className="bi bi-cart-check"></i> Finalizar Venda</h2>
                        <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">{selectedProposta?.cliente_nome}</p>
                        <div className="space-y-4">
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Produtos Vendidos</Label>
                                <Input type="number" className={styles.formInput} value={formDataVenda.quantidade_produtos_vendidos} onChange={(e) => setFormDataVenda({ ...formDataVenda, quantidade_produtos_vendidos: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Valor Final</Label>
                                <Input type="number" className={styles.formInput} value={formDataVenda.valor_total_venda} onChange={(e) => setFormDataVenda({ ...formDataVenda, valor_total_venda: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Observações</Label>
                                <Textarea className={styles.formTextarea} value={formDataVenda.observacoes} onChange={(e) => setFormDataVenda({ ...formDataVenda, observacoes: e.target.value })} />
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

            {/* Modal: Corrigir Venda */}
            {showCorrigirVenda && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}><i className="bi bi-pencil-square"></i> Corrigir Venda</h2>
                        <p className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">{vendaParaCorrigir?.cliente_nome}</p>
                        <div className="space-y-4">
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Cliente</Label>
                                <Input className={styles.formInput} value={formCorrecao.cliente_venda} onChange={(e) => setFormCorrecao({ ...formCorrecao, cliente_venda: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Valor da Venda</Label>
                                <Input type="number" className={styles.formInput} value={formCorrecao.valor_venda} onChange={(e) => setFormCorrecao({ ...formCorrecao, valor_venda: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Quantidade de Produtos</Label>
                                <Input type="number" className={styles.formInput} value={formCorrecao.quantidade_produtos_venda} onChange={(e) => setFormCorrecao({ ...formCorrecao, quantidade_produtos_venda: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>Observações</Label>
                                <Textarea className={styles.formTextarea} value={formCorrecao.observacoes_venda} onChange={(e) => setFormCorrecao({ ...formCorrecao, observacoes_venda: e.target.value })} />
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

            {/* Onda decorativa no rodapé */}
            <div className={styles.waveDivider}>
                <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="var(--color-orange)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
                </svg>
            </div>
        </div>
    );
};

export default DashboardEquipe;
