#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import StatusSistema

def verificar_status():
    status = StatusSistema.get_status_atual()
    print(f"📊 Status atual do sistema: {status}")
    
    # Verificar se há algum status salvo
    try:
        status_obj = StatusSistema.objects.first()
        if status_obj:
            print(f"📅 Última alteração: {status_obj.data_alteracao}")
            print(f"👤 Alterado por: {status_obj.alterado_por.username if status_obj.alterado_por else 'Ninguém'}")
        else:
            print("⚠️ Nenhum status encontrado no banco")
    except Exception as e:
        print(f"❌ Erro ao verificar status: {e}")

if __name__ == '__main__':
    verificar_status()
