#!/usr/bin/env python
"""
Script para criar usuário admin em produção
Execute na VPS: docker-compose exec backend python manage.py shell < create_admin_prod.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append('/app')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

def create_admin():
    print("=== CRIANDO USUÁRIO ADMIN EM PRODUÇÃO ===")
    
    # Remover usuário admin existente se houver
    try:
        existing_admin = User.objects.get(username='aceleradorVMadm')
        print(f"Removendo usuário admin existente: {existing_admin.username}")
        existing_admin.delete()
    except User.DoesNotExist:
        print("Nenhum usuário admin existente para remover")
    
    # Criar novo usuário admin
    admin_user = User.objects.create_user(
        username='aceleradorVMadm',
        email='admin@aceleradorvendas.online',
        password='aceleravendaVM',
        is_staff=True,
        is_superuser=True
    )
    
    print(f"✅ Usuário criado: {admin_user.username}")
    
    # Criar perfil de acesso
    perfil = PerfilAcesso.objects.create(
        usuario=admin_user,
        nivel='administrador',
        ativo=True
    )
    
    print(f"✅ Perfil criado: {perfil.nivel}")
    
    # Verificar criação
    try:
        user_check = User.objects.get(username='aceleradorVMadm')
        perfil_check = user_check.perfil_acesso
        print(f"✅ Verificação OK: {user_check.username} - {perfil_check.nivel}")
        print("✅ Usuário admin pronto para uso em produção!")
    except Exception as e:
        print(f"❌ Erro na verificação: {e}")
    
    print("\n=== CREDENCIAIS DE ACESSO ===")
    print("URL: https://aceleradorvendas.online/login")
    print("Usuário: aceleradorVMadm")
    print("Senha: aceleravendaVM")

if __name__ == '__main__':
    create_admin()
