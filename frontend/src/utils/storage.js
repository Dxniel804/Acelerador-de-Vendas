/**
 * Utilitário para gerenciar autenticação persistente usando localStorage
 * Login persiste mesmo após fechar o navegador
 */

export const storage = {
  // Token
  getToken: () => {
    try {
      // Prioriza localStorage, mas mantém compatibilidade com sessionStorage
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Erro ao salvar token:', err);
    }
  },

  // Usuário
  getUser: () => {
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
      }
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
    }
  },

  // Equipe
  getEquipe: () => {
    try {
      const equipeStr = localStorage.getItem('equipe') || sessionStorage.getItem('equipe');
      return equipeStr ? JSON.parse(equipeStr) : null;
    } catch {
      return null;
    }
  },

  setEquipe: (equipe) => {
    try {
      if (equipe) {
        localStorage.setItem('equipe', JSON.stringify(equipe));
        sessionStorage.setItem('equipe', JSON.stringify(equipe));
      } else {
        localStorage.removeItem('equipe');
        sessionStorage.removeItem('equipe');
      }
    } catch (err) {
      console.error('Erro ao salvar equipe:', err);
    }
  },

  // Limpar tudo
  clear: () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('equipe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('equipe');
    } catch (err) {
      console.error('Erro ao limpar storage:', err);
    }
  },

  // Verificar se está autenticado
  isAuthenticated: () => {
    const token = storage.getToken();
    const user = storage.getUser();
    return !!(token && user);
  }
};
