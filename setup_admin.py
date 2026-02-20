#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

print("=== CONFIGURANDO USUÁRIO ADMIN ===")

# Verificar se usuário existe
try:
    user = User.objects.get(username='aceleradorVMadm')
    print('✓ Usuário aceleradorVMadm encontrado')
    
    # Atualizar senha
    user.set_password('aceleravendaVM')
    user.email = 'admin@acelerador.com'
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print('✓ Senha atualizada para: aceleravendaVM')
    
except User.DoesNotExist:
    print('✓ Criando usuário aceleradorVMadm...')
    user = User.objects.create_user(
        username='aceleradorVMadm',
        password='aceleravendaVM',
        email='admin@acelerador.com',
        is_staff=True,
        is_superuser=True
    )
    print('✓ Usuário criado com sucesso!')

# Verificar/criar perfil
try:
    perfil = PerfilAcesso.objects.get(user=user)
    print('✓ Perfil de acesso encontrado')
except PerfilAcesso.DoesNotExist:
    print('✓ Criando perfil de acesso admin...')
    PerfilAcesso.objects.create(user=user, nivel='admin')
    print('✓ Perfil criado com sucesso!')

print('\n=== CREDENCIAIS DE ACESSO ===')
print('Username: aceleradorVMadm')
print('Password: aceleravendaVM')
print('============================')
print('\n✓ Setup concluído com sucesso!')
