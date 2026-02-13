import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/components/DashboardEvento.css';

const DashboardEvento = () => {
  const [dadosGerais, setDadosGerais] = useState(null);
  const [dadosRegionais, setDadosRegionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // Carregar dados gerais
        const responseGeral = await axios.get('http://localhost:8000/api/dashboard/geral/');
        setDadosGerais(responseGeral.data);
        
        // Carregar dados por regional
        const responseRegionais = await axios.get('http://localhost:8000/api/dashboard/regional/');
        setDadosRegionais(responseRegionais.data);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setErro('Erro ao carregar dados da dashboard');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(carregarDados, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getCorDesempenho = (percentual) => {
    if (percentual >= 100) return '#22c55e'; // verde
    if (percentual >= 80) return '#eab308'; // amarelo
    return '#ef4444'; // vermelho
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '24px',
        backgroundColor: '#0f172a',
        color: '#fff'
      }}>
        Carregando dashboard...
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '24px',
        backgroundColor: '#0f172a',
        color: '#ef4444'
      }}>
        {erro}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Cabeçalho */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        borderBottom: '2px solid #334155',
        paddingBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '48px',
          margin: '0',
          color: '#60a5fa',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          🏆 Dashboard de Vendas
        </h1>
        <p style={{
          fontSize: '20px',
          margin: '10px 0 0 0',
          color: '#94a3b8'
        }}>
          Evento de Aceleração de Vendas
        </p>
        <p style={{
          fontSize: '16px',
          margin: '5px 0 0 0',
          color: '#64748b'
        }}>
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Cards Principais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '18px' }}>
            💰 Faturamento Previsto
          </h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#60a5fa' }}>
            {formatarMoeda(dadosGerais?.faturamento_total_previsto || 0)}
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '18px' }}>
            💵 Faturamento Realizado
          </h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
            {formatarMoeda(dadosGerais?.faturamento_total_realizado || 0)}
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '18px' }}>
            📈 Desempenho
          </h3>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: getCorDesempenho(dadosGerais?.desempenho_faturamento || 0)
          }}>
            {dadosGerais?.desempenho_faturamento?.toFixed(1) || 0}%
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '18px' }}>
            🎯 Taxa de Conversão
          </h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>
            {dadosGerais?.taxa_conversao?.toFixed(1) || 0}%
          </div>
        </div>
      </div>

      {/* Tabela de Regionais */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        border: '2px solid #334155'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          color: '#60a5fa',
          fontSize: '28px',
          textAlign: 'center'
        }}>
          📊 Desempenho por Regional
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '16px'
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '15px', textAlign: 'left', color: '#94a3b8' }}>Regional</th>
                <th style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>Previsto</th>
                <th style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>Realizado</th>
                <th style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>Desempenho</th>
                <th style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>Propostas</th>
                <th style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>Conversão</th>
              </tr>
            </thead>
            <tbody>
              {dadosRegionais.map((regional, index) => (
                <tr key={index} style={{ 
                  borderBottom: '1px solid #334155',
                  backgroundColor: index % 2 === 0 ? 'transparent' : '#0f172a'
                }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#e2e8f0' }}>
                    {regional.regional}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>
                    {formatarMoeda(regional.faturamento_previsto)}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right', color: '#22c55e' }}>
                    {formatarMoeda(regional.faturamento_realizado)}
                  </td>
                  <td style={{ 
                    padding: '15px', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: getCorDesempenho(regional.desempenho_faturamento)
                  }}>
                    {regional.desempenho_faturamento.toFixed(1)}%
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right', color: '#94a3b8' }}>
                    {regional.propostas_fechadas} / {regional.propostas_previstas}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right', color: '#a78bfa' }}>
                    {regional.taxa_conversao.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicadores Adicionais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '40px'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8' }}>Total Propostas</h4>
          <div style={{ fontSize: '24px', color: '#60a5fa' }}>
            {dadosGerais?.numero_total_propostas_fechadas || 0} / {dadosGerais?.numero_total_propostas_previstas || 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8' }}>Diferença Faturamento</h4>
          <div style={{ 
            fontSize: '24px', 
            color: (dadosGerais?.diferenca_faturamento || 0) >= 0 ? '#22c55e' : '#ef4444' 
          }}>
            {formatarMoeda(dadosGerais?.diferenca_faturamento || 0)}
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #334155',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#94a3b8' }}>Diferença Propostas</h4>
          <div style={{ 
            fontSize: '24px', 
            color: (dadosGerais?.diferenca_propostas || 0) >= 0 ? '#22c55e' : '#ef4444' 
          }}>
            {dadosGerais?.diferenca_propostas || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEvento;
