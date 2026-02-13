import React, { useState, useEffect } from 'react';
import { dashboardRegional, getRegionais } from '../api';

const DashboardRegional = ({ regionalId }) => {
  const [dados, setDados] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [selectedRegional, setSelectedRegional] = useState(regionalId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRegionais = async () => {
      try {
        const response = await getRegionais();
        setRegionais(response.data);
      } catch (err) {
        console.error('Erro ao carregar regionais:', err);
      }
    };

    fetchRegionais();
  }, []);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        const response = await dashboardRegional(selectedRegional);
        setDados(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do dashboard regional');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [selectedRegional]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard por Regional</h2>
        
        {/* Filtro de Regional */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Regional:
          </label>
          <select
            value={selectedRegional}
            onChange={(e) => setSelectedRegional(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Regionais</option>
            {regionais.map((regional) => (
              <option key={regional.id} value={regional.id}>
                {regional.nome}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Carregando...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {dados.map((regionalData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {regionalData.regional}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Faturamento Previsto */}
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-blue-600 mb-1">Faturamento Previsto</h4>
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(regionalData.faturamento_previsto)}
                    </p>
                  </div>

                  {/* Faturamento Realizado */}
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-green-600 mb-1">Faturamento Realizado</h4>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(regionalData.faturamento_realizado)}
                    </p>
                  </div>

                  {/* Propostas Previstas */}
                  <div className="bg-yellow-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-yellow-600 mb-1">Propostas Previstas</h4>
                    <p className="text-lg font-bold text-yellow-800">
                      {regionalData.propostas_previstas}
                    </p>
                  </div>

                  {/* Propostas Fechadas */}
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-purple-600 mb-1">Propostas Fechadas</h4>
                    <p className="text-lg font-bold text-purple-800">
                      {regionalData.propostas_fechadas}
                    </p>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Taxa de Conversão */}
                  <div className="bg-indigo-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-indigo-600 mb-1">Taxa de Conversão</h4>
                    <p className="text-lg font-bold text-indigo-800">
                      {regionalData.taxa_conversao}%
                    </p>
                  </div>

                  {/* Desempenho de Faturamento */}
                  <div className={`p-3 rounded ${regionalData.desempenho_faturamento >= 100 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <h4 className={`text-xs font-medium mb-1 ${regionalData.desempenho_faturamento >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      Desempenho de Faturamento
                    </h4>
                    <p className={`text-lg font-bold ${regionalData.desempenho_faturamento >= 100 ? 'text-green-800' : 'text-orange-800'}`}>
                      {regionalData.desempenho_faturamento}%
                    </p>
                  </div>

                  {/* Diferença de Faturamento */}
                  <div className={`p-3 rounded ${regionalData.diferenca_faturamento >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h4 className={`text-xs font-medium mb-1 ${regionalData.diferenca_faturamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Diferença de Faturamento
                    </h4>
                    <p className={`text-lg font-bold ${regionalData.diferenca_faturamento >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {regionalData.diferenca_faturamento >= 0 ? '+' : ''}{formatCurrency(regionalData.diferenca_faturamento)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {dados.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardRegional;
