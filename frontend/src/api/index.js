import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard endpoints
export const dashboardGeral = () => api.get('/dashboard/geral/');
export const dashboardVendedor = (vendedorId = null) => {
  if (vendedorId) {
    return api.get(`/dashboard/vendedor/${vendedorId}/`);
  }
  return api.get('/dashboard/vendedor/');
};
export const comparativoWorkshop = (workshopId) => api.get(`/comparativo/workshop/${workshopId}/`);

// CRUD endpoints
export const getVendedores = () => api.get('/vendedores/');
export const getClientes = () => api.get('/clientes/');
export const getWorkshops = () => api.get('/workshops/');
export const getPrevisoes = () => api.get('/previsoes/');
export const getResultados = () => api.get('/resultados/');

export const createVendedor = (data) => api.post('/vendedores/', data);
export const createCliente = (data) => api.post('/clientes/', data);
export const createWorkshop = (data) => api.post('/workshops/', data);
export const createPrevisao = (data) => api.post('/previsoes/', data);
export const createResultado = (data) => api.post('/resultados/', data);

export const updateVendedor = (id, data) => api.put(`/vendedores/${id}/`, data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}/`, data);
export const updateWorkshop = (id, data) => api.put(`/workshops/${id}/`, data);
export const updatePrevisao = (id, data) => api.put(`/previsoes/${id}/`, data);
export const updateResultado = (id, data) => api.put(`/resultados/${id}/`, data);

export const deleteVendedor = (id) => api.delete(`/vendedores/${id}/`);
export const deleteCliente = (id) => api.delete(`/clientes/${id}/`);
export const deleteWorkshop = (id) => api.delete(`/workshops/${id}/`);
export const deletePrevisao = (id) => api.delete(`/previsoes/${id}/`);
export const deleteResultado = (id) => api.delete(`/resultados/${id}/`);

export default api;
