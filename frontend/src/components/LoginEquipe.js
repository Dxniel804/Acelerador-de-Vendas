import { API_URL } from '../api_config';
import React, { useState } from 'react';
import styles from './LoginEquipe.module.css';
import { storage } from '../utils/storage';

const LoginEquipe = ({ onLogin, onEquipeSelection }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipes, setEquipes] = useState([]);
  const [mostrarSelecao, setMostrarSelecao] = useState(false);
  const [token, setToken] = useState('');

  const API_BASE = API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Usuário e senha são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/auth/login_equipe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no login');

      if (data.requires_equipe_selection) {
        setToken(data.token);
        await buscarEquipesDisponiveis(data.token);
        setMostrarSelecao(true);
      } else {
        onLogin(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buscarEquipesDisponiveis = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/equipes_disponiveis/`, {
        headers: { 'Authorization': `Token ${authToken}` }
      });
      if (!response.ok) throw new Error('Erro ao buscar equipes');
      const equipesData = await response.json();
      setEquipes(equipesData);
    } catch (err) {
      setError(err.message);
    }
  };

  const selecionarEquipe = async (equipe) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/auth/selecionar_equipe/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ equipe_id: equipe.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao selecionar equipe');

      // Persistir autenticação de forma consistente
      storage.setToken(token);
      storage.setEquipe(equipe);
      storage.setUser({
        username: 'equipe',
        nivel: 'equipe',
        equipe: equipe.nome
      });

      onEquipeSelection(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mostrarSelecao) {
    return (
      <div className={styles.loginPage}>
        <div className={`${styles.loginCard} ${styles.selectionCard}`}>
          <div className={styles.logoContainer}>
            <img src="/img/vendamais_logo.png" alt="VendaMais" className={styles.logo} />
            <h1 className={styles.title}>Selecione sua Equipe</h1>
            <p className={styles.subtitle}>Escolha o time que você representa hoje</p>
          </div>

          {error && (
            <div className={styles.error}>
              <i className="bi bi-exclamation-circle-fill mr-2"></i>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.equipesGrid}>
            {equipes.map((equipe) => (
              <div
                key={equipe.id}
                className={styles.equipeItem}
                onClick={() => selecionarEquipe(equipe)}
              >
                <h3 className={styles.equipeName}>{equipe.nome}</h3>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
                  Regional: {equipe.regional_nome} | Resp: {equipe.responsavel || 'N/A'}
                </div>
                <button
                  className={styles.submitBtn}
                  style={{ marginTop: 'auto', width: '100%', padding: '0.6rem' }}
                  disabled={loading}
                >
                  {loading ? 'Processando...' : 'Selecionar'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              className={styles.label}
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
              onClick={() => {
                setMostrarSelecao(false);
                setError('');
              }}
            >
              <i className="bi bi-arrow-left mr-1"></i> Voltar para Login
            </button>
          </div>
        </div>

        <div className={styles.wave}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <path fill="#FF5E3A" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <img src="/img/vendamais_logo.png" alt="VendaMais" className={styles.logo} />
          <h1 className={styles.title}>Acelerador</h1>
          <p className={styles.subtitle}>DASHBOARD DA EQUIPE</p>
        </div>

        {error && (
          <div className={styles.error}>
            <i className="bi bi-exclamation-circle-fill mr-2"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Usuário</label>
            <input
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Sua identificação"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Senha</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right mr-2"></i>
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          © 2026 VendaMais. Execute. Pontue. Vende mais.
        </div>
      </div>

      <div className={styles.wave}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <path fill="#FF5E3A" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
    </div>
  );
};

export default LoginEquipe;



