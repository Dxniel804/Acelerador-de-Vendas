import React, { useState, useEffect } from 'react';
import { dashboardGeral } from '../api';

const DashboardGeral = () => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const response = await dashboardGeral();
        setDados(response.data);
      } catch (err) {
        setError('Erro ao carregar dados do dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!dados) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Geral - Acelerador de Vendas</h2>
        
        {dados.nivel_acesso && (
          <div className="mb-4 p-3 bg-blue-100 rounded">
            <span className="text-sm text-blue-800">Nível de acesso: {dados.nivel_acesso}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Faturamento Previsto */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-2">Faturamento Previsto</h3>
            <p className="text-2xl font-bold text-blue-800">
              {formatCurrency(dados.faturamento_total_previsto)}
            </p>
          </div>

          {/* Faturamento Realizado */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-2">Faturamento Realizado</h3>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(dados.faturamento_total_realizado)}
            </p>
          </div>

          {/* Propostas Previstas */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600 mb-2">Propostas Previstas</h3>
            <p className="text-2xl font-bold text-yellow-800">
              {dados.numero_total_propostas_previstas}
            </p>
          </div>

          {/* Propostas Fechadas */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600 mb-2">Propostas Fechadas</h3>
            <p className="text-2xl font-bold text-purple-800">
              {dados.numero_total_propostas_fechadas}
            </p>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Taxa de Conversão */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-indigo-600 mb-2">Taxa de Conversão</h3>
            <p className="text-2xl font-bold text-indigo-800">
              {dados.taxa_conversao}%
            </p>
          </div>

          {/* Desempenho de Faturamento */}
          <div className={`p-4 rounded-lg ${dados.desempenho_faturamento >= 100 ? 'bg-green-50' : 'bg-orange-50'}`}>
            <h3 className={`text-sm font-medium mb-2 ${dados.desempenho_faturamento >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
              Desempenho de Faturamento
            </h3>
            <p className={`text-2xl font-bold ${dados.desempenho_faturamento >= 100 ? 'text-green-800' : 'text-orange-800'}`}>
              {dados.desempenho_faturamento}%
            </p>
          </div>

          {/* Diferença de Faturamento */}
          <div className={`p-4 rounded-lg ${dados.diferenca_faturamento >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <h3 className={`text-sm font-medium mb-2 ${dados.diferenca_faturamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Diferença de Faturamento
            </h3>
            <p className={`text-2xl font-bold ${dados.diferenca_faturamento >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              {dados.diferenca_faturamento >= 0 ? '+' : ''}{formatCurrency(dados.diferenca_faturamento)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGeral;
