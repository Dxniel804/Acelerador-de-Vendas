const getApiBaseUrl = () => {
    // 1. Prioridade para variáveis de ambiente (Docker/Vercel/etc)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // 2. Fallback para localhost em desenvolvimento local
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000';
    }

    // 3. Fallback de produção
    return 'https://api.aceleradorvendas.online';
};

export const API_BASE_URL = getApiBaseUrl();
// Note: Verifique se o seu backend Django tem o prefixo /api/ nas urls.py
export const API_URL = `${API_BASE_URL}/api`;
