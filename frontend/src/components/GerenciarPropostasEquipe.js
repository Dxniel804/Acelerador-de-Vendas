import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  FileText, 
  XCircle, 
  Edit, 
  Trash2, 
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

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

  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    fetchPropostas();
  }, []);

  const fetchPropostas = async () => {
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

      const response = await fetch(`${API_BASE}/propostas/`, { headers });
      if (!response.ok) throw new Error('Erro ao buscar propostas');
      const propostasData = await response.json();

      // Filtrar apenas propostas rejeitadas da equipe
      const equipe = JSON.parse(sessionStorage.getItem('equipe') || '{}');
      const propostasRejeitadas = propostasData.filter((p) => {
        if (p.status !== 'rejeitada') return false;
        if (!equipe || (!equipe.id && !equipe.nome)) return true;
        if (p.equipe && equipe.id && p.equipe === equipe.id) return true;
        if (p.equipe_id && equipe.id && p.equipe_id === equipe.id) return true;
        if (p.equipe_nome && equipe.nome && p.equipe_nome === equipe.nome) return true;
        return false;
      });

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
      const token = localStorage.getItem('token');
      
      const formDataToSend = new FormData();
      formDataToSend.append('valor_proposta', formData.valor_proposta);
      formDataToSend.append('descricao', formData.descricao);
      formDataToSend.append('quantidade_produtos', formData.quantidade_produtos);
      
      if (formData.arquivo_pdf) {
        formDataToSend.append('arquivo_pdf', formData.arquivo_pdf);
      }

      const response = await fetch(`${API_BASE}/propostas/${propostaEditando.id}/reenviar/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) throw new Error('Erro ao reenviar proposta');
      
      const result = await response.json();
      
      // Fechar modal e recarregar
      setPropostaEditando(null);
      setFormData({ valor_proposta: '', descricao: '', quantidade_produtos: 0, arquivo_pdf: null });
      fetchPropostas();
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const apagarProposta = async (propostaId) => {
    if (!window.confirm('Tem certeza que deseja apagar esta proposta? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/propostas/${propostaId}/apagar/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao apagar proposta');
      
      fetchPropostas();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadPDF = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Propostas Rejeitadas</h1>
          <p className="text-gray-600">
            Corrija as informações das propostas rejeitadas e reenvie para validação
          </p>
        </div>

        {/* Lista de Propostas Rejeitadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Propostas Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {propostas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma proposta rejeitada encontrada</p>
                <p className="text-sm mt-2">Todas as suas propostas estão validadas ou pendentes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {propostas.map((proposta) => (
                  <div key={proposta.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Proposta #{proposta.id}</h3>
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitada
                          </Badge>
                        </div>
                        
                        {proposta.motivo_rejeicao && (
                          <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">Motivo da rejeição:</span>
                            </div>
                            <p className="text-red-700 text-sm">{proposta.motivo_rejeicao}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Cliente:</span> {proposta.cliente_nome}
                          </div>
                          <div>
                            <span className="font-medium">Valor:</span> R$ {proposta.valor_proposta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            <span className="font-medium">Vendedor:</span> {proposta.vendedor_nome}
                          </div>
                          <div>
                            <span className="font-medium">Produtos:</span> {proposta.quantidade_produtos}
                          </div>
                        </div>
                        
                        {proposta.descricao && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Descrição:</span> {proposta.descricao}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          Rejeitada em: {new Date(proposta.data_validacao).toLocaleDateString('pt-BR')} 
                          por {proposta.validado_por_nome}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {proposta.arquivo_pdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPDF(proposta.arquivo_pdf)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editarProposta(proposta)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Corrigir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => apagarProposta(proposta.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Edição de Proposta */}
        {propostaEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Corrigir Proposta #{propostaEditando.id}</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valor_proposta">Valor da Proposta *</Label>
                      <Input
                        id="valor_proposta"
                        type="number"
                        step="0.01"
                        value={formData.valor_proposta}
                        onChange={(e) => setFormData({...formData, valor_proposta: e.target.value})}
                        placeholder="0,00"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantidade_produtos">Quantidade de Produtos *</Label>
                      <Input
                        id="quantidade_produtos"
                        type="number"
                        value={formData.quantidade_produtos}
                        onChange={(e) => setFormData({...formData, quantidade_produtos: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      placeholder="Descreva os detalhes da proposta..."
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="arquivo_pdf">Novo Arquivo PDF (opcional)</Label>
                    <Input
                      id="arquivo_pdf"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFormData({...formData, arquivo_pdf: e.target.files[0]})}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe em branco para manter o PDF atual
                    </p>
                  </div>

                  {propostaEditando.arquivo_pdf && (
                    <div>
                      <Label>PDF Atual</Label>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => downloadPDF(propostaEditando.arquivo_pdf)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizar PDF atual
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPropostaEditando(null);
                      setFormData({ valor_proposta: '', descricao: '', quantidade_produtos: 0, arquivo_pdf: null });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={reenviarProposta}
                    disabled={salvando || !formData.valor_proposta || formData.quantidade_produtos <= 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {salvando ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Reenviar Proposta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GerenciarPropostasEquipe;
