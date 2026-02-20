const getApiBaseUrl = () => {
    // Se estiver rodando localmente, usa localhost
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
    }

    // EM PRODUÇÃO, FORÇA O DOMÍNIO CORRETO SEM PORTA 8000
    return 'https://api.aceleradorvendas.online';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}`;
