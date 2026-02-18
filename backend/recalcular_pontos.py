#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Proposta, ConfiguracaoPontuacao, Equipe, StatusSistema, Ranking
from django.db.models import Sum

def recalcular_pontos():
    """Recalcular pontos de todas as propostas"""
    
    print("🔄 Recalculando pontos de todas as propostas...")
    print()
    
    config = ConfiguracaoPontuacao.get_configuracao()
    print(f"📊 Configuração atual (ID: {config.id}):")
    print(f"   - Pontos por proposta validada: {config.pontos_proposta_validada}")
    print(f"   - Pontos por produto: {config.pontos_por_produto}")
    print()
    
    propostas = Proposta.objects.all()
    
    for proposta in propostas:
        pontos_antigos = proposta.pontos
        
        # Recalcular pontos
        if proposta.status == 'validada':
            pontos_proposta = config.pontos_proposta_validada or 0
            pontos_produtos = (proposta.quantidade_produtos or 0) * (config.pontos_por_produto or 0)
            proposta.pontos = pontos_proposta + pontos_produtos
        elif proposta.status == 'vendida':
            # Mantém os pontos da validação
            if proposta.pontos == 0:
                pontos_proposta = config.pontos_proposta_validada or 0
                pontos_produtos = (proposta.quantidade_produtos or 0) * (config.pontos_por_produto or 0)
                proposta.pontos = pontos_proposta + pontos_produtos
        else:
            proposta.pontos = 0
        
        proposta.save(update_fields=['pontos'])
        
        if pontos_antigos != proposta.pontos:
            print(f"✅ Proposta #{proposta.id} ({proposta.equipe.nome}): {pontos_antigos} → {proposta.pontos} pontos")
    
    print()
    print("🏆 Recalculando ranking...")
    
    status_atual = StatusSistema.get_status_atual()
    equipes = Equipe.objects.all()
    
    for equipe in equipes:
        propostas_equipe = Proposta.objects.filter(equipe=equipe)
        
        # Calcular total de pontos
        pontos_totais = propostas_equipe.filter(
            status__in=['validada', 'vendida']
        ).aggregate(total=Sum('pontos'))['total'] or 0
        
        # Estatísticas
        propostas_enviadas = propostas_equipe.count()
        propostas_validadas = propostas_equipe.filter(status='validada').count()
        vendas_concretizadas = propostas_equipe.filter(status='vendida', venda_validada=True).count()
        valor_total_vendas = propostas_equipe.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(total=Sum('valor_venda'))['total'] or 0
        
        # Atualizar ranking
        Ranking.objects.update_or_create(
            equipe=equipe,
            estado_sistema=status_atual,
            defaults={
                'pontos': int(pontos_totais),
                'propostas_enviadas': propostas_enviadas,
                'propostas_validadas': propostas_validadas,
                'vendas_concretizadas': vendas_concretizadas,
                'valor_total_vendas': valor_total_vendas,
            }
        )
        
        print(f"   {equipe.nome}: {pontos_totais} pontos ({propostas_validadas} propostas validadas)")
    
    # Atualizar posições
    rankings = Ranking.objects.filter(estado_sistema=status_atual).order_by('-pontos', '-valor_total_vendas')
    for i, ranking in enumerate(rankings, 1):
        ranking.posicao = i
        ranking.save(update_fields=['posicao'])
    
    print()
    print("✨ Recálculo concluído!")

if __name__ == '__main__':
    recalcular_pontos()
