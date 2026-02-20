import { API_URL } from '../api_config';
import React, { useState, useEffect } from 'react';
import Card from './Card/Card';
import Button from './Button/Button';
import Badge from './Badge/Badge';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

const StatusControl = ({ token }) => {
    const [statusAtual, setStatusAtual] = useState('pre_workshop');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    const statusOptions = [
        { value: 'pre_workshop', label: 'Pré-Workshop', color: 'blue', icon: Clock, description: 'Fase de preparação e organização' },
        { value: 'workshop', label: 'Workshop', color: 'green', icon: CheckCircle, description: 'Equipes enviam propostas' },
        { value: 'pos_workshop', label: 'Pós-Workshop', color: 'yellow', icon: AlertTriangle, description: 'Marcação de vendas' },
        { value: 'encerrado', label: 'Encerrado', color: 'red', icon: XCircle, description: 'Sistema finalizado' }
    ];

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/admin/status_sistema/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Erro ao buscar status');
            const data = await response.json();
            setStatusAtual(data.status_atual);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (novoStatus) => {
        if (novoStatus === statusAtual) return;

        const statusOption = statusOptions.find(opt => opt.value === novoStatus);
        const confirmMessage = `Tem certeza que deseja alterar o status do sistema para "${statusOption.label}"?\n\n${statusOption.description}`;

        if (!window.confirm(confirmMessage)) return;

        try {
            setUpdating(true);
            const response = await fetch(`${API_URL}/admin/status_sistema/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status_atual: novoStatus })
            });

            if (!response.ok) throw new Error('Erro ao atualizar status');
            const data = await response.json();
            setStatusAtual(data.status_atual);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status) => {
        const option = statusOptions.find(opt => opt.value === status);
        return option ? option.color : 'gray';
    };

    const getStatusIcon = (status) => {
        const option = statusOptions.find(opt => opt.value === status);
        const Icon = option ? option.icon : Clock;
        return <Icon className="h-4 w-4" />;
    };

    if (loading) {
        return (
            <Card>
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ textAlign: 'center' }}>Carregando status...</div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    {getStatusIcon(statusAtual)}
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Status do Sistema</h2>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                    Controlado pelo ADMIN - define o comportamento de todo o sistema
                </p>

                {error && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0.375rem'
                    }}>
                        <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* Status Atual */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        backgroundColor: '#f9fafb'
                    }}>
                        <div>
                            <h3 style={{ fontWeight: 500, fontSize: '1.125rem', margin: '0 0 0.5rem 0' }}>
                                {statusOptions.find(opt => opt.value === statusAtual)?.label}
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                {statusOptions.find(opt => opt.value === statusAtual)?.description}
                            </p>
                        </div>
                        <Badge variant="primary">
                            ATUAL
                        </Badge>
                    </div>
                </div>

                {/* Opções de Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>
                        ALTERAR STATUS:
                    </h4>
                    {statusOptions.map((option) => {
                        const isActive = option.value === statusAtual;
                        const Icon = option.icon;

                        return (
                            <div
                                key={option.value}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    border: `1px solid ${isActive ? '#ea580c' : '#e5e7eb'}`,
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActive ? '#fff7ed' : 'white',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Icon size={16} style={{ color: isActive ? '#ea580c' : '#6b7280' }} />
                                    <div>
                                        <h5 style={{ fontWeight: 500, margin: '0 0 0.25rem 0' }}>{option.label}</h5>
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{option.description}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => updateStatus(option.value)}
                                    disabled={isActive || updating}
                                    variant={isActive ? "primary" : "outline"}
                                    size="sm"
                                >
                                    {isActive ? 'Ativo' : updating ? '...' : 'Selecionar'}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Informações Importantes */}
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#eff6ff',
                    borderRadius: '0.5rem'
                }}>
                    <h4 style={{ fontWeight: 500, color: '#1e40af', marginBottom: '0.5rem' }}>
                        ℹ️ Importante:
                    </h4>
                    <ul style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, paddingLeft: '1rem' }}>
                        <li style={{ marginBottom: '0.25rem' }}>• Apenas o ADMIN pode alterar o status</li>
                        <li style={{ marginBottom: '0.25rem' }}>• Nenhuma informação é apagada ao mudar</li>
                        <li style={{ marginBottom: '0.25rem' }}>• O status controla o comportamento do sistema</li>
                        <li>• Cada perfil tem permissões diferentes por status</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default StatusControl;
