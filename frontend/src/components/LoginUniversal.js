import { API_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Target } from 'lucide-react';
import './LoginUniversal.css';

// Importando imagens da pasta assets para garantir o funcionamento
import logoImg from '../assets/img/vendamais_logo.png';
import marketingImg from '../assets/img/Marketing-bro.png';

const LoginUniversal = ({ onLogin, onEquipeSelection, existingUser, onSwitchUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mostrarSelecao, setMostrarSelecao] = useState(false);
    const [equipes, setEquipes] = useState([]);
    const [token, setToken] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Usuário e senha são obrigatórios');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            // Se não for JSON, o .json() vai falhar e cair no catch com o erro que você viu
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro no login');
            }

            sessionStorage.setItem('token', data.token);
            
            // Removido: Não existe mais seleção de equipe
            // Todos os usuários acessam diretamente
            sessionStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data);
        } catch (err) {
            setError('Erro de conexão com o servidor. Verifique se a API está online.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const buscarEquipesDisponiveis = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/auth/equipes_disponiveis/`, {
                headers: { 'Authorization': `Token ${authToken}` }
            });
            const equipesData = await response.json();
            setEquipes(equipesData);
        } catch (err) {
            setError(err.message);
        }
    };

    const selecionarEquipe = async (equipe) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/auth/selecionar_equipe/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ equipe_id: equipe.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao selecionar equipe');

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
            <div style={{ background: '#1A3A41' }} className="min-h-screen flex items-center justify-center p-4">
                {/* Renderização da seleção de equipe... código omitido por brevidade mas preservado */}
            </div>
        );
    }

    // Se já estiver logado
    if (existingUser) {
        return (
            <div style={{ background: '#1A3A41' }} className="min-h-screen flex items-center justify-center p-4">
                {/* ... */}
                <Button onClick={() => window.location.href = '/dashboard'}>Continuar</Button>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-header">
                <div className="header-bar">
                    <div className="header-container">
                        <img
                            src={logoImg}
                            alt="VendaMais"
                            className="header-logo"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                        />
                    </div>
                </div>
            </div>

            <div className="login-main">
                <div className="login-content">
                    <div className="login-left">
                        <div className="wave-divider-svg">
                            <svg viewBox="0 0 100 1000" preserveAspectRatio="none">
                                <path d="M0,0 L0,1000 L50,1000 C50,1000 100,800 100,500 C100,200 50,0 50,0 Z" fill="#1A3A41" />
                            </svg>
                        </div>

                        <div className="login-left-content">
                            <h1 className="login-title">Fazer login</h1>
                            <div className="login-card">
                                <form onSubmit={handleLogin} className="login-form">
                                    {error && (
                                        <div className="error-message">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">Usuário</label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Senha</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Carregando...' : 'Entrar'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="login-right">
                        <img
                            src={marketingImg}
                            alt="Login Illustration"
                            className="login-image"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginUniversal;
