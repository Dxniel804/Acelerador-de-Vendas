#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

try:
    # Pegar usuário admin existente
    user = User.objects.get(username='admin')
    
    # Atualizar senha para admin123
    user.set_password('admin123')
    user.save()
    
    # Verificar se já tem perfil
    try:
        perfil = user.perfil_acesso
        print(f'ℹ️  Usuário admin já tem perfil: {perfil.nivel}')
    except PerfilAcesso.DoesNotExist:
        # Criar perfil ADMIN
        PerfilAcesso.objects.create(usuario=user, nivel='administrador')
        print('✅ Perfil ADMIN criado para o usuário admin!')
    
    print(f'📝 Username: {user.username}')
    print(f'🎯 Nível: {user.perfil_acesso.nivel}')
    print(f'🔐 Password: admin123 (atualizada)')
    print('\n🌐 Acesse: http://localhost:3000')
    print('🔑 Login com: admin / admin123')
    
except User.DoesNotExist:
    print('❌ Usuário admin não encontrado!')
