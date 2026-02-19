const getApiBaseUrl = () => {
    // 1. Prioridade para a variável de ambiente
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // 2. Comportamento inteligente baseado no onde o site está rodando
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Se estamos acessando pelo domínio real
        if (hostname === 'aceleradorvendas.online' || hostname === 'www.aceleradorvendas.online') {
            // Se o seu backend e frontend rodam no MESMO domínio, as chamadas podem ser relativas
            // Mas para garantir, vamos usar o domínio completo.
            return 'https://aceleradorvendas.online';
        }

        // Se ainda estivermos no localhost
        if (hostname === 'localhost') {
            return 'http://localhost:8000';
        }
    }

    // 3. Fallback para produção (se nada acima bater)
    if (process.env.NODE_ENV === 'production') {
        return 'https://aceleradorvendas.online';
    }

    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
