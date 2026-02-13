#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import ConfiguracaoPontuacao, RegraBonus

def inicializar_sistema():
    print("🚀 Inicializando configurações do sistema...")
    
    # Criar configuração de pontuação
    config = ConfiguracaoPontuacao.get_configuracao()
    print(f"✅ Configuração de pontuação criada/atualizada:")
    print(f"   - Pontos por proposta validada: {config.pontos_proposta_validada}")
    print(f"   - Pontos por produto vendido: {config.pontos_por_produto}")
    
    # Criar algumas regras de bônus de exemplo
    regras_bonus = [
        {
            'nome': 'Primeira Venda',
            'descricao': 'Bônus pela primeira venda da equipe',
            'pontos': 50
        },
        {
            'nome': 'Meta de Vendas',
            'descricao': 'Bônus por atingir meta de vendas',
            'pontos': 100
        },
        {
            'nome': 'Venda Premium',
            'descricao': 'Bônus por venda de alto valor',
            'pontos': 25
        }
    ]
    
    for regra_data in regras_bonus:
        regra, created = RegraBonus.objects.get_or_create(
            nome=regra_data['nome'],
            defaults=regra_data
        )
        if created:
            print(f"✅ Regra de bônus criada: {regra.nome} (+{regra.pontos} pts)")
        else:
            print(f"📋 Regra de bônus já existe: {regra.nome}")
    
    print("\n🎉 Sistema inicializado com sucesso!")
    print("\n📊 Resumo das configurações:")
    print(f"💰 Propostas validadas: {config.pontos_proposta_validada} pts cada")
    print(f"📦 Produtos vendidos: {config.pontos_por_produto} pts cada")
    print(f"🏆 Regras de bônus disponíveis: {RegraBonus.objects.filter(ativa=True).count()}")

if __name__ == '__main__':
    inicializar_sistema()
