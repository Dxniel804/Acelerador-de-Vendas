#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Proposta

def verificar_propostas():
    print("🔍 Verificando propostas...")
    
    propostas = Proposta.objects.all()
    print(f"📋 Total de propostas: {propostas.count()}")
    
    for proposta in propostas:
        print(f"\n📄 Proposta #{proposta.id}")
        print(f"   📊 Status: {proposta.status}")
        print(f"   👥 Equipe: {proposta.equipe.nome}")
        print(f"   💰 Valor: R$ {proposta.valor_proposta}")
        print(f"   📦 Produtos: {proposta.quantidade_produtos}")
        print(f"   📅 Data: {proposta.data_envio}")
        
        # Verificar se já tem venda
        if hasattr(proposta, 'venda'):
            print(f"   💳 Venda: Sim (#{proposta.venda.id})")
        else:
            print(f"   💳 Venda: Não")

if __name__ == '__main__':
    verificar_propostas()
