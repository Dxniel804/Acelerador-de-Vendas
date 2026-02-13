import React, { useState, useEffect } from 'react';
import { dashboardVendedor, getRegionais, getVendedores } from '../api';

const DashboardVendedor = ({ vendedorId, regionalId }) => {
  const [dados, setDados] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [selectedRegional, setSelectedRegional] = useState(regionalId || '');
  const [selectedVendedor, setSelectedVendedor] = useState(vendedorId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [regionaisResponse, vendedoresResponse] = await Promise.all([
          getRegionais(),
          getVendedores()
        ]);
        setRegionais(regionaisResponse.data);
        setVendedores(vendedoresResponse.data);
      } catch (err) {
        console.error('Erro ao carregar filtros:', err);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        const response = await dashboardVendedor(selectedVendedor, selectedRegional);
        setDados(response.data);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do dashboard de vendedores');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [selectedVendedor, selectedRegional]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const vendedoresFiltrados = selectedRegional 
    ? vendedores.filter(v => v.regional === parseInt(selectedRegional))
    : vendedores;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard por Vendedor</h2>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Filtro de Regional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Regional:
            </label>
            <select
              value={selectedRegional}
              onChange={(e) => {
                setSelectedRegional(e.target.value);
                setSelectedVendedor(''); // Limpa vendedor ao mudar regional
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Regionais</option>
              {regionais.map((regional) => (
                <option key={regional.id} value={regional.id}>
                  {regional.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Vendedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Vendedor:
            </label>
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Todos os Vendedores</option>
              {vendedoresFiltrados.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.nome}
                </option>
              ))}
            </select>
          </div>
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
            {dados.map((vendedorData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {vendedorData.vendedor}
                  </h3>
                  <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {vendedorData.regional}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Faturamento Previsto */}
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-blue-600 mb-1">Faturamento Previsto</h4>
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(vendedorData.faturamento_previsto)}
                    </p>
                  </div>

                  {/* Faturamento Realizado */}
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-green-600 mb-1">Faturamento Realizado</h4>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(vendedorData.faturamento_realizado)}
                    </p>
                  </div>

                  {/* Propostas Previstas */}
                  <div className="bg-yellow-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-yellow-600 mb-1">Propostas Previstas</h4>
                    <p className="text-lg font-bold text-yellow-800">
                      {vendedorData.propostas_previstas}
                    </p>
                  </div>

                  {/* Propostas Fechadas */}
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-purple-600 mb-1">Propostas Fechadas</h4>
                    <p className="text-lg font-bold text-purple-800">
                      {vendedorData.propostas_fechadas}
                    </p>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Taxa de Conversão */}
                  <div className="bg-indigo-50 p-3 rounded">
                    <h4 className="text-xs font-medium text-indigo-600 mb-1">Taxa de Conversão</h4>
                    <p className="text-lg font-bold text-indigo-800">
                      {vendedorData.taxa_conversao}%
                    </p>
                  </div>

                  {/* Desempenho de Faturamento */}
                  <div className={`p-3 rounded ${vendedorData.desempenho_faturamento >= 100 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <h4 className={`text-xs font-medium mb-1 ${vendedorData.desempenho_faturamento >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      Desempenho de Faturamento
                    </h4>
                    <p className={`text-lg font-bold ${vendedorData.desempenho_faturamento >= 100 ? 'text-green-800' : 'text-orange-800'}`}>
                      {vendedorData.desempenho_faturamento}%
                    </p>
                  </div>

                  {/* Diferença de Faturamento */}
                  <div className={`p-3 rounded ${vendedorData.diferenca_faturamento >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h4 className={`text-xs font-medium mb-1 ${vendedorData.diferenca_faturamento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Diferença de Faturamento
                    </h4>
                    <p className={`text-lg font-bold ${vendedorData.diferenca_faturamento >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {vendedorData.diferenca_faturamento >= 0 ? '+' : ''}{formatCurrency(vendedorData.diferenca_faturamento)}
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

export default DashboardVendedor;
