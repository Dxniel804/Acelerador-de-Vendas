#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

# Criar usuário admin se não existir
username = 'admin'
password = 'admin'

if not User.objects.filter(username=username).exists():
    user = User.objects.create_user(
        username=username,
        email='admin@gmail.com',
        password=password,
        is_staff=True,
        is_superuser=True
    )
    
    # Criar perfil de acesso ADMIN
    PerfilAcesso.objects.create(
        user=user,
        nivel='ADMIN'
    )
    
    print(f"✅ Usuário ADMIN criado com sucesso!")
    print(f"📝 Username: {username}")
    print(f"🔑 Password: {password}")
    print(f"🎯 Nível: ADMIN")
else:
    print(f"ℹ️  Usuário '{username}' já existe")

print("\n🌐 Acesse seu sistema em: http://localhost:3000")
print("🔐 Use as credenciais acima para fazer login como ADMIN")
