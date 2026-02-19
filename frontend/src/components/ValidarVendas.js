import { API_URL, API_BASE_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    AlertCircle,
    RefreshCw,
    Star,
    Info,
    FileText,
} from 'lucide-react';
import '../styles/ValidarVendas.css';

const getNomeProposta = (venda) => {
    const num = venda.numero_proposta_equipe || venda.id;
    return `${venda.equipe_nome} – Proposta ${num}`;
};

const BonusPanel = ({ bonus }) => {
    if (!bonus || bonus.length === 0) return null;
    const total = bonus.reduce((s, b) => s + b.pontos, 0);
    return (
        <div className="bonus-panel">
            <div className="bonus-panel-header">
                <Star className="h-4 w-4 text-orange-400" />
                <span className="bonus-panel-title">Pontos Bônus Selecionados pela Equipe</span>
                <span className="bonus-panel-total">+{total} pts</span>
            </div>
            <div className="bonus-panel-list">
                {bonus.map((b, i) => (
                    <div key={i} className="bonus-panel-item">
                        <CheckCircle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                        <span>{b.label}</span>
                        <span className="bonus-panel-pts">+{b.pontos} pts</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ValidarVendas = () => {
    const [vendasPendentes, setVendasPendentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [vendaSelecionada, setVendaSelecionada] = useState(null);
    const [motivoRejeicao, setMotivoRejeicao] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [acao, setAcao] = useState(''); // 'validar' ou 'rejeitar'

    const API_BASE = API_URL;

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        carregarVendasPendentes();
    }, []);

    const carregarVendasPendentes = async () => {
        try {
            const token = sessionStorage.getItem('token');

            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            const response = await fetch(`${API_BASE}/gestor/validar-vendas/`, {
                headers: {
                    Authorization: `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 403) {
                setError('Funcionalidade disponível apenas no status Pós-Workshop');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Erro ao carregar vendas pendentes');
            }

            const data = await response.json();
            setVendasPendentes(data);
            if (error && error !== 'Funcionalidade disponível apenas no status Pós-Workshop') setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const abrirModalValidacao = (venda, acaoSelecionada) => {
        setVendaSelecionada(venda);
        setAcao(acaoSelecionada);
        setMotivoRejeicao('');
        setShowModal(true);
    };

    const processarValidacao = async () => {
        if (!vendaSelecionada || !acao) return;

        if (acao === 'rejeitar' && !motivoRejeicao.trim()) {
            alert('Por favor, informe o motivo da rejeição.');
            return;
        }

        try {
            setSubmitting(true);
            const token = sessionStorage.getItem('token');

            const response = await fetch(`${API_BASE}/gestor/validar-vendas/`, {
                method: 'POST',
                headers: {
                    Authorization: `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    proposta_id: vendaSelecionada.id,
                    acao: acao,
                    motivo: motivoRejeicao,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao processar validação');
            }

            const result = await response.json();

            setSuccess(result.message);
            setShowModal(false);
            setVendaSelecionada(null);
            setAcao('');
            setMotivoRejeicao('');
            carregarVendasPendentes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatarData = (dataString) => {
        if (!dataString) return '-';
        return new Date(dataString).toLocaleString('pt-BR');
    };

    const formatarValor = (valor) => {
        if (!valor) return '-';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    const abrirPDF = (url) => {
        if (!url) return;
        const pdfUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        window.open(pdfUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="validar-vendas-loading">
                <div className="loading-spinner">
                    <RefreshCw className="animate-spin" />
                    <span>Carregando vendas pendentes...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="validar-vendas">
            {error && (
                <div className="alert error">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {success && (
                <div className="alert success">
                    <CheckCircle className="h-4 w-4" />
                    {success}
                </div>
            )}

            <div className="vendas-list">
                {vendasPendentes.length === 0 ? (
                    <div className="empty-state">
                        <Clock className="empty-icon" />
                        <h3>Nenhuma venda pendente de validação</h3>
                        <p>Todas as vendas já foram processadas ou não há vendas aguardando validação no momento.</p>
                    </div>
                ) : (
                    vendasPendentes.map((venda) => (
                        <Card key={venda.id} className="venda-card">
                            <CardHeader>
                                <div className="venda-header">
                                    <CardTitle className="venda-title">
                                        {getNomeProposta(venda)} — {venda.cliente_venda || venda.cliente_nome}
                                    </CardTitle>
                                    <Badge className="status-badge pending">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Aguardando Validação
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="venda-details">
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <Label>Cliente</Label>
                                            <span>{venda.cliente_venda || venda.cliente_nome}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Label>Vendedor</Label>
                                            <span>{venda.vendedor_nome}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Label>Equipe</Label>
                                            <span>{venda.equipe_nome}</span>
                                        </div>

                                        <div className="detail-item">
                                            <Label>Valor da Proposta</Label>
                                            <span className="valor-proposta">{formatarValor(venda.valor_proposta)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Label>Valor da Venda</Label>
                                            <span className="valor-venda">{formatarValor(venda.valor_venda)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Label>Produtos na Proposta</Label>
                                            <span className="font-bold">{venda.quantidade_produtos || 0}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Label>Produtos na Venda</Label>
                                            <span className="font-bold text-blue-600">{venda.quantidade_produtos_venda || 0}</span>
                                        </div>
                                    </div>

                                    {venda.arquivo_pdf && (
                                        <div
                                            className="venda-actions"
                                            style={{ justifyContent: 'flex-start', marginTop: 12, padding: 0, background: 'transparent' }}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => abrirPDF(venda.arquivo_pdf)}
                                                className="text-teal-600 border-teal-200 hover:bg-teal-50"
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                Ver PDF da Proposta
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="venda-actions">
                                    <Button onClick={() => abrirModalValidacao(venda, 'validar')} className="btn-validar">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Validar Venda
                                    </Button>
                                    <Button
                                        onClick={() => abrirModalValidacao(venda, 'rejeitar')}
                                        variant="outline"
                                        className="btn-rejeitar"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Rejeitar Venda
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal de Validação */}
            {showModal && vendaSelecionada && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {acao === 'validar' ? (
                                    <div className="flex items-center gap-3 text-green-600">
                                        <CheckCircle className="h-8 w-8" />
                                        <span>Confirmar Validação</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-red-600">
                                        <XCircle className="h-8 w-8" />
                                        <span>Rejeitar Venda</span>
                                    </div>
                                )}
                            </h3>
                        </div>

                        <div className="modal-content">
                            <div className="venda-resumo">
                                <div className="flex items-center gap-2 mb-4">
                                    <Info className="h-5 w-5 text-blue-500" />
                                    <h4 className="text-lg font-bold text-gray-800 m-0">Resumo da Transação</h4>
                                </div>

                                <div className="resumo-grid">
                                    <div className="resumo-item">
                                        <Label>Proposta</Label>
                                        <span className="font-bold text-gray-900">{getNomeProposta(vendaSelecionada)}</span>
                                    </div>
                                    <div className="resumo-item">
                                        <Label>Cliente</Label>
                                        <span className="text-blue-600 font-bold">
                                            {vendaSelecionada.cliente_venda || vendaSelecionada.cliente_nome}
                                        </span>
                                    </div>
                                    <div className="resumo-item">
                                        <Label>Equipe Responsável</Label>
                                        <span className="text-orange-600 font-bold">{vendaSelecionada.equipe_nome}</span>
                                    </div>
                                    <div className="resumo-item">
                                        <Label>Valor Total</Label>
                                        <span className="valor-venda">{formatarValor(vendaSelecionada.valor_venda)}</span>
                                    </div>
                                    <div className="resumo-item">
                                        <Label>Mix de Produtos</Label>
                                        <span className="text-purple-600 font-bold">{vendaSelecionada.quantidade_produtos_venda} itens</span>
                                    </div>
                                </div>

                                {/* Bônus no modal */}
                                {vendaSelecionada.bonus_selecionados && vendaSelecionada.bonus_selecionados.length > 0 && (
                                    <div className="mt-6">
                                        <BonusPanel bonus={vendaSelecionada.bonus_selecionados} />
                                    </div>
                                )}
                            </div>

                            {acao === 'rejeitar' && (
                                <div className="motivo-section mt-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <Label
                                            htmlFor="motivo"
                                            className="text-red-700 font-bold uppercase text-xs tracking-wider"
                                        >
                                            Motivo da Rejeição *
                                        </Label>
                                    </div>
                                    <Textarea
                                        id="motivo"
                                        value={motivoRejeicao}
                                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                                        placeholder="Especifique detalhadamente por que esta venda não foi validada..."
                                        rows={4}
                                        className="modal-textarea"
                                        required
                                    />
                                </div>
                            )}

                            <div className="modal-actions">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowModal(false)}
                                    disabled={submitting}
                                    className="btn-cancelar"
                                >
                                    Voltar
                                </Button>
                                <Button
                                    onClick={processarValidacao}
                                    className={acao === 'validar' ? 'btn-confirmar-validar' : 'btn-confirmar-rejeitar'}
                                    disabled={(acao === 'rejeitar' && !motivoRejeicao.trim()) || submitting}
                                >
                                    <div className="flex items-center justify-center">
                                        {submitting ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : acao === 'validar' ? (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        ) : (
                                            <XCircle className="h-4 w-4 mr-2" />
                                        )}
                                        <span>
                                            {submitting
                                                ? 'Processando...'
                                                : acao === 'validar'
                                                    ? 'Confirmar Validação'
                                                    : 'Confirmar Rejeição'}
                                        </span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidarVendas;
