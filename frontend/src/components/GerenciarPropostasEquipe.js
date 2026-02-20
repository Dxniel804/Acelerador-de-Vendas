import { API_URL, API_BASE_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { storage } from '../utils/storage';
import { FileText, Download, XCircle, AlertCircle } from 'lucide-react';
import styles from './GerenciarPropostasEquipe.module.css';

const GerenciarPropostasEquipe = () => {
    const [propostas, setPropostas] = useState([]);
    const [propostaEditando, setPropostaEditando] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [formData, setFormData] = useState({
        valor_proposta: '',
        descricao: '',
        quantidade_produtos: 0,
        arquivo_pdf: null
    });

    const API_BASE = API_URL;

    useEffect(() => {
        fetchPropostas();
    }, []);

    const fetchPropostas = async () => {
        try {
            setLoading(true);
            const token = storage.getToken();
            
            if (!token) {
                setError('Token de autenticação não encontrado');
                storage.clear();
                window.location.href = '/login';
                return;
            }

            const headers = {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            };

            // Usar o endpoint correto da API de equipe
            const response = await fetch(`${API_BASE}/api/equipe/propostas/`, { headers });
            
            if (response.status === 401 || response.status === 403) {
                storage.clear();
                window.location.href = '/login';
                return;
            }
            
            if (!response.ok) throw new Error('Erro ao buscar propostas');
            
            const propostasData = await response.json();
            
            // Filtrar apenas propostas rejeitadas da equipe logada
            const propostasRejeitadas = propostasData.filter((p) => p.status === 'rejeitada');
            
            setPropostas(propostasRejeitadas);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const editarProposta = (proposta) => {
        setPropostaEditando(proposta);
        setFormData({
            valor_proposta: proposta.valor_proposta,
            descricao: proposta.descricao,
            quantidade_produtos: proposta.quantidade_produtos,
            arquivo_pdf: null
        });
    };

    const reenviarProposta = async () => {
        if (!propostaEditando) return;
        try {
            setSalvando(true);
            const token = storage.getToken();
            
            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            const formDataToSend = new FormData();
            formDataToSend.append('valor_proposta', formData.valor_proposta);
            formDataToSend.append('descricao', formData.descricao);
            formDataToSend.append('quantidade_produtos', formData.quantidade_produtos);
            if (formData.arquivo_pdf) formDataToSend.append('arquivo_pdf', formData.arquivo_pdf);

            const response = await fetch(`${API_BASE}/api/propostas/${propostaEditando.id}/reenviar/`, {
                method: 'PUT',
                headers: { 'Authorization': `Token ${token}` },
                body: formDataToSend
            });
            
            if (response.status === 401 || response.status === 403) {
                storage.clear();
                window.location.href = '/login';
                return;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Erro ao reenviar proposta');
            }
            
            setPropostaEditando(null);
            fetchPropostas();
            alert('Proposta reenviada com sucesso!');
        } catch (err) {
            setError(err.message);
            alert('Erro ao reenviar proposta: ' + err.message);
        } finally {
            setSalvando(false);
        }
    };

    const apagarProposta = async (propostaId) => {
        if (!window.confirm('Tem certeza que deseja apagar esta proposta?')) return;
        try {
            const token = storage.getToken();
            
            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            const response = await fetch(`${API_BASE}/api/propostas/${propostaId}/apagar/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                storage.clear();
                window.location.href = '/login';
                return;
            }
            
            if (!response.ok) throw new Error('Erro ao apagar proposta');
            
            fetchPropostas();
        } catch (err) {
            setError(err.message);
            alert('Erro ao apagar proposta: ' + err.message);
        }
    };

    const downloadPDF = (url) => {
        if (!url) return;
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        window.open(fullUrl, '_blank');
    };

    if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div></div>;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1><i className="bi bi-exclamation-octagon mr-2"></i> Propostas Rejeitadas</h1>
                    <p>Corrija e reenvie suas propostas para validação do gestor.</p>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-list-stars mr-2"></i>
                            Suas Propostas Rejeitadas
                        </h2>
                    </div>
                    <div className={styles.cardContent}>
                        {propostas.length === 0 ? (
                            <div className={styles.emptyState}>
                                <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem', color: 'var(--color-orange)' }}></i>
                                <h3>Tudo em dia!</h3>
                                <p>Você não tem propostas rejeitadas no momento.</p>
                                <button onClick={() => window.location.href = '/dashboard'} className={styles.buttonPrimary}>Voltar ao Dashboard</button>
                            </div>
                        ) : (
                            <div className={styles.propostasList}>
                                {propostas.map((p) => (
                                    <article key={p.id} className={styles.propostaCard}>
                                        <div className={styles.propostaHeader}>
                                            <div className={styles.propostaInfo}>
                                                <div className={styles.propostaTitle}>
                                                    <h3>{p.equipe_nome || 'Minha Equipe'} – PROPOSTA {p.numero_proposta_equipe || p.id}</h3>
                                                    <span className={styles.badgeRejected}>
                                                        <XCircle className="h-3 w-3" />
                                                        REJEITADA
                                                    </span>
                                                </div>
                                                
                                                {p.motivo_rejeicao && (
                                                    <div className={styles.rejectionReason}>
                                                        <AlertCircle className="h-4 w-4" />
                                                        <p><b>Feedback da Gestão:</b> {p.motivo_rejeicao}</p>
                                                    </div>
                                                )}
                                                
                                                <div className={styles.propostaDetails}>
                                                    <div className={styles.propostaDetail}>
                                                        <strong>NOME DO CLIENTE</strong>
                                                        <span>{p.cliente_nome}</span>
                                                    </div>
                                                    <div className={styles.propostaDetail}>
                                                        <strong>VALOR ESTIMADO</strong>
                                                        <span className={styles.valorHighlight}>
                                                            R$ {p.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div className={styles.propostaDetail}>
                                                        <strong>PRODUTOS</strong>
                                                        <span className={styles.produtosHighlight}>
                                                            {p.quantidade_produtos} Produtos
                                                        </span>
                                                    </div>
                                                    <div className={styles.propostaDetail}>
                                                        <strong>RESPONSÁVEL</strong>
                                                        <span>{p.vendedor_nome}</span>
                                                    </div>
                                                </div>
                                                
                                                {p.descricao && (
                                                    <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                                                        <strong style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>RESUMO E DETALHAMENTO</strong>
                                                        <p style={{ fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic', lineHeight: '1.5', margin: 0 }}>{p.descricao}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className={styles.propostaActions}>
                                                {p.arquivo_pdf && (
                                                    <button className={styles.button} onClick={() => downloadPDF(p.arquivo_pdf)}>
                                                        <FileText className="h-4 w-4" />
                                                        PDF DA PROPOSTA
                                                    </button>
                                                )}
                                                <button className={styles.buttonPrimary} onClick={() => editarProposta(p)}>
                                                    <i className="bi bi-pencil-square"></i>
                                                    CORRIGIR PROPOSTA
                                                </button>
                                                <button className={`${styles.button} ${styles.buttonDanger}`} onClick={() => apagarProposta(p.id)}>
                                                    <i className="bi bi-trash"></i>
                                                    APAGAR
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {propostaEditando && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2>Corrigir: {propostaEditando.equipe_nome} – Proposta {propostaEditando.numero_proposta_equipe || propostaEditando.id} – {propostaEditando.cliente_nome}</h2>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <Label className={styles.formLabel}>Valor *</Label>
                                        <Input className={styles.formInput} type="number" value={formData.valor_proposta} onChange={(e) => setFormData({ ...formData, valor_proposta: e.target.value })} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <Label className={styles.formLabel}>Produtos *</Label>
                                        <Input className={styles.formInput} type="number" value={formData.quantidade_produtos} onChange={(e) => setFormData({ ...formData, quantidade_produtos: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>Descrição</Label>
                                    <Textarea className={styles.formTextarea} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>Novo PDF (opcional)</Label>
                                    <Input className={styles.formInput} type="file" accept=".pdf" onChange={(e) => setFormData({ ...formData, arquivo_pdf: e.target.files[0] })} />
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.buttonSecondary} onClick={() => setPropostaEditando(null)}>Cancelar</button>
                                <button className={styles.buttonPrimary} onClick={reenviarProposta} disabled={salvando}>
                                    {salvando ? 'Enviando...' : 'Reenviar Proposta'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.waveDivider}>
                <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="var(--color-orange)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
                </svg>
            </div>
        </div>
    );
};

export default GerenciarPropostasEquipe;
