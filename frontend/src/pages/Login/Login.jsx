import React, { useState } from 'react';
import { LogIn, AlertCircle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Badge from '../../components/Badge/Badge';
import Card from '../../components/Card/Card';
import { API_URL } from '../../api_config';

const Login = ({ onLogin, onEquipeSelection, existingUser, onSwitchUser }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarSelecao, setMostrarSelecao] = useState(false);
  const [equipes, setEquipes] = useState([]);
  const [token, setToken] = useState('');

  const API_BASE = API_URL;

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Usuário e senha são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError('');

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('equipe');

      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no login');
      }

      sessionStorage.setItem('token', data.token);

      if (data.requires_equipe_selection) {
        setToken(data.token);
        await buscarEquipesDisponiveis(data.token);
        setMostrarSelecao(true);
      } else {
        sessionStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data);
      }
    } catch (err) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('equipe');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buscarEquipesDisponiveis = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE}/auth/equipes_disponiveis/`, {
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar equipes');
      }

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

      const response = await fetch(`${API_BASE}/auth/selecionar_equipe/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ equipe_id: equipe.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao selecionar equipe');
      }

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('equipe', JSON.stringify(equipe));
      sessionStorage.setItem('user', JSON.stringify({
        username: 'equipe',
        nivel: 'equipe',
        equipe: equipe.nome
      }));

      onEquipeSelection(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mostrarSelecao) {
    return (
      <div className={styles.pageContainer}>
        <Card className={styles.selectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.headerContent}>
              <Target className={styles.headerIcon} />
              <h2 className={styles.headerTitle}>Selecione sua Equipe</h2>
              <p className={styles.headerSubtitle}>Escolha a equipe que você representa</p>
            </div>
          </div>
          <div className={styles.cardContent}>
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.teamsGrid}>
              {equipes.map((equipe) => (
                <div
                  key={equipe.id}
                  className={styles.teamCard}
                  onClick={() => selecionarEquipe(equipe)}
                >
                  <div className={styles.teamHeader}>
                    <h3 className={styles.teamName}>{equipe.nome}</h3>
                    <Badge variant="success" size="small">
                      {equipe.responsavel || 'N/A'}
                    </Badge>
                  </div>
                  <div className={styles.teamInfo}>
                    <div><span className={styles.infoLabel}>Código:</span> {equipe.codigo}</div>
                    <div><span className={styles.infoLabel}>Regional:</span> {equipe.regional_nome}</div>
                    <div>
                      <span className={styles.infoLabel}>Status:</span>
                      <Badge variant={equipe.ativo ? 'success' : 'error'} size="small">
                        {equipe.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    className={styles.selectButton}
                    disabled={loading}
                  >
                    {loading ? 'Carregando...' : 'Selecionar Equipe'}
                  </Button>
                </div>
              ))}
            </div>

            <div className={styles.backButton}>
              <Button
                variant="outline"
                onClick={() => {
                  setMostrarSelecao(false);
                  setUsername('');
                  setPassword('');
                  setError('');
                }}
              >
                Voltar para Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (existingUser) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loginContainer}>
          <div className={styles.loginHeader}>
            <div className={styles.iconContainer}>
              <Target className={styles.mainIcon} />
            </div>
            <h1 className={styles.pageTitle}>Acelerador de Vendas</h1>
            <p className={styles.pageSubtitle}>Você já está logado</p>
          </div>

          <Card className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <div className={styles.headerContent}>
                <LogIn className={styles.headerIcon} />
                <h2 className={styles.headerTitle}>Sessão Ativa</h2>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.userInfo}>
                <div className={styles.userLabel}>Logado como</div>
                <div className={styles.userName}>{existingUser.username}</div>
                <div className={styles.userProfile}>Perfil: {existingUser.nivel?.toUpperCase()}</div>
                {existingUser.equipe && (
                  <div className={styles.userTeam}>Equipe: {existingUser.equipe}</div>
                )}
              </div>

              <Button
                className={styles.continueButton}
                onClick={handleContinue}
              >
                Continuar
              </Button>

              <Button
                variant="outline"
                className={styles.switchButton}
                onClick={onSwitchUser}
              >
                Trocar usuário
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      {/* Header com Logo */}
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerContainer}>
            <img
              src="/img/vendamais_logo.png"
              alt="Venda Mais Logo"
              className={styles.headerLogo}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      </header>

      {/* Fundo Esquerdo */}
      <div className={styles.backgroundLeft}></div>

      {/* Fundo Direito */}
      <div className={styles.backgroundRight}></div>


      {/* Conteúdo Principal */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Lado Esquerdo - Formulário */}
          <div className={styles.leftSide}>
            <h1 className={styles.title}>Fazer login</h1>

            <form onSubmit={handleLogin} className={styles.form}>
              {error && (
                <div className={styles.errorMessage}>
                  <AlertCircle className={styles.errorIcon} />
                  <span>{error}</span>
                </div>
              )}

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome do usuário"
                disabled={loading}
                className={styles.input}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                disabled={loading}
                className={styles.input}
              />

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>

          {/* Lado Direito - Ilustração */}
          <div className={styles.rightSide}>
            <img
              src="/img/Marketing-bro.png"
              alt="Login Illustration"
              className={styles.illustration}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;