import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  TrendingUp, 
  Package, 
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Save,
  X,
  FileText
} from 'lucide-react';

const VendasConcretizadas = () => {
  const [todasPropostas, setTodasPropostas] = useState([]);
  const [minhasVendas, setMinhasVendas] = useState({
    aguardando_validacao: [],
    vendas_validadas: [],
    total_aguardando: 0,
    total_validadas: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMarcarVenda, setShowMarcarVenda] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState(null);
  const [valorVenda, setValorVenda] = useState('');

  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };

      // Buscar todas as propostas da equipe
      const propostasResponse = await fetch(`${API_BASE}/equipe/todas-propostas/`, { headers });
      
      if (propostasResponse.status === 403) {
        setError('Funcionalidade disponível apenas no status Pós-Workshop');
        setLoading(false);
        return;
      }
      
      if (propostasResponse.ok) {
        const propostasData = await propostasResponse.json();
        setTodasPropostas(propostasData);
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

  const marcarComoVendida = async () => {
    if (!propostaSelecionada || !valorVenda) {
      setError('Selecione uma proposta e informe o valor da venda');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/equipe/vendas-concretizadas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposta_id: propostaSelecionada.id,
          valor_venda: valorVenda
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar venda');
      }

      setSuccess(data.message);
      setShowMarcarVenda(false);
      setPropostaSelecionada(null);
      setValorVenda('');
      fetchData(); // Recarregar dados

    } catch (err) {
      setError(err.message);
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
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'enviada': 'bg-blue-100 text-blue-800',
      'validada': 'bg-green-100 text-green-800',
      'vendida': 'bg-purple-100 text-purple-800',
      'rejeitada': 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const podeMarcarComoVendida = (proposta) => {
    return proposta.status === 'validada';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Propostas</h1>
          <p className="text-gray-600">Visualize todas as suas propostas e marque as vendidas como concretizadas</p>
        </div>

        {error && <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">{error}</div>}
        {success && <div className="text-green-600 mb-4 p-4 bg-green-50 rounded-lg">{success}</div>}

        {/* Lista de Todas as Propostas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Todas as Propostas da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todasPropostas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma proposta encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todasPropostas.map((proposta) => (
                  <div key={proposta.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Proposta #{proposta.id}</h3>
                          <Badge className={getStatusBadge(proposta.status)}>
                            {proposta.status_display || proposta.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Cliente:</span> {proposta.cliente?.nome}
                          </div>
                          <div>
                            <span className="font-medium">Vendedor:</span> {proposta.vendedor?.nome}
                          </div>
                          <div>
                            <span className="font-medium">Valor Proposta:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            <span className="font-medium">Data Envio:</span> {new Date(proposta.data_envio).toLocaleDateString('pt-BR')}
                          </div>
                          {proposta.valor_venda && (
                            <div>
                              <span className="font-medium">Valor Venda:</span> R$ {proposta.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                          {proposta.data_venda && (
                            <div>
                              <span className="font-medium">Data Venda:</span> {new Date(proposta.data_venda).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {proposta.venda_validada && (
                            <div>
                              <span className="font-medium">Status Venda:</span> 
                              <span className="text-green-600 font-bold ml-1">Validada</span>
                            </div>
                          )}
                        </div>
                        {proposta.descricao && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Descrição:</span> {proposta.descricao}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {podeMarcarComoVendida(proposta) && (
                          <Button
                            onClick={() => {
                              setPropostaSelecionada(proposta);
                              setValorVenda(proposta.valor_proposta);
                              setShowMarcarVenda(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Marcar como Vendida
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal para marcar venda */}
        {showMarcarVenda && propostaSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Marcar Proposta como Vendida</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  <p className="mt-1 text-sm text-gray-900">{propostaSelecionada.cliente?.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor da Proposta</label>
                  <p className="mt-1 text-sm text-gray-900">R$ {propostaSelecionada.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <label htmlFor="valorVenda" className="block text-sm font-medium text-gray-700">Valor da Venda Realizada *</label>
                  <input
                    type="number"
                    id="valorVenda"
                    step="0.01"
                    value={valorVenda}
                    onChange={(e) => setValorVenda(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                    placeholder="Digite o valor da venda"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMarcarVenda(false);
                    setPropostaSelecionada(null);
                    setValorVenda('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={marcarComoVendida}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirmar Venda
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resumo das Vendas */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Propostas Validadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {todasPropostas.filter(p => p.status === 'validada').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Prontas para marcar como vendida
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Aguardando Validação</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{minhasVendas.total_aguardando}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando validação do gestor
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Validadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{minhasVendas.total_validadas}</div>
              <p className="text-xs text-muted-foreground">
                Vendas confirmadas pelo gestor
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendasConcretizadas;
