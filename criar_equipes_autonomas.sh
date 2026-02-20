#!/bin/bash
echo "=== CRIANDO EQUIPES AUTÔNOMAS COM SENHAS DIFERENTES ==="

docker-compose exec backend python manage.py shell << 'PYTHON'
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

print("\n=== CRIANDO EQUIPES AUTÔNOMAS ===")
equipes_config = [
    {'username': 'equipe1', 'senha': 'team2024alpha', 'nome': 'Equipe Alpha'},
    {'username': 'equipe2', 'senha': 'beta2024force', 'nome': 'Equipe Beta'},
    {'username': 'equipe3', 'senha': 'gamma2024power', 'nome': 'Equipe Gamma'},
    {'username': 'equipe4', 'senha': 'delta2024storm', 'nome': 'Equipe Delta'},
    {'username': 'equipe5', 'senha': 'epsilon2024wave', 'nome': 'Equipe Epsilon'},
    {'username': 'equipe6', 'senha': 'zeta2024flash', 'nome': 'Equipe Zeta'},
    {'username': 'equipe7', 'senha': 'eta2024bolt', 'nome': 'Equipe Eta'},
    {'username': 'equipe8', 'senha': 'theta2024spark', 'nome': 'Equipe Theta'},
]

for config in equipes_config:
    equipe_user = User.objects.create_user(
        username=config['username'],
        email=f'{config['username']}@aceleradorvendas.online',
        password=config['senha'],
        is_staff=False,
        is_superuser=False
    )
    
    # Cada equipe é uma entidade autônoma - não precisa de equipe associada
    perfil_equipe = PerfilAcesso.objects.create(
        usuario=equipe_user,
        nivel='equipe',
        ativo=True,
        equipe=None  # Explicitamente None para garantir autonomia
    )
    
    print(f"✅ {config['nome']} criada:")
    print(f"   Usuário: {config['username']}")
    print(f"   Senha: {config['senha']}")
    print(f"   Entidade: Autônoma (sem associação)")

print("\n=== RESUMO DAS CREDENCIAIS ===")
print("🔐 ADMINISTRADOR:")
print("   Usuário: aceleradorVMadm")
print("   Senha: aceleravendaVM")

print("\n👥 EQUIPES AUTÔNOMAS:")
for i, config in enumerate(equipes_config, 1):
    print(f"   {i}. {config['nome']}")
    print(f"      Usuário: {config['username']}")
    print(f"      Senha: {config['senha']}")

print("\n✅ Todas as equipes são entidades autônomas!")
print("🌐 Acesse: https://aceleradorvendas.online/login")
PYTHON

echo "=== CONCLUÍDO ==="
