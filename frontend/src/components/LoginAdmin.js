import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Shield, LogIn, AlertCircle, Settings } from 'lucide-react';

const LoginAdmin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      // Salvar informações no localStorage
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Acelerador de Vendas</h1>
          <p className="text-gray-600">Painel Administrativo</p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Settings className="h-5 w-5" />
              Login Administrativo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Nome de Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu nome de usuário"
                  className="mt-2 h-12"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="mt-2 h-12"
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium" disabled={loading}>
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Acesso Restrito</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Apenas administradores autorizados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Acesso */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">Acesso Administrativo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
