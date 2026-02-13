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
  const [regrasBonus, setRegrasBonus] = useState([]);
  const [regraPropostaValidada, setRegraPropostaValidada] = useState(null);
  const [regraVendaProduto, setRegraVendaProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [novaRegraBonus, setNovaRegraBonus] = useState({
    nome: '',
    descricao: '',
    pontos: ''
  });

  const API_BASE = 'http://localhost:8000/api';

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

      // Buscar regras de bônus
      const bonusResponse = await fetch(`${API_BASE}/banca/regras-bonus/`, { headers });
      if (bonusResponse.ok) {
        const bonusData = await bonusResponse.json();
        setRegrasBonus(bonusData);
      }

      // Buscar regra de proposta validada
      const propostaResponse = await fetch(`${API_BASE}/banca/regra-proposta-validada/`, { headers });
      if (propostaResponse.ok) {
        const propostaData = await propostaResponse.json();
        setRegraPropostaValidada(propostaData);
      }

      // Buscar regra de venda por produto
      const vendaResponse = await fetch(`${API_BASE}/banca/regra-venda-produto/`, { headers });
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

  const salvarRegraBonus = async (regra) => {
    try {
      const token = sessionStorage.getItem('token');
      const url = regra.id ? `${API_BASE}/banca/regras-bonus/${regra.id}/` : `${API_BASE}/banca/regras-bonus/`;
      const method = regra.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(regra)
      });

      if (!response.ok) throw new Error('Erro ao salvar regra de bônus');
      
      fetchRegras();
      setEditando(null);
      setNovaRegraBonus({ nome: '', descricao: '', pontos: '' });
      setError(null);
      
      // Feedback de sucesso
      alert('Regra de bônus salva com sucesso!');
    } catch (err) {
      setError(err.message);
      alert('Erro ao salvar regra: ' + err.message);
    }
  };

  const deletarRegraBonus = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de bônus?')) return;

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/banca/regras-bonus/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao excluir regra de bônus');
      
      fetchRegras();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const salvarRegraPropostaValidada = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/banca/regra-proposta-validada/`, {
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
      const response = await fetch(`${API_BASE}/banca/regra-venda-produto/`, {
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
        <Tabs defaultValue="bonus" className="space-y-0">
          <TabsList className={styles.tabsList}>
            <TabsTrigger value="bonus" className={styles.tabTrigger}>Pontos Bônus</TabsTrigger>
            <TabsTrigger value="proposta" className={styles.tabTrigger}>Propostas Validadas</TabsTrigger>
            <TabsTrigger value="venda" className={styles.tabTrigger}>Vendas por Produto</TabsTrigger>
          </TabsList>

          {/* Aba Pontos Bônus */}
          <TabsContent value="bonus" className={`space-y-6 ${styles.tabContent}`}>
            <Card className={styles.card}>
              <CardHeader className={styles.cardHeader}>
                <CardTitle className={`flex items-center gap-2 ${styles.cardTitle}`}>
                  <Trophy className="h-5 w-5" style={{ color: 'var(--color-primary-orange)' }} />
                  Pontos Bônus
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.cardContent}>
                {/* Formulário Nova Regra */}
                <div className={styles.formSection}>
                  <h3 className={styles.formTitle}>Nova Regra de Bônus</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className={styles.formGroup}>
                      <Label htmlFor="nome" className={styles.formLabel}>Nome da Regra</Label>
                      <Input
                        id="nome"
                        value={novaRegraBonus.nome}
                        onChange={(e) => setNovaRegraBonus({...novaRegraBonus, nome: e.target.value})}
                        placeholder="Ex: Primeira Venda"
                      />
                    </div>
                    <div className={`md:col-span-2 ${styles.formGroup}`}>
                      <Label htmlFor="descricao" className={styles.formLabel}>Descrição</Label>
                      <Input
                        id="descricao"
                        value={novaRegraBonus.descricao}
                        onChange={(e) => setNovaRegraBonus({...novaRegraBonus, descricao: e.target.value})}
                        placeholder="Ex: Bônus pela primeira venda da equipe"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <Label htmlFor="pontos" className={styles.formLabel}>Pontos</Label>
                      <Input
                        id="pontos"
                        type="number"
                        value={novaRegraBonus.pontos}
                        onChange={(e) => setNovaRegraBonus({...novaRegraBonus, pontos: e.target.value})}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <Button
                      onClick={() => salvarRegraBonus(novaRegraBonus)}
                      disabled={!novaRegraBonus.nome || !novaRegraBonus.pontos}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Regra
                    </Button>
                  </div>
                </div>

                {/* Lista de Regras Existentes */}
                <div style={{ marginTop: '2.5rem' }}>
                  {regrasBonus.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        <Star className="h-12 w-12" style={{ margin: '0 auto' }} />
                      </div>
                      <p>Nenhuma regra de bônus cadastrada</p>
                    </div>
                  ) : (
                    regrasBonus.map((regra) => (
                      <div key={regra.id} className={styles.regraItem}>
                        {editando === regra.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div>
                                <Label>Nome</Label>
                                <Input
                                  value={editando?.nome || ''}
                                  onChange={(e) => setEditando({...editando, nome: e.target.value})}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label>Descrição</Label>
                                <Input
                                  value={editando?.descricao || ''}
                                  onChange={(e) => setEditando({...editando, descricao: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Pontos</Label>
                                <Input
                                  type="number"
                                  value={editando?.pontos || ''}
                                  onChange={(e) => setEditando({...editando, pontos: e.target.value})}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => salvarRegraBonus(editando)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setEditando(null)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{regra.nome}</h3>
                                <Badge className="bg-orange-100 text-orange-800">
                                  {regra.pontos} pontos
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm">{regra.descricao}</p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditando(regra)}
                              >
                                EDITAR
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deletarRegraBonus(regra.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
