import { API_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import styles from './RegrasPontuacao.module.css';
import {
    Plus,
    Trash2,
    Save,
    X,
    Star,
    Trophy,
    Target,
    DollarSign
} from 'lucide-react';

const RegrasPontuacao = () => {
    const [regraPropostaValidada, setRegraPropostaValidada] = useState(null);
    const [regraVendaProduto, setRegraVendaProduto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editando, setEditando] = useState(null);

    const API_BASE = API_URL;

    useEffect(() => {
        fetchRegras();
    }, []);

    const fetchRegras = async () => {
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

            // Buscar regra de proposta validada
            const propostaResponse = await fetch(`${API_BASE}/api/banca/regra-proposta-validada/`, { headers });
            if (propostaResponse.ok) {
                const propostaData = await propostaResponse.json();
                setRegraPropostaValidada(propostaData);
            }

            // Buscar regra de venda por produto
            const vendaResponse = await fetch(`${API_BASE}/api/banca/regra-venda-produto/`, { headers });
            if (vendaResponse.ok) {
                const vendaData = await vendaResponse.json();
                setRegraVendaProduto(vendaData);
            }

            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const salvarRegraPropostaValidada = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/banca/regra-proposta-validada/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pontos_proposta_validada: regraPropostaValidada?.pontos_proposta_validada || 0
                })
            });

            if (!response.ok) throw new Error('Erro ao salvar regra de proposta validada');

            const result = await response.json();
            setRegraPropostaValidada(result);
            setError(null);

            // Feedback de sucesso
            alert('Regra de proposta validada salva com sucesso!');
        } catch (err) {
            setError(err.message);
            alert('Erro ao salvar regra: ' + err.message);
        }
    };

    const salvarRegraVendaProduto = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/banca/regra-venda-produto/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pontos_por_produto: regraVendaProduto?.pontos_por_produto || 0
                })
            });

            if (!response.ok) throw new Error('Erro ao salvar regra de venda por produto');

            const result = await response.json();
            setRegraVendaProduto(result);
            setError(null);

            // Feedback de sucesso
            alert('Regra de pontos por produto salva com sucesso!');
        } catch (err) {
            setError(err.message);
            alert('Erro ao salvar regra: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="text-lg">Carregando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                Erro: {error}
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Regras de Pontuação</h1>
                <p className={styles.subtitle}>Configure as regras de pontuação para o sistema</p>
            </div>

            <div className={styles.tabsCard}>
                <Tabs defaultValue="proposta" className="space-y-0">
                    <TabsList className={styles.tabsList}>
                        <TabsTrigger value="proposta" className={styles.tabTrigger}>Propostas Validadas</TabsTrigger>
                        <TabsTrigger value="venda" className={styles.tabTrigger}>Vendas por Produto</TabsTrigger>
                    </TabsList>

                    {/* Aba Propostas Validadas */}
                    <TabsContent value="proposta" className={`space-y-6 ${styles.tabContent}`}>
                        <Card className={styles.card}>
                            <CardHeader className={styles.cardHeader}>
                                <CardTitle className={`flex items-center gap-2 ${styles.cardTitle}`}>
                                    <Target className="h-5 w-5" style={{ color: 'var(--color-primary-orange)' }} />
                                    Pontos para Propostas Validadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className={styles.cardContent}>
                                <div className={styles.formGroup}>
                                    <Label htmlFor="pontos-proposta" className={styles.formLabel}>
                                        Pontos por proposta validada
                                    </Label>
                                    <div className={styles.formRow} style={{ marginTop: '0.5rem' }}>
                                        <Input
                                            id="pontos-proposta"
                                            type="number"
                                            value={regraPropostaValidada?.pontos_proposta_validada || 0}
                                            onChange={(e) => setRegraPropostaValidada({
                                                ...regraPropostaValidada,
                                                pontos_proposta_validada: parseInt(e.target.value) || 0
                                            })}
                                            className={styles.formInput}
                                            placeholder="0"
                                            disabled={!!regraPropostaValidada?.id && !regraPropostaValidada?.editando}
                                        />
                                        {regraPropostaValidada?.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setRegraPropostaValidada({
                                                    ...regraPropostaValidada,
                                                    editando: true
                                                })}
                                            >
                                                EDITAR
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.formActions}>
                                    <Button
                                        onClick={salvarRegraPropostaValidada}
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!regraPropostaValidada?.editando && regraPropostaValidada?.id}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {regraPropostaValidada?.id ? 'Atualizar Regra' : 'Salvar Regra'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Aba Vendas por Produto */}
                    <TabsContent value="venda" className={`space-y-6 ${styles.tabContent}`}>
                        <Card className={styles.card}>
                            <CardHeader className={styles.cardHeader}>
                                <CardTitle className={`flex items-center gap-2 ${styles.cardTitle}`}>
                                    <DollarSign className="h-5 w-5" style={{ color: 'var(--color-primary-orange)' }} />
                                    Pontos para Produtos em Propostas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className={styles.cardContent}>
                                <div className={styles.formGroup}>
                                    <Label htmlFor="pontos-produto" className={styles.formLabel}>
                                        Pontos por produto em proposta
                                    </Label>
                                    <div className={styles.formRow} style={{ marginTop: '0.5rem' }}>
                                        <Input
                                            id="pontos-produto"
                                            type="number"
                                            value={regraVendaProduto?.pontos_por_produto || 0}
                                            onChange={(e) => setRegraVendaProduto({
                                                ...regraVendaProduto,
                                                pontos_por_produto: parseInt(e.target.value) || 0
                                            })}
                                            className={styles.formInput}
                                            placeholder="0"
                                            disabled={!!regraVendaProduto?.id && !regraVendaProduto?.editando}
                                        />
                                        {regraVendaProduto?.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setRegraVendaProduto({
                                                    ...regraVendaProduto,
                                                    editando: true
                                                })}
                                            >
                                                EDITAR
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.formActions}>
                                    <Button
                                        onClick={salvarRegraVendaProduto}
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!regraVendaProduto?.editando && regraVendaProduto?.id}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {regraVendaProduto?.id ? 'Atualizar Regra' : 'Salvar Regra'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default RegrasPontuacao;
