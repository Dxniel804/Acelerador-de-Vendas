import { API_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import '../styles/VendasPosWorkshop.css';

const BonusSelection = ({ bonusData, onChange }) => {
    const bonusOptions = [
        { key: 'bonus_vinhos_casa_perini_mundo', label: 'Vinhos Casa Perini Mundo (min 5 Produtos)', pontos: 5 },
        { key: 'bonus_vinhos_fracao_unica', label: 'Vinhos Fração Única (min 5 Produtos)', pontos: 5 },
        { key: 'bonus_espumantes_vintage', label: 'Espumantes Vintage (min 5 Produtos)', pontos: 5 },
        { key: 'bonus_espumantes_premium', label: 'Espumantes Premium (min 2 Produtos)', pontos: 5 },
    ];

    const total = bonusOptions.reduce((s, b) => s + (bonusData[b.key] ? b.pontos : 0), 0);

    return (
        <div className="bonus-selection-panel">
            <div className="bonus-selection-header">
                <div className="flex items-center gap-2">
                    <i className="bi bi-stars"></i>
                    <span className="title">Ajustar Bônus</span>
                </div>
                <span className="total">+{total} pts</span>
            </div>
            <div className="bonus-options-grid">
                {bonusOptions.map((opt) => (
                    <div
                        key={opt.key}
                        className={`bonus-option-item ${bonusData[opt.key] ? 'active' : ''}`}
                        onClick={() => onChange(opt.key, !bonusData[opt.key])}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`checkbox ${bonusData[opt.key] ? 'checked' : ''}`}>
                                {bonusData[opt.key] && <i className="bi bi-check"></i>}
                            </div>
                            <span className="label">{opt.label}</span>
                        </div>
                        <span className="points">+{opt.pontos}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const getNomeProposta = (p) => {
    const num = p.numero_proposta_equipe || p.id;
    return `${p.equipe_nome || 'Equipe'} – Proposta ${num}`;
};

const VendasPosWorkshop = () => {
    const [propostasEquipe, setPropostasEquipe] = useState([]);
    const [minhasVendas, setMinhasVendas] = useState({
        aguardando_validacao: [],
        vendas_validadas: [],
        vendas_rejeitadas: [],
        total_aguardando: 0,
        total_validadas: 0,
        total_rejeitadas: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCadastroForm, setShowCadastroForm] = useState(false);
    const [showPropostaModal, setShowPropostaModal] = useState(false);
    const [propostaSelecionada, setPropostaSelecionada] = useState(null);
    const [formData, setFormData] = useState({
        proposta_id: '',
        valor_venda: '',
        cliente_venda: '',
        quantidade_produtos_venda: '',
        data_venda: new Date().toISOString().split('T')[0],
        observacoes: '',
        bonus_vinhos_casa_perini_mundo: false,
        bonus_vinhos_fracao_unica: false,
        bonus_espumantes_vintage: false,
        bonus_espumantes_premium: false,
        bonus_aceleracao: false,
        arquivo_pdf: null,
    });

    // Correção de venda rejeitada
    const [showCorrecaoForm, setShowCorrecaoForm] = useState(false);
    const [vendaParaCorrigir, setVendaParaCorrigir] = useState(null);
    const [formCorrecao, setFormCorrecao] = useState({
        valor_venda: '',
        cliente_venda: '',
        quantidade_produtos_venda: '',
        observacoes: '',
        bonus_vinhos_casa_perini_mundo: false,
        bonus_vinhos_fracao_unica: false,
        bonus_espumantes_vintage: false,
        bonus_espumantes_premium: false,
        bonus_aceleracao: false,
        arquivo_pdf: null,
    });

    const API_BASE = API_URL;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const headers = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };

            const propostasResponse = await fetch(`${API_BASE}/api/equipe/todas-propostas/`, { headers });
            if (propostasResponse.ok) setPropostasEquipe(await propostasResponse.json());

            const vendasResponse = await fetch(`${API_BASE}/api/equipe/minhas-vendas-concretizadas/`, { headers });
            if (vendasResponse.ok) setMinhasVendas(await vendasResponse.json());

            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const dataToSend = new FormData();

            Object.keys(formData).forEach((key) => {
                if (formData[key] !== null) {
                    dataToSend.append(key, formData[key]);
                }
            });

            const response = await fetch(`${API_BASE}/api/equipe/vendas-concretizadas/`, {
                method: 'POST',
                headers: { Authorization: `Token ${token}` },
                body: dataToSend,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao registrar venda');
            setSuccess('Venda enviada com sucesso para validação do gestor!');
            setShowCadastroForm(false);
            setPropostaSelecionada(null);
            setFormData({
                proposta_id: '',
                valor_venda: '',
                cliente_venda: '',
                quantidade_produtos_venda: '',
                data_venda: new Date().toISOString().split('T')[0],
                observacoes: '',
                bonus_vinhos_casa_perini_mundo: false,
                bonus_vinhos_fracao_unica: false,
                bonus_espumantes_vintage: false,
                bonus_espumantes_premium: false,
                bonus_aceleracao: false,
                arquivo_pdf: null,
            });
            fetchData();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCorrecaoSubmit = async (e) => {
        e.preventDefault();
        if (!vendaParaCorrigir) return;
        try {
            const token = sessionStorage.getItem('token');
            const dataToSend = new FormData();

            dataToSend.append('proposta_id', vendaParaCorrigir.id);
            dataToSend.append('valor_venda', formCorrecao.valor_venda);
            dataToSend.append('cliente_venda', formCorrecao.cliente_venda);
            dataToSend.append('quantidade_produtos_venda', formCorrecao.quantidade_produtos_venda);
            dataToSend.append('observacoes', formCorrecao.observacoes);
            dataToSend.append('bonus_vinhos_casa_perini_mundo', formCorrecao.bonus_vinhos_casa_perini_mundo);
            dataToSend.append('bonus_vinhos_fracao_unica', formCorrecao.bonus_vinhos_fracao_unica);
            dataToSend.append('bonus_espumantes_vintage', formCorrecao.bonus_espumantes_vintage);
            dataToSend.append('bonus_espumantes_premium', formCorrecao.bonus_espumantes_premium);
            dataToSend.append('bonus_aceleracao', formCorrecao.bonus_aceleracao);

            if (formCorrecao.arquivo_pdf) {
                dataToSend.append('arquivo_pdf', formCorrecao.arquivo_pdf);
            }

            const response = await fetch(`${API_BASE}/api/equipe/vendas-concretizadas/`, {
                method: 'POST',
                headers: { Authorization: `Token ${token}` },
                body: dataToSend,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao corrigir venda');
            setSuccess('Venda corrigida e reenviada para validação!');
            setShowCorrecaoForm(false);
            setVendaParaCorrigir(null);
            fetchData();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.message);
        }
    };

    const selecionarProposta = (proposta) => {
        setPropostaSelecionada(proposta);
        setFormData({
            ...formData,
            proposta_id: String(proposta.id),
            valor_venda: proposta.valor_proposta,
            cliente_venda: proposta.cliente_nome,
            quantidade_produtos_venda: proposta.quantidade_produtos,
            bonus_vinhos_casa_perini_mundo: proposta.bonus_vinhos_casa_perini_mundo,
            bonus_vinhos_fracao_unica: proposta.bonus_vinhos_fracao_unica,
            bonus_espumantes_vintage: proposta.bonus_espumantes_vintage,
            bonus_espumantes_premium: proposta.bonus_espumantes_premium,
            bonus_aceleracao: proposta.bonus_aceleracao,
            arquivo_pdf: null,
        });
        setShowPropostaModal(false);
    };

    const abrirCorrecao = (venda) => {
        setVendaParaCorrigir(venda);
        setFormCorrecao({
            valor_venda: venda.valor_venda || venda.valor_proposta || '',
            cliente_venda: venda.cliente_venda || venda.cliente_nome || '',
            quantidade_produtos_venda: venda.quantidade_produtos_venda || venda.quantidade_produtos || '',
            observacoes: venda.observacoes_venda || '',
            bonus_vinhos_casa_perini_mundo: venda.bonus_vinhos_casa_perini_mundo,
            bonus_vinhos_fracao_unica: venda.bonus_vinhos_fracao_unica,
            bonus_espumantes_vintage: venda.bonus_espumantes_vintage,
            bonus_espumantes_premium: venda.bonus_espumantes_premium,
            bonus_aceleracao: venda.bonus_aceleracao,
            arquivo_pdf: null,
        });
        setShowCorrecaoForm(true);
    };

    if (loading)
        return (
            <div className="vendas-pos-workshop-loading">
                <div className="loading-spinner">
                    <i className="bi bi-arrow-repeat animate-spin"></i>
                    <span>Carregando...</span>
                </div>
            </div>
        );

    return (
        <div className="vendas-pos-workshop">
            {error && (
                <div className="alert alert-error mb-4">
                    <i className="bi bi-exclamation-circle-fill"></i> {error}
                </div>
            )}
            {success && (
                <div className="alert alert-success mb-4">
                    <i className="bi bi-check-circle-fill"></i> {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="management-section">
                        <div className="section-header">
                            <div className="section-title">
                                <div className="section-icon">
                                    <i className="bi bi-check-all"></i>
                                </div>
                                Minhas Vendas
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Proposta</th>
                                        <th>Cliente</th>
                                        <th>Valor</th>
                                        <th>Status</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {minhasVendas.vendas_validadas.length === 0 &&
                                        minhasVendas.aguardando_validacao.length === 0 &&
                                        (minhasVendas.vendas_rejeitadas || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-6 opacity-50">
                                                Nenhuma venda registrada ainda.
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {minhasVendas.vendas_validadas.map((venda) => (
                                                <tr key={`v-${venda.id}`}>
                                                    <td className="text-xs opacity-70">{getNomeProposta(venda)}</td>
                                                    <td className="font-bold">{venda.cliente_venda || venda.cliente_nome}</td>
                                                    <td className="text-green-600 font-semibold">
                                                        R$ {venda.valor_venda?.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <Badge className="bg-green-600 text-white border-0 hover:bg-green-600">Validada</Badge>
                                                    </td>
                                                    <td>—</td>
                                                </tr>
                                            ))}
                                            {minhasVendas.aguardando_validacao.map((venda) => (
                                                <tr key={`a-${venda.id}`}>
                                                    <td className="text-xs opacity-70">{getNomeProposta(venda)}</td>
                                                    <td className="font-bold">{venda.cliente_venda || venda.cliente_nome}</td>
                                                    <td className="text-orange-600 font-semibold">
                                                        R$ {venda.valor_venda?.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <Badge className="bg-orange-500 text-white border-0 hover:bg-orange-500">Pendente</Badge>
                                                    </td>
                                                    <td>—</td>
                                                </tr>
                                            ))}
                                            {(minhasVendas.vendas_rejeitadas || []).map((venda) => (
                                                <tr key={`r-${venda.id}`} className="bg-red-50/10">
                                                    <td className="text-xs opacity-70">{getNomeProposta(venda)}</td>
                                                    <td className="font-bold">
                                                        {venda.cliente_venda || venda.cliente_nome}
                                                        {venda.motivo_rejeicao_venda && (
                                                            <div className="text-xs text-red-500 font-normal mt-1">
                                                                <strong>Motivo:</strong> {venda.motivo_rejeicao_venda}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-red-600 font-semibold">
                                                        R$ {venda.valor_venda?.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <Badge className="bg-red-600 text-white border-0 hover:bg-red-600">Rejeitada</Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            size="sm"
                                                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                                                            onClick={() => abrirCorrecao(venda)}
                                                        >
                                                            <i className="bi bi-pencil-square mr-1"></i> Corrigir
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {!showCadastroForm ? (
                        <div className="flex justify-center py-8">
                            <Button className="novo-fechamento-btn" onClick={() => setShowCadastroForm(true)}>
                                <i className="bi bi-plus-circle mr-2"></i> NOVO FECHAMENTO
                            </Button>
                        </div>
                    ) : (
                        <Card className="form-card">
                            <CardHeader>
                                <CardTitle>
                                    <i className="bi bi-plus-lg mr-2"></i> Registrar Venda
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="venda-form">
                                    <div className="space-y-4">
                                        <div className="form-group-selection">
                                            <Label>Proposta Original *</Label>
                                            <div className="selection-input-wrapper">
                                                <Input
                                                    readOnly
                                                    className="selection-input"
                                                    value={
                                                        propostaSelecionada
                                                            ? getNomeProposta(propostaSelecionada) + ` – ${propostaSelecionada.cliente_nome}`
                                                            : 'Clique na lupa para selecionar...'
                                                    }
                                                    onClick={() => setShowPropostaModal(true)}
                                                />
                                                <button
                                                    type="button"
                                                    className="selection-button"
                                                    onClick={() => setShowPropostaModal(true)}
                                                >
                                                    <i className="bi bi-search"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {propostaSelecionada && (
                                            <BonusSelection
                                                bonusData={formData}
                                                onChange={(key, val) => setFormData({ ...formData, [key]: val })}
                                            />
                                        )}

                                        <div>
                                            <Label>Valor do Fechamento *</Label>
                                            <Input
                                                type="number"
                                                value={formData.valor_venda}
                                                onChange={(e) => setFormData({ ...formData, valor_venda: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Quantidade Vendida *</Label>
                                            <Input
                                                type="number"
                                                value={formData.quantidade_produtos_venda}
                                                onChange={(e) => setFormData({ ...formData, quantidade_produtos_venda: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Observações</Label>
                                            <Textarea
                                                value={formData.observacoes}
                                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="form-actions mt-6">
                                            <Button type="submit" className="flex-1 btn-enviar-validacao py-6 h-auto">
                                                <i className="bi bi-send-fill mr-2"></i> ENVIAR PARA VALIDAÇÃO
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 btn-cancelar py-6 h-auto"
                                                onClick={() => {
                                                    setShowCadastroForm(false);
                                                    setPropostaSelecionada(null);
                                                }}
                                            >
                                                CANCELAR
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showPropostaModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header-orange">
                            <h3>
                                <i className="bi bi-search mr-2"></i> Selecionar Proposta
                            </h3>
                        </div>
                        <div className="modal-content">
                            <div className="vendas-list">
                                {propostasEquipe
                                    .filter((p) => p.status === 'validada')
                                    .map((p) => (
                                        <div
                                            key={p.id}
                                            className="venda-item"
                                            onClick={() => selecionarProposta(p)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="venda-info">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4>
                                                        {getNomeProposta(p)} – {p.cliente_nome}
                                                    </h4>
                                                    {p.status === 'nao_vendida' && (
                                                        <Badge className="bg-red-500 text-white border-0 text-[10px] px-1 h-4">Rejeitada</Badge>
                                                    )}
                                                    {p.status === 'validada' && (
                                                        <Badge className="bg-green-500 text-white border-0 text-[10px] px-1 h-4">Validada</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm">
                                                    R$ {p.valor_proposta?.toLocaleString()} - {p.vendedor_nome}
                                                </p>
                                            </div>
                                            <i className="bi bi-chevron-right"></i>
                                        </div>
                                    ))}
                            </div>
                            <Button className="w-full mt-6 btn-cancelar py-4" onClick={() => setShowPropostaModal(false)}>
                                FECHAR
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showCorrecaoForm && vendaParaCorrigir && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header-orange">
                            <h3>
                                <i className="bi bi-pencil-square mr-2"></i> Corrigir Venda
                            </h3>
                        </div>
                        <div className="modal-content">
                            <div className="rejection-notice">
                                <div className="rejection-header">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <span>Venda Rejeitada</span>
                                </div>
                                <p className="proposta-info">
                                    <strong>Proposta:</strong> {getNomeProposta(vendaParaCorrigir)} – {vendaParaCorrigir.cliente_nome}
                                </p>
                                {vendaParaCorrigir.motivo_rejeicao_venda && (
                                    <p className="motivo-texto">
                                        <strong>Motivo:</strong> {vendaParaCorrigir.motivo_rejeicao_venda}
                                    </p>
                                )}
                            </div>

                            <BonusSelection
                                bonusData={formCorrecao}
                                onChange={(key, val) => setFormCorrecao({ ...formCorrecao, [key]: val })}
                            />

                            <form onSubmit={handleCorrecaoSubmit} className="venda-form space-y-4 mt-4">
                                <div>
                                    <Label>Valor do Fechamento *</Label>
                                    <Input
                                        type="number"
                                        value={formCorrecao.valor_venda}
                                        onChange={(e) => setFormCorrecao({ ...formCorrecao, valor_venda: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Quantidade Vendida *</Label>
                                    <Input
                                        type="number"
                                        value={formCorrecao.quantidade_produtos_venda}
                                        onChange={(e) => setFormCorrecao({ ...formCorrecao, quantidade_produtos_venda: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Observações</Label>
                                    <Textarea
                                        value={formCorrecao.observacoes}
                                        onChange={(e) => setFormCorrecao({ ...formCorrecao, observacoes: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                {/* NOVO CAMPO DE PDF */}
                                <div>
                                    <Label>Adicionar Novo PDF (opcional)</Label>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setFormCorrecao({ ...formCorrecao, arquivo_pdf: e.target.files[0] })}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-[10px] opacity-60 mt-1">
                                        * Se você selecionou novos bônus, é recomendável enviar uma proposta atualizada.
                                    </p>
                                </div>

                                <div className="form-actions mt-6">
                                    <Button type="submit" className="flex-1 btn-enviar-validacao h-auto py-5">
                                        REENVIAR PARA VALIDAÇÃO
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 btn-cancelar h-auto py-5"
                                        onClick={() => {
                                            setShowCorrecaoForm(false);
                                            setVendaParaCorrigir(null);
                                        }}
                                    >
                                        CANCELAR
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendasPosWorkshop;
