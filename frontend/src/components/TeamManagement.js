import React, { useState, useEffect } from 'react';
import Card from './Card/Card';
import Button from './Button/Button';
import Input from './Input/Input';
import Label from './Label/Label';
import Badge from './Badge/Badge';
import { AlertCircle, Plus, Users, Settings, Trash2, Eye, EyeOff } from 'lucide-react';

const TeamManagement = ({ token, initialShowForm = false }) => {
  const [teams, setTeams] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginFormData, setLoginFormData] = useState({
    username: '',
    password: '',
    equipe_id: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setShowForm(initialShowForm);
  }, [initialShowForm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };

      // Buscar equipes
      const teamsResponse = await fetch('http://localhost:8000/api/admin/equipes/', { headers });
      if (!teamsResponse.ok) throw new Error('Erro ao buscar equipes');
      const teamsData = await teamsResponse.json();

      // Buscar regionais
      const regionaisResponse = await fetch('http://localhost:8000/api/regionais/', { headers });
      if (!regionaisResponse.ok) throw new Error('Erro ao buscar regionais');
      const regionaisData = await regionaisResponse.json();

      setTeams(teamsData);
      setRegionais(regionaisData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Tem certeza que deseja remover esta equipe?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/admin/equipes/?equipe_id=${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao remover equipe');
      
      setSuccess('Equipe removida com sucesso!');
      fetchData();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const handleSubmitTeam = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        nome: formData.nome,
        codigo: formData.codigo,
        ...(regionais?.length > 0 && { regional: regionais[0].id })
      };
      const response = await fetch('http://localhost:8000/api/admin/equipes/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar equipe');
      }

      setSuccess('Equipe criada com sucesso!');
      setFormData({ nome: '', codigo: '' });
      setShowForm(false);
      fetchData();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/usuarios/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: loginFormData.username,
          password: loginFormData.password,
          email: `${loginFormData.username}@acelerador.com`,
          nivel: 'equipe',
          equipe: loginFormData.equipe_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar login da equipe');
      }

      setSuccess('Login da equipe criado com sucesso!');
      setLoginFormData({ username: '', password: '', equipe_id: '' });
      setShowLoginForm(false);
      setSelectedTeam(null);
      fetchData();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const openLoginForm = (team) => {
    setSelectedTeam(team);
    setShowLoginForm(true);
    setLoginFormData({
      ...loginFormData,
      equipe_id: team.id,
      username: team.codigo.toLowerCase().replace(/\s+/g, ''),
      password: 'equipe123'
    });
  };

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>Carregando equipes...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gestão de Equipes</h2>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            variant="primary"
          >
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Nova Equipe
          </Button>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Crie equipes e defina seus logins de acesso
        </p>
        {error && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '0.375rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
            <span style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '0.375rem' 
          }}>
            <span style={{ color: '#166534', fontSize: '0.875rem' }}>{success}</span>
          </div>
        )}

        {/* Formulário de Nova Equipe */}
        {showForm && (
          <Card style={{ marginBottom: '1.5rem', border: '2px solid #ea580c' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 500, marginBottom: '1rem' }}>Criar Nova Equipe</h3>
              <form onSubmit={handleSubmitTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <Label htmlFor="nome">Nome da Equipe</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Equipe 1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="codigo">Senha</Label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Input
                      id="codigo"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.codigo}
                      onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                      placeholder="Digite a senha de acesso"
                      required
                      style={{ paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: '#6b7280'
                      }}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="submit" variant="primary">
                    Criar Equipe
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Formulário de Login da Equipe */}
        {showLoginForm && selectedTeam && (
          <Card style={{ marginBottom: '1.5rem', border: '2px solid #16a34a' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 500, marginBottom: '1rem' }}>Criar Login para: {selectedTeam.nome}</h3>
              <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input
                      id="username"
                      value={loginFormData.username}
                      onChange={(e) => setLoginFormData({...loginFormData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginFormData.password}
                      onChange={(e) => setLoginFormData({...loginFormData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="submit" variant="primary">
                    Criar Login
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowLoginForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Lista de Equipes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>
            EQUIPES EXISTENTES:
          </h4>
          {teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <Users size={48} style={{ margin: '0 auto 0.5rem', color: '#d1d5db' }} />
              <p>Nenhuma equipe encontrada</p>
            </div>
          ) : (
            teams.map((team) => (
              <div key={team.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: '#fed7aa', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Users size={20} style={{ color: '#ea580c' }} />
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 500, margin: '0 0 0.25rem 0' }}>{team.nome}</h5>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.125rem 0' }}>
                      Senha: ••••••••
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.125rem 0' }}>
                      Regional: {team.regional_nome}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                      Vendedores: {team.vendedores_count || 0}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge variant={team.ativo ? 'success' : 'danger'}>
                    {team.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openLoginForm(team)}
                  >
                    <Settings size={12} style={{ marginRight: '0.25rem' }} />
                    Login
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteTeam(team.id)}
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};

export default TeamManagement;
