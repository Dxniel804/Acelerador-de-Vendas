#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import StatusSistema
from django.contrib.auth.models import User

# Criar status do sistema se não existir
if not StatusSistema.objects.exists():
    admin_user = User.objects.get(username='admin')
    StatusSistema.objects.create(
        status_atual='pre_workshop',
        alterado_por=admin_user
    )
    print('✅ Status do sistema criado: pre_workshop')
else:
    status = StatusSistema.objects.first()
    print(f'ℹ️  Status do sistema já existe: {status.status_atual} - {status.get_status_atual_display()}')
