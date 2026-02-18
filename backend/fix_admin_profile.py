import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

try:
    user = User.objects.get(username='aceleradorVMadm')
    perfil, created = PerfilAcesso.objects.get_or_create(
        usuario=user,
        defaults={'nivel': 'administrador', 'ativo': True}
    )
    if not created:
        perfil.nivel = 'administrador'
        perfil.ativo = True
        perfil.save()
    print(f"SUCESSO: Perfil de administrador configurado para {user.username}")
except Exception as e:
    print(f"ERRO: {str(e)}")
