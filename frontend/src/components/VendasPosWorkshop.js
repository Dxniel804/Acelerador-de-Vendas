import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  FileText, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus
} from 'lucide-react';
import '../styles/VendasPosWorkshop.css';

const VendasPosWorkshop = () => {
  const [propostasEquipe, setPropostasEquipe] = useState([]);
  const [minhasVendas, setMinhasVendas] = useState({
    aguardando_validacao: [],
    vendas_validadas: [],
    total_aguardando: 0,
    total_validadas: 0
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
    data_venda: new Date().toISOString().split('T')[0],
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

      // Buscar todas as propostas da equipe para seleção na modal
      const propostasResponse = await fetch(`${API_BASE}/equipe/todas-propostas/`, { headers });
      
      if (propostasResponse.status === 403) {
        setError('Funcionalidade disponível apenas no status Pós-Workshop');
        setLoading(false);
        return;
      }
      
      if (propostasResponse.ok) {
        const propostasData = await propostasResponse.json();
        setPropostasEquipe(propostasData);
      }

      // Buscar minhas vendas concretizadas
      const vendasResponse = await fetch(`${API_BASE}/equipe/minhas-vendas-concretizadas/`, { headers });
      if (vendasResponse.ok) {
        const vendasData = await vendasResponse.json();
        setMinhasVendas(vendasData);
      }

      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.proposta_id || !formData.valor_venda || !formData.cliente_venda) {
      setError('Selecione uma proposta e informe o valor e o cliente da venda');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/equipe/vendas-concretizadas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposta_id: formData.proposta_id,
          valor_venda: formData.valor_venda,
          cliente_venda: formData.cliente_venda,
          observacoes: formData.observacoes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar venda');
      }

      setSuccess(data.message);
      setFormData({
        proposta_id: '',
        valor_venda: '',
        cliente_venda: '',
        data_venda: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
      setPropostaSelecionada(null);
      setShowCadastroForm(false);
      fetchData();

    } catch (err) {
      setError(err.message);
    }
  };

  const selecionarProposta = (proposta) => {
    setPropostaSelecionada(proposta);
    setFormData({
      ...formData,
      proposta_id: String(proposta.id),
      valor_venda: proposta?.valor_proposta || '',
      cliente_venda: proposta?.cliente_nome || ''
    });
    setShowPropostaModal(false);
  };

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor) => {
    if (!valor) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="vendas-pos-workshop-loading">
        <div className="loading-spinner">
          <TrendingUp className="animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vendas-pos-workshop">
      <div className="header">
        <h2>💰 Vendas Concretizadas</h2>
        <p>Aqui aparecem apenas as vendas validadas pelo gestor</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Vendas Validadas pelo Gestor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {minhasVendas.vendas_validadas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda concretizada ainda</h3>
                  <p className="text-gray-500">Depois que o gestor validar uma venda, ela aparecerá aqui.</p>
                </div>
              ) : (
                <div className="vendas-list">
                  {minhasVendas.vendas_validadas.map((venda) => (
                    <div key={venda.id} className="venda-item validated">
                      <div className="venda-info">
                        <h4>Proposta #{venda.id}</h4>
                        <div className="venda-details">
                          <span><strong>Cliente:</strong> {venda.cliente_venda || venda.cliente_nome}</span>
                          <span><strong>Valor:</strong> {formatarValor(venda.valor_venda)}</span>
                          <span><strong>Data:</strong> {formatarData(venda.data_venda)}</span>
                          <span><strong>Validado em:</strong> {formatarData(venda.data_validacao_venda)}</span>
                        </div>
                      </div>
                      <Badge className="status-badge validated">Validada</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="form-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Cadastro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <Button
                  type="button"
                  className="btn-submit"
                  onClick={() => setShowCadastroForm((v) => !v)}
                >
                  CADASTRO DE PROPOSTA VENDIDA
                </Button>
              </div>

              {propostasEquipe.length === 0 ? (
                <div className="text-gray-600">
                  Nenhuma proposta encontrada para seleção.
                </div>
              ) : !showCadastroForm ? (
                <div className="text-gray-600">
                  Clique no botão acima para abrir o formulário.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="venda-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <Label>Proposta *</Label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Input
                          type="text"
                          readOnly
                          value={
                            propostaSelecionada
                              ? `#${propostaSelecionada.id} - ${propostaSelecionada.cliente_nome} - ${formatarValor(propostaSelecionada.valor_proposta)} (${propostaSelecionada.status_display})`
                              : ''
                          }
                          placeholder="Selecione uma proposta..."
                        />
                        <Button type="button" variant="outline" onClick={() => setShowPropostaModal(true)}>
                          Selecionar
                        </Button>
                      </div>
                    </div>

                    <div className="form-group">
                      <Label htmlFor="valor_venda">Preço que você vendeu *</Label>
                      <Input
                        id="valor_venda"
                        type="number"
                        step="0.01"
                        value={formData.valor_venda}
                        onChange={(e) => setFormData({ ...formData, valor_venda: e.target.value })}
                        placeholder="0,00"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <Label htmlFor="cliente_venda">Para quem você vendeu *</Label>
                      <Input
                        id="cliente_venda"
                        type="text"
                        value={formData.cliente_venda}
                        onChange={(e) => setFormData({ ...formData, cliente_venda: e.target.value })}
                        placeholder="Nome do cliente da venda"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <Label htmlFor="data_venda">Data da Venda *</Label>
                      <Input
                        id="data_venda"
                        type="date"
                        value={formData.data_venda}
                        onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Informações adicionais sobre a venda..."
                      rows={3}
                    />
                  </div>

                  <div className="modal-actions">
                    <Button
                      type="submit"
                      className="btn-submit"
                      disabled={!formData.proposta_id || !formData.valor_venda || !formData.cliente_venda}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Enviar para Validação do Gestor
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showPropostaModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Selecionar Proposta</h3>
            </div>
            <div className="modal-content">
              <div className="vendas-list">
                {propostasEquipe.map((proposta) => (
                  <div
                    key={proposta.id}
                    className="venda-item"
                    style={{ cursor: proposta.status === 'validada' ? 'pointer' : 'not-allowed', opacity: proposta.status === 'validada' ? 1 : 0.6 }}
                    onClick={() => {
                      if (proposta.status === 'validada') {
                        selecionarProposta(proposta);
                      }
                    }}
                  >
                    <div className="venda-info">
                      <h4>Proposta #{proposta.id}</h4>
                      <div className="venda-details">
                        <span><strong>Cliente:</strong> {proposta.cliente_nome}</span>
                        <span><strong>Valor:</strong> {formatarValor(proposta.valor_proposta)}</span>
                        <span><strong>Status:</strong> {proposta.status_display}</span>
                      </div>
                    </div>
                    <Badge className={`status-badge ${proposta.status === 'validada' ? 'validated' : 'pending'}`}>
                      {proposta.status === 'validada' ? 'Selecionável' : 'Indisponível'}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <Button variant="outline" type="button" onClick={() => setShowPropostaModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendasPosWorkshop;
