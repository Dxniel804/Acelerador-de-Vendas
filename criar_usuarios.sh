#!/bin/bash
echo "=== CRIANDO 8 USUÁRIOS PARA EQUIPES ==="

# Comando para executar no container Docker
docker-compose exec backend python manage.py shell << 'EOF'
from django.contrib.auth.models import User
from api.models import PerfilAcesso

print("=== CRIANDO USUÁRIOS DAS EQUIPES ===")

# Lista de usuários para criar
usuarios = [
    {'username': 'equipe1', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe2', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe3', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe4', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe5', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe6', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe7', 'senha': 'equipe123', 'nivel': 'equipe'},
    {'username': 'equipe8', 'senha': 'equipe123', 'nivel': 'equipe'},
]

print("\n=== REMOVENDO USUÁRIOS EXISTENTES ===")
for usuario in usuarios:
    try:
        existing = User.objects.get(username=usuario['username'])
        existing.delete()
        print(f"Usuário {usuario['username']} removido")
    except:
        print(f"Usuário {usuario['username']} não existente")

print("\n=== CRIANDO NOVOS USUÁRIOS ===")
for usuario in usuarios:
    user = User.objects.create_user(
        username=usuario['username'],
        email=f'{usuario['username']}@aceleradorvendas.online',
        password=usuario['senha'],
        is_staff=False,
        is_superuser=False
    )
    
    perfil = PerfilAcesso.objects.create(
        usuario=user,
        nivel=usuario['nivel'],
        ativo=True
    )
    
    print(f"✅ Usuário criado: {usuario['username']} | Senha: {usuario['senha']} | Nível: {usuario['nivel']}")

print("\n=== CREDENCIAIS CRIADAS ===")
print("URL: https://aceleradorvendas.online/login")
print("\nLista de usuários:")
for i, usuario in enumerate(usuarios, 1):
    print(f"{i}. Usuário: {usuario['username']} | Senha: {usuario['senha']}")

print("\n✅ Todos os usuários criados com sucesso!")
EOF

echo "=== CONCLUÍDO ==="
