from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vendedores', views.VendedorViewSet)
router.register(r'clientes', views.ClienteViewSet)
router.register(r'workshops', views.WorkshopViewSet)
router.register(r'previsoes', views.PrevisaoWorkshopViewSet)
router.register(r'resultados', views.ResultadoPosWorkshopViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/geral/', views.dashboard_geral, name='dashboard_geral'),
    path('dashboard/vendedor/', views.dashboard_vendedor, name='dashboard_vendedor'),
    path('dashboard/vendedor/<int:vendedor_id>/', views.dashboard_vendedor, name='dashboard_vendedor_especifico'),
    path('comparativo/workshop/<int:workshop_id>/', views.comparativo_workshop, name='comparativo_workshop'),
    
    # URLs de gestão
    path('auth/login/', views.login_view, name='login'),
    path('auth/login_equipe/', views.login_equipe, name='login_equipe'),
    path('auth/selecionar_equipe/', views.selecionar_equipe, name='selecionar_equipe'),
    path('auth/equipes_disponiveis/', views.listar_equipes_disponiveis, name='listar_equipes_disponiveis'),
    path('auth/meu_perfil/', views.meu_perfil, name='meu_perfil'),
    path('admin/equipes/', views.gerenciar_equipes, name='gerenciar_equipes'),
    path('admin/usuarios/', views.gerenciar_usuarios, name='gerenciar_usuarios'),
    path('admin/status_sistema/', views.gerenciar_status_sistema, name='gerenciar_status_sistema'),
    path('admin/regras_pontuacao/', views.gerenciar_regras_pontuacao, name='gerenciar_regras_pontuacao'),
    
    # URLs de propostas e ranking
    path('propostas/', views.gerenciar_propostas, name='gerenciar_propostas'),
    path('propostas/<int:proposta_id>/validar/', views.validar_proposta, name='validar_proposta'),
    path('propostas/<int:proposta_id>/marcar_venda/', views.marcar_venda, name='marcar_venda'),
    path('propostas/<int:proposta_id>/validar_venda/', views.validar_venda, name='validar_venda'),
    path('propostas/<int:proposta_id>/registrar_venda_pre_workshop/', views.registrar_venda_pre_workshop, name='registrar_venda_pre_workshop'),
    path('vendas/para_validar/', views.vendas_para_validar, name='vendas_para_validar'),
    path('vendas/<int:venda_id>/validar_pre_workshop/', views.validar_venda_pre_workshop, name='validar_venda_pre_workshop'),
    path('ranking/', views.ranking_view, name='ranking'),
    
    # URLs específicas da banca
    path('banca/dashboard/', views.dashboard_banca, name='dashboard_banca'),
    path('banca/ranking/', views.ranking_banca, name='ranking_banca'),
    path('banca/regra-proposta-validada/', views.regra_proposta_validada_api, name='regra_proposta_validada_api'),
    path('banca/regra-venda-produto/', views.regra_venda_produto_api, name='regra_venda_produto_api'),
    
    # URLs específicas do gestor
    path('gestor/dashboard/', views.dashboard_gestor, name='dashboard_gestor'),
    path('gestor/equipes/', views.listar_equipes_gestor, name='listar_equipes_gestor'),
    path('gestor/propostas/', views.listar_propostas_gestor, name='listar_propostas_gestor'),
    path('gestor/propostas/<int:proposta_id>/', views.detalhar_proposta_gestor, name='detalhar_proposta_gestor'),
    path('gestor/propostas/<int:proposta_id>/validar/', views.validar_proposta_gestor, name='validar_proposta_gestor'),
    path('gestor/vendas/<int:venda_id>/validar/', views.validar_venda_gestor, name='validar_venda_gestor'),
    
    # URLs para equipes corrigirem propostas
    path('propostas/<int:proposta_id>/reenviar/', views.reenviar_proposta, name='reenviar_proposta'),
    path('propostas/<int:proposta_id>/apagar/', views.apagar_proposta, name='apagar_proposta'),
    
    # URLs específicas para equipes
    path('equipe/dashboard/', views.dashboard_equipe, name='dashboard_equipe'),
    path('equipe/propostas/', views.propostas_equipe, name='propostas_equipe'),
    path('equipe/vendas/', views.vendas_api, name='vendas_api'),
    path('equipe/vendas/<int:pk>/', views.venda_detail_api, name='venda_detail_api'),
    path('equipe/propostas-validadas/', views.propostas_validadas_api, name='propostas_validadas_api'),
    
    # URLs para vendas concretizadas (pós-workshop)
    path('equipe/vendas-concretizadas/', views.vendas_concretizadas, name='vendas_concretizadas'),
    path('equipe/todas-propostas/', views.todas_propostas_equipe, name='todas_propostas_equipe'),
    path('equipe/minhas-vendas-concretizadas/', views.minhas_vendas_concretizadas, name='minhas_vendas_concretizadas'),
    path('gestor/validar-vendas/', views.validar_vendas, name='validar_vendas'),
    
    # APIs para configuração de pontuação
    path('configuracao-pontuacao/', views.configuracao_pontuacao_api, name='configuracao_pontuacao_api'),
]