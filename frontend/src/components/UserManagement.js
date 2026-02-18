import React, { useState, useEffect } from 'react';
import Card from './Card/Card';
import Button from './Button/Button';
import Input from './Input/Input';
import Label from './Label/Label';
import Badge from './Badge/Badge';
import { AlertCircle, Plus, Users, Settings, Trash2 } from 'lucide-react';

const UserManagement = ({ token, initialShowForm = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nivel: 'gestor',
    equipe: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const niveis = [
    { value: 'gestor', label: 'Gestor', color: 'blue' },
    { value: 'banca', label: 'Banca', color: 'purple' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setShowForm(initialShowForm);
  }, [initialShowForm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/admin/usuarios/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar usuários');
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/admin/usuarios/?user_id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erro ao remover usuário');
      
      setSuccess('Usuário removido com sucesso!');
      fetchUsers();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        equipe: formData.equipe ? formData.equipe : null,
        email: formData.email ? formData.email : ''
      };

      const response = await fetch('http://localhost:8000/api/admin/usuarios/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar usuário');
      }

      setSuccess('Usuário criado com sucesso!');
      setFormData({
        username: '',
        email: '',
        password: '',
        nivel: 'gestor',
        equipe: ''
      });
      setShowForm(false);
      fetchUsers();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const getNivelColor = (nivel) => {
    const nivelObj = niveis.find(n => n.value === nivel);
    return nivelObj ? nivelObj.color : 'gray';
  };

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>Carregando usuários...</div>
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
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gestão de Usuários</h2>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            variant="primary"
          >
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Novo Usuário
          </Button>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Crie usuários Gestor e Banca para o sistema
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

        {/* Formulário de Novo Usuário */}
        {showForm && (
          <Card style={{ marginBottom: '1.5rem', border: '2px solid #ea580c' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 500, marginBottom: '1rem' }}>Criar Novo Usuário</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="deixe em branco se não tiver"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nivel">Nível de Acesso</Label>
                    <select
                      id="nivel"
                      value={formData.nivel}
                      onChange={(e) => {
                        const nextNivel = e.target.value;
                        setFormData({
                          ...formData,
                          nivel: nextNivel
                        });
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '0.375rem' 
                      }}
                    >
                      {niveis.map(nivel => (
                        <option key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="submit" variant="primary">
                    Criar Usuário
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Lista de Usuários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>
            USUÁRIOS GESTOR/BANCA:
          </h4>
          {users.filter((u) => ['gestor', 'banca'].includes(u.nivel)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <Users size={48} style={{ margin: '0 auto 0.5rem', color: '#d1d5db' }} />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            users
              .filter((u) => ['gestor', 'banca'].includes(u.nivel))
              .map((user) => (
              <div key={user.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0.75rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 500, margin: '0 0 0.25rem 0' }}>{user.username}</h5>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{user.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge variant={user.nivel === 'gestor' ? 'primary' : 'secondary'}>
                    {user.nivel_display || niveis.find(n => n.value === user.nivel)?.label || user.nivel}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteUser(user.id)}
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

export default UserManagement;
