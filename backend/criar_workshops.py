#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Regional, Workshop

def criar_workshops():
    print("🏭 Criando workshops para teste...")
    
    regionais = Regional.objects.all()
    print(f"📍 Regionais encontradas: {regionais.count()}")
    
    for regional in regionais:
        # Verificar se já existe workshop
        workshop_existente = Workshop.objects.filter(regional=regional).first()
        if workshop_existente:
            print(f"📋 Workshop já existe para {regional.nome}: {workshop_existente.nome}")
            continue
        
        # Criar workshop
        workshop = Workshop.objects.create(
            nome=f"Workshop {regional.nome}",
            data="2026-02-10",
            regional=regional
        )
        print(f"✅ Workshop criado: {workshop.nome} - {regional.nome}")
    
    print(f"\n📊 Total de workshops: {Workshop.objects.count()}")

if __name__ == '__main__':
    criar_workshops()
