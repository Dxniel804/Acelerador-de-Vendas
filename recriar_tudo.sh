#!/bin/bash
echo "=== RECRIANDO ADMIN E EQUIPES ==="

# Comando para executar no container Docker
docker-compose exec backend python manage.py shell << 'EOF'
from django.contrib.auth.models import User
from api.models import PerfilAcesso

print("=== REMOVENDO USUÁRIOS EXISTENTES ===")
# Remove admin existente
try:
    existing_admin = User.objects.get(username='aceleradorVMadm')
    existing_admin.delete()
    print("Admin existente removido")
except:
    print("Nenhum admin existente")

# Remove equipes existentes
for i in range(1, 9):
    try:
        existing_equipe = User.objects.get(username=f'equipe{i}')
        existing_equipe.delete()
        print(f"Equipe{i} removida")
    except:
        pass

print("\n=== CRIANDO ADMIN ===")
admin = User.objects.create_user(
    username='aceleradorVMadm',
    email='admin@aceleradorvendas.online',
    password='aceleravendaVM',
    is_staff=True,
    is_superuser=True
)

perfil_admin = PerfilAcesso.objects.create(
    usuario=admin,
    nivel='administrador',
    ativo=True
)

print(f"✅ Admin criado: {admin.username}")
print(f"✅ Senha: aceleravendaVM")
print(f"✅ Perfil: {perfil_admin.nivel}")

print("\n=== CRIANDO USUÁRIOS DAS EQUIPES ===")
equipes = []
for i in range(1, 9):
    equipe_user = User.objects.create_user(
        username=f'equipe{i}',
        email=f'equipe{i}@aceleradorvendas.online',
        password='equipe123',
        is_staff=False,
        is_superuser=False
    )
    
    perfil_equipe = PerfilAcesso.objects.create(
        usuario=equipe_user,
        nivel='equipe',
        ativo=True
    )
    
    equipes.append({
        'username': f'equipe{i}',
        'senha': 'equipe123',
        'nivel': 'equipe'
    })
    print(f"✅ Equipe{i} criada: equipe{i} / equipe123")

print("\n=== CREDENCIAIS CRIADAS ===")
print("🔐 ADMIN:")
print("   Usuário: aceleradorVMadm")
print("   Senha: aceleravendaVM")
print("   URL: https://aceleradorvendas.online/login")

print("\n👥 EQUIPES:")
for i, equipe in enumerate(equipes, 1):
    print(f"   {i}. Usuário: {equipe['username']} | Senha: {equipe['senha']}")

print("\n✅ Todos os usuários criados com sucesso!")
print("🌐 Acesse: https://aceleradorvendas.online/login")
EOF

echo "=== CONCLUÍDO ==="
