#!/usr/bin/env python
import os
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

print("=== TESTANDO ENDPOINT DE STATUS ===")

# 1. Obter token do admin
try:
    admin_user = User.objects.get(username='admin')
    token, created = Token.objects.get_or_create(user=admin_user)
    print(f"Token do admin: {token.key}")
except User.DoesNotExist:
    print("Usuário admin não encontrado")
    exit()

# 2. Testar endpoint GET
try:
    response = requests.get(
        'http://localhost:8000/api/admin/status_sistema/',
        headers={
            'Authorization': f'Token {token.key}',
            'Content-Type': 'application/json'
        }
    )
    print(f"\nGET Response Status: {response.status_code}")
    print(f"GET Response Data: {response.json()}")
except Exception as e:
    print(f"Erro no GET: {e}")

# 3. Testar endpoint PUT para mudar status
try:
    new_status = 'workshop'
    response = requests.put(
        'http://localhost:8000/api/admin/status_sistema/',
        headers={
            'Authorization': f'Token {token.key}',
            'Content-Type': 'application/json'
        },
        json={'status_atual': new_status}
    )
    print(f"\nPUT Response Status: {response.status_code}")
    print(f"PUT Response Data: {response.json()}")
    
    if response.status_code == 200:
        print(f"✅ Status alterado para {new_status} com sucesso!")
    else:
        print(f"❌ Erro ao alterar status: {response.status_code}")
        
except Exception as e:
    print(f"Erro no PUT: {e}")

print("\n=== TESTE CONCLUÍDO ===")
