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
  RefreshCw
} from 'lucide-react';
import '../styles/ValidarVendas.css';

const ValidarVendas = () => {
  const [vendasPendentes, setVendasPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [acao, setAcao] = useState(''); // 'validar' ou 'rejeitar'

  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    // Verificar usuário logado
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');
    
    console.log('DEBUG: Token no localStorage:', token);
    console.log('DEBUG: User no sessionStorage:', userStr);
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('DEBUG: Usuário logado:', user);
        console.log('DEBUG: Nível do usuário:', user.nivel);
      } catch (e) {
        console.log('DEBUG: Erro ao parsear user:', e);
      }
    }
    
    carregarVendasPendentes();
  }, []);

  const carregarVendasPendentes = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      
      console.log('DEBUG: Token encontrado:', token ? 'SIM' : 'NÃO');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch(`${API_BASE}/gestor/validar-vendas/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('DEBUG: Response status:', response.status);
      console.log('DEBUG: Response ok:', response.ok);

      if (response.status === 403) {
        setError('Funcionalidade disponível apenas no status Pós-Workshop');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        console.log('DEBUG: Response não ok, texto:', await response.text());
        throw new Error('Erro ao carregar vendas pendentes');
      }

      const data = await response.json();
      console.log('DEBUG: Dados recebidos:', data);
      setVendasPendentes(data);
      setError('');

    } catch (err) {
      console.log('DEBUG: Erro no catch:', err);
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

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/gestor/validar-vendas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposta_id: vendaSelecionada.id,
          acao: acao,
          motivo: motivoRejeicao
        })
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

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(''), 3000);

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

  const abrirPDF = (url) => {
    if (!url) return;
    const pdfUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
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
      <div className="header">
        <h2>🔍 Validar Vendas Concretizadas</h2>
        <p>Analise e valide as vendas marcadas pelas equipes</p>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSuccess('');
              carregarVendasPendentes();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
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
                    Venda #{venda.id} - {venda.cliente_nome}
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
                      <span>{venda.cliente_nome}</span>
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
                      <Label>Regional</Label>
                      <span>-</span>
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
                      <Label>Data da Venda</Label>
                      <span>{formatarData(venda.data_venda)}</span>
                    </div>
                    <div className="detail-item">
                      <Label>Data de Envio da Proposta</Label>
                      <span>{formatarData(venda.data_envio)}</span>
                    </div>
                  </div>

                  {venda.arquivo_pdf && (
                    <div className="venda-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
                      <Button
                        variant="outline"
                        onClick={() => abrirPDF(venda.arquivo_pdf)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver PDF
                      </Button>
                    </div>
                  )}
                  
                  {venda.descricao && (
                    <div className="descricao-section">
                      <Label>Descrição da Proposta</Label>
                      <p>{venda.descricao}</p>
                    </div>
                  )}
                </div>

                <div className="venda-actions">
                  <Button
                    onClick={() => abrirModalValidacao(venda, 'validar')}
                    className="btn-validar"
                  >
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
                  <>
                    <CheckCircle className="text-green-600" />
                    Validar Venda
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-600" />
                    Rejeitar Venda
                  </>
                )}
              </h3>
            </div>

            <div className="modal-content">
              <div className="venda-resumo">
                <h4>Resumo da Venda</h4>
                <div className="resumo-grid">
                  <div>
                    <Label>Cliente</Label>
                    <span>{vendaSelecionada.cliente?.nome}</span>
                  </div>
                  <div>
                    <Label>Equipe</Label>
                    <span>{vendaSelecionada.equipe?.nome}</span>
                  </div>
                  <div>
                    <Label>Valor da Proposta</Label>
                    <span>{formatarValor(vendaSelecionada.valor_proposta)}</span>
                  </div>
                  <div>
                    <Label>Valor da Venda</Label>
                    <span>{formatarValor(vendaSelecionada.valor_venda)}</span>
                  </div>
                </div>
              </div>

              {acao === 'rejeitar' && (
                <div className="motivo-section">
                  <Label htmlFor="motivo">Motivo da Rejeição *</Label>
                  <Textarea
                    id="motivo"
                    value={motivoRejeicao}
                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                    placeholder="Descreva o motivo da rejeição..."
                    rows={4}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={processarValidacao}
                  className={acao === 'validar' ? 'btn-confirmar-validar' : 'btn-confirmar-rejeitar'}
                  disabled={acao === 'rejeitar' && !motivoRejeicao.trim()}
                >
                  {acao === 'validar' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Validação
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirmar Rejeição
                    </>
                  )}
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
