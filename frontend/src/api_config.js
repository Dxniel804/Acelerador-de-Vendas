const getApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Se estiver em produção mas sem variável, tenta usar o próprio host
    if (process.env.NODE_ENV === 'production') {
        // Caso o backend esteja no mesmo domínio ou precise de lógica extra
        // Por padrão no Railway, cada um tem seu domínio, então a variável é o ideal
        return '';
    }
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
