import React, { useState, useEffect } from 'react';
import Card from './Card/Card';
import Button from './Button/Button';
import Input from './Input/Input';
import Label from './Label/Label';
import Badge from './Badge/Badge';
import { AlertCircle, Plus, Users, Trash2, Eye, EyeOff } from 'lucide-react';

const TeamManagement = ({ token, initialShowForm = false }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    responsavel: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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

      setTeams(teamsData);
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
        responsavel: formData.responsavel
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
      setFormData({ nome: '', codigo: '', responsavel: '' });
      setShowForm(false);
      fetchData();
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
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
          Crie e gerencie equipes do sistema
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
                  <Label htmlFor="responsavel">Nome do Responsável da Equipe</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    placeholder="Ex: João Silva"
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
                      Senha: {team.codigo || 'N/A'}
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                      Responsável: {team.responsavel || 'N/A'}
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
