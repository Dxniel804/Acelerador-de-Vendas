const getApiBaseUrl = () => {
    // 1. Prioridade total para a variável de ambiente (definida no build)
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // 2. Se estiver em produção (build do Docker/Railway/etc)
    if (process.env.NODE_ENV === 'production') {
        // No Docker local, se o frontend está na 3000 e o backend na 8000
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return 'http://localhost:8000';
        }

        // Em produção real (Railway), se não houver variável, o ideal é usar o próprio domínio
        // mas sem prefixo para que se torne uma chamada relativa.
        // Se o backend estiver em outro domínio, REACT_APP_API_URL PRECISA estar setada.
        return '';
    }

    // 3. Desenvolvimento local (npm start)
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;


