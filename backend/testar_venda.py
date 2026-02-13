#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso, Proposta
from django.utils import timezone

print("=== VERIFICANDO USUÁRIOS E VENDAS ===")

# 1. Ver usuários e perfis
print("\nUsuários e perfis:")
for user in User.objects.all():
    try:
        perfil = user.perfil_acesso
        print(f"  {user.username} - {perfil.nivel} - Regional: {perfil.regional.nome if perfil.regional else 'N/A'}")
    except:
        print(f"  {user.username} - SEM PERFIL")

# 2. Ver propostas vendidas não validadas
print("\nPropostas vendidas aguardando validação:")
propostas_vendidas = Proposta.objects.filter(
    status='vendida', 
    venda_validada=False
)

if propostas_vendidas.exists():
    for p in propostas_vendidas:
        print(f"  - Proposta #{p.id}: {p.cliente.nome} - R$ {p.valor_venda} - Equipe: {p.equipe.nome}")
else:
    print("  Nenhuma proposta vendida aguardando validação")

# 3. Testar permissão do gestor
print("\nTestando permissões:")
try:
    user_gestor = User.objects.get(username='dandan')  # Supondo que dandan é gestor
    perfil_gestor = user_gestor.perfil_acesso
    print(f"Gestor {user_gestor.username}:")
    print(f"  - Nível: {perfil_gestor.nivel}")
    print(f"  - Pode validar vendas: {perfil_gestor.pode_validar_vendas()}")
    print(f"  - Regional: {perfil_gestor.regional.nome if perfil_gestor.regional else 'N/A'}")
except User.DoesNotExist:
    print("Usuário 'dandan' não encontrado")
except Exception as e:
    print(f"Erro ao verificar gestor: {e}")

print("\n=== TESTE CONCLUÍDO ===")
