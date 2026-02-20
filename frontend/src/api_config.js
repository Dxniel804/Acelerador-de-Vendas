const getApiBaseUrl = () => {
    // 1. Prioridade para variáveis de ambiente (Docker)
    if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
        return process.env.REACT_APP_API_URL;
    }

    // 2. Detecção automática baseada no host atual
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.match(/^[0-9.]+$/)) {
            return 'https://api.aceleradorvendas.online';
        }
    }

    // 3. Fallback para desenvolvimento local
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
// Note: Verifique se o seu backend Django tem o prefixo /api/ nas urls.py
export const API_URL = `${API_BASE_URL}/api`;
