#!/bin/bash
echo "=== CONFIGURANDO USUÁRIO ADMIN EM PRODUÇÃO ==="

# Comando para executar no container Docker
docker-compose exec backend python manage.py shell << 'EOF'
from django.contrib.auth.models import User
from api.models import PerfilAcesso

print("=== REMOVENDO ADMIN EXISTENTE ===")
try:
    existing = User.objects.get(username='aceleradorVMadm')
    existing.delete()
    print("Admin existente removido")
except:
    print("Nenhum admin existente")

print("\n=== CRIANDO NOVO ADMIN ===")
admin = User.objects.create_user(
    username='aceleradorVMadm',
    email='admin@aceleradorvendas.online',
    password='aceleravendaVM',
    is_staff=True,
    is_superuser=True
)

perfil = PerfilAcesso.objects.create(
    usuario=admin,
    nivel='administrador',
    ativo=True
)

print(f"✅ Admin criado: {admin.username}")
print(f"✅ Perfil: {perfil.nivel}")
print("✅ Sistema pronto para uso!")

print("\n=== CREDENCIAIS ===")
print("URL: https://aceleradorvendas.online/login")
print("Usuário: aceleradorVMadm")
print("Senha: aceleravendaVM")
EOF

echo "=== CONCLUÍDO ==="
