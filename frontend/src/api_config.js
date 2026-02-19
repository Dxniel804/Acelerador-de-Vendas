const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Se estivermos no domínio de produção
        if (hostname === 'aceleradorvendas.online' || hostname === 'www.aceleradorvendas.online') {
            // O backend está na porta 8000 conforme o docker-compose
            return 'https://aceleradorvendas.online:8000';
        }

        // Se estivermos no localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
    }

    // Fallback padrão para produção
    return 'https://aceleradorvendas.online:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
