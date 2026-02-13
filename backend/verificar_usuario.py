#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilAcesso

def verificar_usuarios():
    print("🔍 Verificando usuários e permissões...")
    
    usuarios = User.objects.all()
    print(f"\n📋 Total de usuários: {usuarios.count()}")
    
    for usuario in usuarios:
        print(f"\n👤 Usuário: {usuario.username}")
        try:
            perfil = PerfilAcesso.objects.get(usuario=usuario)
            print(f"   🏷️  Nível: {perfil.get_nivel_display()}")
            print(f"   🏢 Regional: {perfil.regional.nome if perfil.regional else 'Nenhuma'}")
            print(f"   👥 Equipe: {perfil.equipe.nome if perfil.equipe else 'Nenhuma'}")
            print(f"   ✅ Ativo: {perfil.ativo}")
            
            # Verificar permissões específicas
            pode_gerenciar = perfil.pode_gerenciar_regras_pontuacao()
            print(f"   🎯 Pode gerenciar regras: {pode_gerenciar}")
            
        except PerfilAcesso.DoesNotExist:
            print("   ❌ Sem perfil de acesso")

if __name__ == '__main__':
    verificar_usuarios()
