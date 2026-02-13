#!/usr/bin/env python
import os
import django
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Proposta, Venda

def criar_venda_teste():
    print("🧪 Criando venda de teste...")
    
    # Buscar proposta validada sem venda
    proposta = Proposta.objects.filter(status='validada').first()
    if not proposta:
        print("❌ Nenhuma proposta validada encontrada")
        return
    
    print(f"📄 Usando proposta #{proposta.id} - {proposta.equipe.nome}")
    
    # Criar venda
    try:
        venda = Venda.objects.create(
            proposta=proposta,
            quantidade_produtos_vendidos=5,
            valor_total_venda=15000.00,
            data_venda=datetime.now(),
            observacoes="Venda de teste criada via script"
        )
        print(f"✅ Venda criada com sucesso: #{venda.id}")
        print(f"   💰 Valor: R$ {venda.valor_total_venda}")
        print(f"   📦 Produtos: {venda.quantidade_produtos_vendidos}")
        print(f"   📅 Data: {venda.data_venda}")
        
    except Exception as e:
        print(f"❌ Erro ao criar venda: {e}")

if __name__ == '__main__':
    criar_venda_teste()
