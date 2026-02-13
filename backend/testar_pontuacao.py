#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import ConfiguracaoPontuacao, Proposta, Equipe
from api.views import calcular_pontos_proposta

def testar_pontuacao():
    print('=== TESTE DE PONTUAÇÃO ===')
    
    # Configurar regras de teste
    config = ConfiguracaoPontuacao.get_configuracao()
    config.pontos_proposta_validada = 5
    config.pontos_por_produto = 2
    config.save()
    
    print(f'Configuração:')
    print(f'  - Pontos por proposta validada: {config.pontos_proposta_validada}')
    print(f'  - Pontos por produto: {config.pontos_por_produto}')
    print()
    
    # Verificar propostas existentes
    propostas = Proposta.objects.filter(status__in=['validada', 'vendida'])
    print(f'Propostas validadas: {propostas.count()}')
    print()
    
    for proposta in propostas:
        print(f'Proposta {proposta.id}:')
        print(f'  - Equipe: {proposta.equipe.nome if proposta.equipe else "Nenhuma"}')
        print(f'  - Status: {proposta.status}')
        print(f'  - Quantidade produtos: {proposta.quantidade_produtos}')
        
        # Calcular pontos
        pontos = calcular_pontos_proposta(proposta)
        pontos_esperados = config.pontos_proposta_validada + (proposta.quantidade_produtos * config.pontos_por_produto)
        
        print(f'  - Pontos calculados: {pontos}')
        print(f'  - Pontos esperados: {pontos_esperados}')
        print(f'  - Cálculo: {config.pontos_proposta_validada} + ({proposta.quantidade_produtos} × {config.pontos_por_produto}) = {pontos_esperados}')
        
        if pontos == pontos_esperados:
            print(f'  ✅ CORRETO')
        else:
            print(f'  ❌ ERRO')
        print()
    
    print('=== FIM DO TESTE ===')

if __name__ == '__main__':
    testar_pontuacao()
