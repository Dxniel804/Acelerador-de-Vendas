const getApiBaseUrl = () => {
    // Se estivermos rodando no navegador
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Se NÃO for localhost, assume que é o domínio de produção
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return 'https://aceleradorvendas.online';
        }
    }

    // Fallback para desenvolvimento local
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
