import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Users, LogIn, AlertCircle } from 'lucide-react';

const LoginEquipe = ({ onLogin, onEquipeSelection }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipes, setEquipes] = useState([]);
  const [mostrarSelecao, setMostrarSelecao] = useState(false);
  const [token, setToken] = useState('');

  const API_BASE = 'http://localhost:8000/api';

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Usuário e senha são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/auth/login_equipe/`, {
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

      // Se login bem-sucedido e precisa selecionar equipe
      if (data.requires_equipe_selection) {
        setToken(data.token);
        await buscarEquipesDisponiveis(data.token);
        setMostrarSelecao(true);
      } else {
        // Login direto (outros perfis)
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

      // Salvar informações no localStorage
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Users className="h-6 w-6" />
              Selecione sua Equipe
            </CardTitle>
            <p className="text-gray-600">Escolha a equipe que você representa</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipes.map((equipe) => (
                <div
                  key={equipe.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => selecionarEquipe(equipe)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{equipe.nome}</h3>
                    <Badge className="bg-green-100 text-green-800">
                      {equipe.vendedores_count} vendedores
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Código:</span> {equipe.codigo}</div>
                    <div><span className="font-medium">Regional:</span> {equipe.regional_nome}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge className={equipe.ativo ? 'bg-green-100 text-green-800 ml-2' : 'bg-red-100 text-red-800 ml-2'}>
                        {equipe.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  <Button className="w-full mt-3" disabled={loading}>
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      'Selecionar Equipe'
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Login das Equipes</CardTitle>
          <p className="text-gray-600">Acesse com as credenciais da equipe</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite o usuário"
                className="mt-2"
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className="mt-2"
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Use as credenciais fornecidas pela organização</p>
            <p className="mt-1">Após o login, você poderá selecionar sua equipe</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginEquipe;
