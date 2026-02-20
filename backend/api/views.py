import logging
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, generics, status

from rest_framework.decorators import api_view, permission_classes

from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework.response import Response

from django.db.models import Sum, Count, Q, F, FloatField, Value

from django.db.models.functions import Coalesce

from django.contrib.auth.models import User

from django.contrib.auth import authenticate

from django.utils import timezone

from rest_framework.authtoken.models import Token

from .middleware import verificar_status_sistema, verificar_permissao

from .serializers import (

    UserSerializer, VendedorSerializer, ClienteSerializer,

    WorkshopSerializer, PrevisaoWorkshopSerializer, ResultadoPosWorkshopSerializer,

    DashboardGeralSerializer, DashboardVendedorSerializer,

    EquipeSerializer, StatusSistemaSerializer, PerfilAcessoSerializer, LoginSerializer,

    PropostaSerializer, RegraPontuacaoSerializer, 
    ConfiguracaoPontuacaoSerializer, VendaSerializer

)

from .models import Vendedor, Cliente, Workshop, PrevisaoWorkshop, ResultadoPosWorkshop, PerfilAcesso, Equipe, Proposta, RegraPontuacao, Ranking, ConfiguracaoPontuacao, Venda
from .models import StatusSistema


logger = logging.getLogger(__name__)


# Funções auxiliares de pontuação (movidas para o topo para evitar NameError)

def calcular_pontos_proposta(proposta):
    """Calcular pontos de uma proposta baseado nas regras da banca
    - No Workshop: Pontos por proposta validada + (quantidade_produtos × pontos_por_produto)
    - No Pós-Workshop: Pontos por venda validada + (quantidade_produtos_venda × pontos_por_produto)
    """

    from .models import ConfiguracaoPontuacao

    status_atual = StatusSistema.get_status_atual()
    config = ConfiguracaoPontuacao.get_configuracao()
    
    pontos = 0
    
    # LÓGICA POR ESTADO DO SISTEMA
    if status_atual == 'workshop':
        # No Workshop, ganha pontos se a proposta for validada
        if proposta.status == 'validada':
            pontos_proposta = config.pontos_proposta_validada or 0
            pontos_produtos = (proposta.quantidade_produtos or 0) * (config.pontos_por_produto or 0)
            
            # CÁLCULO DE PONTOS BÔNUS
            pontos_bonus = 0
            if proposta.bonus_vinhos_casa_perini_mundo: pontos_bonus += 5
            if proposta.bonus_vinhos_fracao_unica: pontos_bonus += 5
            if proposta.bonus_espumantes_vintage: pontos_bonus += 5
            if proposta.bonus_espumantes_premium: pontos_bonus += 5
            if proposta.bonus_aceleracao: pontos_bonus += 25
            
            pontos = pontos_proposta + pontos_produtos + pontos_bonus
            proposta.pontos_bonus = pontos_bonus
            
            print(f"DEBUG SCORE (Workshop): Prop #{proposta.id} -> {pontos} ({pontos_proposta} + {proposta.quantidade_produtos}x{config.pontos_por_produto} + {pontos_bonus} bonus)")
        elif proposta.status == 'vendida':
            # Se já mudou para vendida mas ainda estamos no status global Workshop (raro), mantém pontos da validação
            pontos = proposta.pontos or 0

    elif status_atual == 'pos_workshop':
        # No Pós-Workshop, ganha pontos APENAS se a venda for validada pelo gestor
        if proposta.status == 'vendida' and proposta.venda_validada:
            pontos_venda = config.pontos_proposta_validada or 0 # Reutiliza a regra de pontuação base
            # USA A QUANTIDADE DE PRODUTOS VENDIDOS informada pela equipe
            pontos_produtos = (proposta.quantidade_produtos_venda or 0) * (config.pontos_por_produto or 0)
            
            # CÁLCULO DE PONTOS BÔNUS (Mesmo bônus que veio do Workshop)
            pontos_bonus = 0
            if proposta.bonus_vinhos_casa_perini_mundo: pontos_bonus += 5
            if proposta.bonus_vinhos_fracao_unica: pontos_bonus += 5
            if proposta.bonus_espumantes_vintage: pontos_bonus += 5
            if proposta.bonus_espumantes_premium: pontos_bonus += 5
            if proposta.bonus_aceleracao: pontos_bonus += 25
            
            pontos = pontos_venda + pontos_produtos + pontos_bonus
            proposta.pontos_bonus = pontos_bonus
            
            print(f"DEBUG SCORE (Pós-Workshop): Prop #{proposta.id} -> {pontos} pontos da VENDA ({pontos_venda} + {proposta.quantidade_produtos_venda}x{config.pontos_por_produto} + {pontos_bonus} bonus)")
        else:
            # Propostas validadas mas não vendidas (ou venda não validada) não contam pontos no ranking do Pós-Workshop
            pontos = 0
            print(f"DEBUG SCORE (Pós-Workshop): Prop #{proposta.id} -> 0 pontos (venda não validada ou proposta apenas validada)")
            
    else:
        # Outros estados do sistema (pre_workshop, encerrado)
        # Segue a lógica de manter o que já foi calculado ou zerar se necessário
        if proposta.status == 'validada' or (proposta.status == 'vendida' and proposta.venda_validada):
            # Tenta manter o cálculo atual
            pontos = proposta.pontos or 0
        else:
            pontos = 0

    # Salvar pontos na proposta
    proposta.pontos = pontos
    proposta.save(update_fields=['pontos', 'pontos_bonus'])
    
    print(f"DEBUG: Proposta {proposta.id} finalizada com {pontos} pontos")
    
    return pontos


def atualizar_ranking_equipe(equipe, status_atual):
    """Atualizar ranking de uma equipe específica"""
    if not equipe:
        return
        
    # Calcular total de pontos da equipe (somando propostas validadas/vendidas)
    propostas_validadas_vendidas = Proposta.objects.filter(
        equipe=equipe,
        status__in=['validada', 'vendida']
    )
    
    total_pontos_equipe = propostas_validadas_vendidas.aggregate(
        total=Coalesce(Sum('pontos'), 0)
    )['total'] or 0
    
    print(f"DEBUG: ========== Atualizando ranking da equipe {equipe.nome} ==========")
    print(f"  - Total de propostas validadas/vendidas: {propostas_validadas_vendidas.count()}")
    
    # Mostrar detalhes de cada proposta
    for prop in propostas_validadas_vendidas:
        print(f"    • Proposta #{prop.id}: {prop.pontos} pontos (status: {prop.status}, produtos: {prop.quantidade_produtos})")
    
    print(f"  - TOTAL PONTOS DA EQUIPE (soma): {total_pontos_equipe}")
    
    # Atualizar ou criar ranking
    ranking, created = Ranking.objects.get_or_create(
        equipe=equipe,
        estado_sistema=status_atual,
        defaults={
            'posicao': 1,
            'pontos': total_pontos_equipe,
            'propostas_enviadas': 0,
            'propostas_validadas': 0,
            'vendas_concretizadas': 0,
            'valor_total_vendas': 0
        }
    )
    
    if not created:
        print(f"  - Pontos ANTIGOS no ranking: {ranking.pontos}")
        ranking.pontos = total_pontos_equipe
        ranking.save()
        print(f"  - Pontos NOVOS no ranking: {ranking.pontos}")
    else:
        print(f"  - Ranking CRIADO com {total_pontos_equipe} pontos")
    
    print(f"DEBUG: ========== Fim atualização equipe {equipe.nome} ==========")
    print()


def atualizar_ranking():
    """Atualizar ranking completo de todas as equipes"""
    from django.db.models import Sum, Count
    
    status_atual = StatusSistema.get_status_atual()
    equipes = Equipe.objects.all()
    
    # Calcular estatísticas para cada equipe
    ranking_calculado = []
    
    for equipe in equipes:
        propostas = Proposta.objects.filter(equipe=equipe)
        
        # Estatísticas básicas
        propostas_enviadas = propostas.count()
        propostas_validadas = propostas.filter(status='validada').count()
        vendas_concretizadas = propostas.filter(
            status='vendida', 
            venda_validada=True
        ).count()
        
        # Valor total de vendas
        valor_total_vendas = propostas.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(total=Sum('valor_venda'))['total'] or 0
        
        # PONTUAÇÃO BASEADA NO SISTEMA ATUAL
        # Usa o campo pontos já calculado pelas propostas
        pontos_totais = propostas.filter(
            status__in=['validada', 'vendida']
        ).aggregate(total=Sum('pontos'))['total'] or 0
        
        print(f"DEBUG: Ranking - Equipe {equipe.nome}")
        print(f"  - Propostas validadas: {propostas_validadas}")
        print(f"  - Vendas concretizadas: {vendas_concretizadas}")
        print(f"  - Pontos totais: {pontos_totais}")
        
        ranking_calculado.append({
            'equipe': equipe,
            'pontos': int(pontos_totais),
            'propostas_enviadas': propostas_enviadas,
            'propostas_validadas': propostas_validadas,
            'vendas_concretizadas': vendas_concretizadas,
            'valor_total_vendas': valor_total_vendas,
        })
    
    # Ordenar por pontuação (decrescente) e definir posições
    ranking_calculado.sort(key=lambda item: (item['pontos'], item['valor_total_vendas']), reverse=True)
    
    for i, item in enumerate(ranking_calculado, 1):
        Ranking.objects.update_or_create(
            equipe=item['equipe'],
            estado_sistema=status_atual,
            defaults={
                'posicao': i,
                'pontos': item['pontos'],
                'propostas_enviadas': item['propostas_enviadas'],
                'propostas_validadas': item['propostas_validadas'],
                'vendas_concretizadas': item['vendas_concretizadas'],
                'valor_total_vendas': item['valor_total_vendas'],
            }
        )
    
    print(f"DEBUG: Ranking atualizado para {len(ranking_calculado)} equipes")



class UserViewSet(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = UserSerializer

    permission_classes = [AllowAny]






class VendedorViewSet(viewsets.ModelViewSet):

    queryset = Vendedor.objects.all()

    serializer_class = VendedorSerializer

    permission_classes = [AllowAny]



class ClienteViewSet(viewsets.ModelViewSet):

    queryset = Cliente.objects.all()

    serializer_class = ClienteSerializer

    permission_classes = [AllowAny]



class WorkshopViewSet(viewsets.ModelViewSet):

    queryset = Workshop.objects.all()

    serializer_class = WorkshopSerializer

    permission_classes = [AllowAny]



class PrevisaoWorkshopViewSet(viewsets.ModelViewSet):

    queryset = PrevisaoWorkshop.objects.all()

    serializer_class = PrevisaoWorkshopSerializer

    permission_classes = [AllowAny]



class ResultadoPosWorkshopViewSet(viewsets.ModelViewSet):

    queryset = ResultadoPosWorkshop.objects.all()

    serializer_class = ResultadoPosWorkshopSerializer

    permission_classes = [AllowAny]



def get_perfil_acesso_usuario(request):

    """Obtém o perfil de acesso do usuário logado ou retorna None para acesso público"""

    if request.user.is_authenticated:

        try:

            return request.user.perfil_acesso

        except PerfilAcesso.DoesNotExist:

            return None

    return None



def filtrar_dados_por_acesso(queryset_previsto, queryset_realizado, perfil_acesso):

    """Filtra os dados de acordo com o nível de acesso do usuário"""

    if not perfil_acesso:

        return queryset_previsto, queryset_realizado

    

    if perfil_acesso.nivel == 'vendedor' and perfil_acesso.vendedor:

        queryset_previsto = queryset_previsto.filter(vendedor=perfil_acesso.vendedor)

        queryset_realizado = queryset_realizado.filter(vendedor=perfil_acesso.vendedor)

    
    

    return queryset_previsto, queryset_realizado



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_dashboard_geral')

def dashboard_geral(request):

    """Dashboard com visão geral de todos os dados"""

    

    perfil_acesso = get_perfil_acesso_usuario(request)

    

    # Dados previstos

    queryset_previsto = PrevisaoWorkshop.objects.all()

    queryset_realizado = ResultadoPosWorkshop.objects.all()

    

    # Aplicar filtros de acesso

    queryset_previsto, queryset_realizado = filtrar_dados_por_acesso(

        queryset_previsto, queryset_realizado, perfil_acesso

    )

    

    # Dados previstos

    dados_previstos = queryset_previsto.aggregate(

        faturamento_total_previsto=Coalesce(Sum('faturamento_total_previsto'), 0),

        numero_total_propostas_previstas=Coalesce(Sum('numero_propostas'), 0)

    )

    

    # Dados realizados

    dados_realizados = queryset_realizado.aggregate(

        faturamento_total_realizado=Coalesce(Sum('faturamento_total_realizado'), 0),

        numero_total_propostas_fechadas=Coalesce(Sum('numero_propostas_fechadas'), 0)

    )

    

    # Cálculos

    faturamento_previsto = dados_previstos['faturamento_total_previsto'] or 0

    faturamento_realizado = dados_realizados['faturamento_total_realizado'] or 0

    propostas_previstas = dados_previstos['numero_total_propostas_previstas'] or 0

    propostas_fechadas = dados_realizados['numero_total_propostas_fechadas'] or 0

    

    taxa_conversao = (propostas_fechadas / propostas_previstas * 100) if propostas_previstas > 0 else 0

    desempenho_faturamento = (faturamento_realizado / faturamento_previsto * 100) if faturamento_previsto > 0 else 0

    

    # Indicadores adicionais

    diferenca_faturamento = faturamento_realizado - faturamento_previsto

    diferenca_propostas = propostas_fechadas - propostas_previstas

    

    data = {

        'faturamento_total_previsto': faturamento_previsto,

        'faturamento_total_realizado': faturamento_realizado,

        'numero_total_propostas_previstas': propostas_previstas,

        'numero_total_propostas_fechadas': propostas_fechadas,

        'taxa_conversao': round(taxa_conversao, 2),

        'desempenho_faturamento': round(desempenho_faturamento, 2),

        'diferenca_faturamento': diferenca_faturamento,

        'diferenca_propostas': diferenca_propostas,

        'nivel_acesso': perfil_acesso.nivel if perfil_acesso else 'publico'

    }

    

    serializer = DashboardGeralSerializer(data)

    return Response(serializer.data)



@api_view(['GET'])




@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_dados_equipe')

def dashboard_vendedor(request, vendedor_id=None):

    """Dashboard por vendedor"""

    

    perfil_acesso = get_perfil_acesso_usuario(request)

    

    # Construir queryset base respeitando o nível de acesso

    if perfil_acesso:

        if perfil_acesso.nivel == 'geral':

            queryset = Vendedor.objects.all()


        elif perfil_acesso.nivel == 'vendedor' and perfil_acesso.vendedor:

            queryset = Vendedor.objects.filter(id=perfil_acesso.vendedor.id)

        else:

            queryset = Vendedor.objects.none()

    else:

        queryset = Vendedor.objects.all()

    


    if vendedor_id:

        # Verificar permissão específica

        if perfil_acesso and not perfil_acesso.pode_ver_vendedor(vendedor_id):

            return Response({'error': 'Acesso negado a este vendedor'}, status=403)

        queryset = queryset.filter(id=vendedor_id)

    

    data = []

    

    for vendedor in queryset:

        # Dados previstos

        dados_previstos = PrevisaoWorkshop.objects.filter(vendedor=vendedor).aggregate(

            faturamento_previsto=Coalesce(Sum('faturamento_total_previsto'), 0),

            propostas_previstas=Coalesce(Sum('numero_propostas'), 0)

        )

        

        # Dados realizados

        dados_realizados = ResultadoPosWorkshop.objects.filter(vendedor=vendedor).aggregate(

            faturamento_realizado=Coalesce(Sum('faturamento_total_realizado'), 0),

            propostas_fechadas=Coalesce(Sum('numero_propostas_fechadas'), 0)

        )

        

        # Cálculos

        faturamento_previsto = dados_previstos['faturamento_previsto'] or 0

        faturamento_realizado = dados_realizados['faturamento_realizado'] or 0

        propostas_previstas = dados_previstos['propostas_previstas'] or 0

        propostas_fechadas = dados_realizados['propostas_fechadas'] or 0

        

        taxa_conversao = (propostas_fechadas / propostas_previstas * 100) if propostas_previstas > 0 else 0

        desempenho_faturamento = (faturamento_realizado / faturamento_previsto * 100) if faturamento_previsto > 0 else 0

        diferenca_faturamento = faturamento_realizado - faturamento_previsto

        

        data.append({

            'vendedor': vendedor.nome,


            'faturamento_previsto': faturamento_previsto,

            'faturamento_realizado': faturamento_realizado,

            'propostas_previstas': propostas_previstas,

            'propostas_fechadas': propostas_fechadas,

            'taxa_conversao': round(taxa_conversao, 2),

            'desempenho_faturamento': round(desempenho_faturamento, 2),

            'diferenca_faturamento': diferenca_faturamento

        })

    

    serializer = DashboardVendedorSerializer(data, many=True)

    return Response(serializer.data)



@api_view(['GET'])

@permission_classes([AllowAny])

def comparativo_workshop(request, workshop_id):

    """Comparativo previsto vs realizado para um workshop específico"""

    

    try:

        workshop = Workshop.objects.get(id=workshop_id)

        perfil_acesso = get_perfil_acesso_usuario(request)

        

        
        

        # Dados previstos

        queryset_previsto = PrevisaoWorkshop.objects.filter(workshop=workshop)

        queryset_realizado = ResultadoPosWorkshop.objects.filter(workshop=workshop)

        

        # Aplicar filtros adicionais de acesso

        queryset_previsto, queryset_realizado = filtrar_dados_por_acesso(

            queryset_previsto, queryset_realizado, perfil_acesso

        )

        

        dados_previstos = queryset_previsto.aggregate(

            faturamento_previsto=Coalesce(Sum('faturamento_total_previsto'), 0),

            propostas_previstas=Coalesce(Sum('numero_propostas'), 0),

            clientes_previstos=Count('cliente', distinct=True)

        )

        

        dados_realizados = queryset_realizado.aggregate(

            faturamento_realizado=Coalesce(Sum('faturamento_total_realizado'), 0),

            propostas_fechadas=Coalesce(Sum('numero_propostas_fechadas'), 0),

            clientes_fechados=Count('cliente', distinct=True)

        )

        

        faturamento_previsto = dados_previstos['faturamento_previsto'] or 0

        faturamento_realizado = dados_realizados['faturamento_realizado'] or 0

        propostas_previstas = dados_previstos['propostas_previstas'] or 0

        propostas_fechadas = dados_realizados['propostas_fechadas'] or 0

        

        data = {

            'workshop': workshop.nome,

            'data': workshop.data,

            
            'faturamento_previsto': faturamento_previsto,

            'faturamento_realizado': faturamento_realizado,

            'propostas_previstas': propostas_previstas,

            'propostas_fechadas': propostas_fechadas,

            'clientes_previstos': dados_previstos['clientes_previstos'],

            'clientes_fechados': dados_realizados['clientes_fechados'],

            'taxa_conversao_propostas': round((propostas_fechadas / propostas_previstas * 100) if propostas_previstas > 0 else 0, 2),

            'taxa_conversao_clientes': round((dados_realizados['clientes_fechados'] / dados_previstos['clientes_previstos'] * 100) if dados_previstos['clientes_previstos'] > 0 else 0, 2),

            'desempenho_faturamento': round((faturamento_realizado / faturamento_previsto * 100) if faturamento_previsto > 0 else 0, 2),

            'diferenca_faturamento': faturamento_realizado - faturamento_previsto

        }

        

        return Response(data)

        

    except Workshop.DoesNotExist:

        return Response({'error': 'Workshop não encontrado'}, status=404)



# Views de Gestão de Equipes e Usuários

@api_view(['POST'])

@permission_classes([AllowAny])

def login_equipe(request):

    """Login único para equipes"""

    username = request.data.get('username')

    password = request.data.get('password')

    

    if not username or not password:
        return Response({'error': 'Usuário e senha são obrigatórios'}, status=400)

    # Autenticar com o username fornecido
    user = authenticate(username=username, password=password)

    if user:
        try:

            perfil = user.perfil_acesso

            if not perfil.ativo:

                return Response({'error': 'Perfil de acesso inativo'}, status=403)

            

            # Verificar se é perfil de equipe

            if perfil.nivel != 'equipe':

                return Response({'error': 'Este login é apenas para equipes'}, status=403)

            

            token, created = Token.objects.get_or_create(user=user)

            

            return Response({

                'token': token.key,

                'user': {

                    'id': user.id,

                    'username': user.username,

                    'nivel': perfil.nivel,

                    'nivel_display': perfil.get_nivel_display(),

                    'equipe': perfil.equipe.nome if perfil.equipe else None,

                    
                },

                'status_sistema': StatusSistema.get_status_atual(),

                'requires_equipe_selection': True  # Indica que precisa selecionar equipe

            })

        except PerfilAcesso.DoesNotExist:

            return Response({'error': 'Perfil de acesso não encontrado'}, status=403)

    else:

        return Response({'error': 'Credenciais inválidas'}, status=401)



@api_view(['POST'])

@permission_classes([IsAuthenticated])

def selecionar_equipe(request):

    """Selecionar equipe após login único"""

    equipe_id = request.data.get('equipe_id')

    

    if not equipe_id:

        return Response({'error': 'ID da equipe é obrigatório'}, status=400)

    

    try:

        perfil = request.user.perfil_acesso

        

        # Verificar se é perfil de equipe

        if perfil.nivel != 'equipe':

            return Response({'error': 'Apenas equipes podem selecionar equipe'}, status=403)

        

        # Verificar se a equipe existe e está ativa

        equipe = Equipe.objects.get(id=equipe_id, ativo=True)

        

        # Atualizar perfil com a equipe selecionada

        perfil.equipe = equipe

        perfil.save()

        

        return Response({

            'message': 'Equipe selecionada com sucesso',

            'equipe': {

                'id': equipe.id,

                'nome': equipe.nome,

                'codigo': equipe.codigo,


            }

        })

        

    except Equipe.DoesNotExist:

        return Response({'error': 'Equipe não encontrada ou inativa'}, status=404)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def listar_equipes_disponiveis(request):

    """Listar equipes disponíveis para seleção"""

    try:

        perfil = request.user.perfil_acesso

        

        # Verificar se é perfil de equipe

        if perfil.nivel != 'equipe':

            return Response({'error': 'Apenas equipes podem ver equipes disponíveis'}, status=403)

        

        # Listar equipes ativas

        equipes = Equipe.objects.filter(ativo=True)

        serializer = EquipeSerializer(equipes, many=True)

        

        return Response(serializer.data)

        

    except Exception as e:

        return Response({'error': str(e)}, status=500)



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def propostas_equipe(request):
    """Gerenciar propostas da equipe logada"""

    try:
        perfil = request.user.perfil_acesso
        # Recarregar do banco para garantir que temos os dados mais recentes
        perfil.refresh_from_db()
    except PerfilAcesso.DoesNotExist:
        return Response({'error': 'Perfil de acesso não encontrado'}, status=403)

    if perfil.nivel != 'equipe':
        return Response({'error': 'Acesso negado'}, status=403)

    if not perfil.equipe:
        # Tentar encontrar a equipe pelo código do username
        try:
            equipe = Equipe.objects.get(codigo=request.user.username)
            # Associar a equipe ao perfil se encontrada
            perfil.equipe = equipe
            perfil.save()
            logger.info(f'Equipe {equipe.nome} associada automaticamente ao usuário {request.user.username} em propostas_equipe')
        except Equipe.DoesNotExist:
            return Response({
                'error': 'Equipe não selecionada para este usuário',
                'message': 'Entre em contato com o administrador para associar uma equipe ao seu usuário',
                'username': request.user.username
            }, status=400)
    
    if request.method == 'GET':
        propostas = Proposta.objects.filter(equipe=perfil.equipe)
        serializer = PropostaSerializer(propostas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if not perfil.pode_enviar_propostas():
            print(f"DEBUG: Permission denied - cannot send proposals")
            return Response({
                'error': 'Envio de propostas não permitido no status atual',
                'status_atual': StatusSistema.get_status_atual()
            }, status=403)
        
        try:
            cliente_nome = request.data.get('cliente', '').strip()
            vendedor_nome = request.data.get('vendedor', '').strip()
            valor_proposta = request.data.get('valor_proposta')
            
            if not cliente_nome or not vendedor_nome or not valor_proposta:
                print(f"DEBUG: Missing required fields - cliente: {bool(cliente_nome)}, vendedor: {bool(vendedor_nome)}, valor: {bool(valor_proposta)}")
                return Response({'error': 'Campos cliente, vendedor e valor_proposta são obrigatórios'}, status=400)
            
            try:
                valor_str = str(valor_proposta).replace('.', '').replace(',', '.')
                valor_proposta_decimal = float(valor_str)
            except (ValueError, TypeError) as e:
                print(f"DEBUG: Valor conversion failed - '{valor_proposta}' -> {str(e)}")
                return Response({'error': 'Campo valor_proposta deve ser um número válido'}, status=400)
            
            print(f"DEBUG: About to create/get vendedor: {vendedor_nome}")
            # Criar ou obter vendedor
            vendedor, created_vendedor = Vendedor.objects.get_or_create(
                nome=vendedor_nome,
                defaults={
                    'codigo': f"VEN_{vendedor_nome.upper().replace(' ', '_')}",
                }
            )
            
            cliente, created_cliente = Cliente.objects.get_or_create(
                nome=cliente_nome,
                defaults={
                    'codigo': f"CLI_{cliente_nome.upper().replace(' ', '_')}",
                    'vendedor': vendedor,
                }
            )
            if not created_cliente and not cliente.vendedor:
                cliente.vendedor = vendedor
                cliente.save()
                print(f"DEBUG: Updated existing cliente with vendedor")

            # Buscar workshop ativo ou o primeiro disponível
            workshop = Workshop.objects.first()

            if not workshop:
                # Criar workshop automaticamente se não existir
                from datetime import date
                workshop = Workshop.objects.create(
                    nome='Workshop Padrão',
                    data=date.today()
                )
                print(f"DEBUG: Workshop criado automaticamente: {workshop.nome}")
            
            print(f"DEBUG: Workshop utilizado: {workshop.nome}")

            proposta_data = {
                'equipe': perfil.equipe.id,
                'cliente': cliente.id,
                'vendedor': vendedor.id,
                'workshop': workshop.id,
                'valor_proposta': valor_proposta_decimal,
                'descricao': request.data.get('descricao', ''),
                'quantidade_produtos': request.data.get('quantidade_produtos', 0),
                'bonus_vinhos_casa_perini_mundo': request.data.get('bonus_vinhos_casa_perini_mundo') in [True, 'true', '1'],
                'bonus_vinhos_fracao_unica': request.data.get('bonus_vinhos_fracao_unica') in [True, 'true', '1'],
                'bonus_espumantes_vintage': request.data.get('bonus_espumantes_vintage') in [True, 'true', '1'],
                'bonus_espumantes_premium': request.data.get('bonus_espumantes_premium') in [True, 'true', '1'],
                'bonus_aceleracao': request.data.get('bonus_aceleracao') in [True, 'true', '1'],
            }
            
            if 'arquivo_pdf' in request.FILES:
                proposta_data['arquivo_pdf'] = request.FILES['arquivo_pdf']
                
            serializer = PropostaSerializer(data=proposta_data)
            if serializer.is_valid():
                proposta = serializer.save()
                                
                # Funções de utilidade (usando as definidas no topo deste arquivo)
                try:
                    calcular_pontos_proposta(proposta)
                    atualizar_ranking()
                except Exception as e:
                    print(f"ERRO ao calcular pontos/atualizar ranking: {str(e)}")
                    # Não impede o retorno da proposta criada
                    pass 
                
                return Response(serializer.data, status=201)
            else:
                print(f"DEBUG: Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=400)
            
        except Exception as e:
            logger.error(f"Erro ao criar proposta: {str(e)}")
            return Response({'error': f'Erro interno: {str(e)}'}, status=400)



@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login único para equipes e login individual para outros perfis"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Usuário e senha são obrigatórios'}, status=400)
        
        user = authenticate(username=username, password=password)
        
        if user:
            try:
                perfil = user.perfil_acesso
                if not perfil.ativo:
                    return Response({'error': 'Perfil de acesso inativo'}, status=403)
                
                token, created = Token.objects.get_or_create(user=user)
                
                # Removido: Não existe mais seleção de equipe
                # Todos os usuários acessam diretamente seus painéis
                requires_equipe_selection = False
                
                response_data = {
                    'token': token.key,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'nivel': perfil.nivel,
                        'nivel_display': perfil.get_nivel_display(),
                        'equipe': perfil.equipe.nome if perfil.equipe else None,
                        'equipe_id': perfil.equipe.id if perfil.equipe else None
                    },
                    'status_sistema': StatusSistema.get_status_atual()
                }
                
                # Adicionar flag se precisa selecionar equipe
                if requires_equipe_selection:
                    response_data['requires_equipe_selection'] = True
                
                return Response(response_data)
            except PerfilAcesso.DoesNotExist:
                return Response({'error': 'Perfil de acesso não encontrado. Entre em contato com o administrador.'}, status=403)
        else:
            return Response({'error': 'Credenciais inválidas. Verifique seu usuário e senha.'}, status=401)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'Erro interno: {str(e)}'}, status=500)



@api_view(['GET', 'POST', 'DELETE'])

@verificar_permissao('pode_criar_equipes')

def gerenciar_equipes(request):

    """Criar, listar e deletar equipes (apenas administrador)"""

    

    if request.method == 'GET':

        equipes = Equipe.objects.all()

        serializer = EquipeSerializer(equipes, many=True)

        return Response(serializer.data)

    

    elif request.method == 'DELETE':

        equipe_id = request.GET.get('equipe_id') or request.data.get('equipe_id')

        if not equipe_id:

            return Response({'error': 'ID da equipe não fornecido'}, status=400)

        

        try:
            equipe = Equipe.objects.get(id=equipe_id)
            
            # Buscar e remover usuário associado à equipe
            try:
                perfil = PerfilAcesso.objects.get(equipe=equipe, nivel='equipe')
                usuario = perfil.usuario
                # Não permitir deletar o admin principal
                if usuario.username != 'admin':
                    usuario.delete()
                    print(f"DEBUG: Usuário {usuario.username} removido junto com a equipe")
            except PerfilAcesso.DoesNotExist:
                # Se não houver perfil associado, apenas continuar
                pass

            # Limpar registros relacionados para evitar conflitos de chave estrangeira
            from django.db import transaction
            with transaction.atomic():
                # Remover propostas relacionadas
                propostas = equipe.propostas.all()
                for proposta in propostas:
                    # Remover referências que possam causar problemas
                    proposta.validado_por = None
                    proposta.venda_validada_por = None
                    proposta.save()
                
                # Remover vendedores relacionados
                vendedores = equipe.vendedores.all()
                for vendedor in vendedores:
                    # Remover clientes relacionados aos vendedores
                    clientes = vendedor.clientes.all()
                    for cliente in clientes:
                        cliente.delete()
                    vendedor.delete()
                
                # Finalmente remover a equipe
                equipe.delete()

            return Response({'message': 'Equipe removida com sucesso'}, status=200)

        except Equipe.DoesNotExist:

            return Response({'error': 'Equipe não encontrada'}, status=404)

    

    elif request.method == 'POST':

        
        print(f"DEBUG: Dados recebidos para criar equipe: {request.data}")
        
        # Verificar se já existe equipe com esse nome ou código
        nome = request.data.get('nome')
        codigo = request.data.get('codigo')
        senha = request.data.get('codigo')  # A senha é o código fornecido
        
        # Validações básicas
        if not nome or not nome.strip():
            return Response({'error': 'Nome da equipe é obrigatório'}, status=400)
        
        if not codigo or not codigo.strip():
            return Response({'error': 'Código/Senha é obrigatório'}, status=400)
        
        # Validar se o código é válido como username (máximo 150 caracteres, sem espaços)
        codigo_limpo = codigo.strip()
        if len(codigo_limpo) > 150:
            return Response({'error': 'Código muito longo (máximo 150 caracteres)'}, status=400)
        
        if ' ' in codigo_limpo:
            return Response({'error': 'O código não pode conter espaços'}, status=400)
        
        if Equipe.objects.filter(nome=nome).exists():
            return Response({'error': 'Já existe uma equipe com este nome'}, status=400)
        
        if Equipe.objects.filter(codigo=codigo_limpo).exists():
            return Response({'error': 'Já existe uma equipe com este código'}, status=400)
        
        # Verificar se já existe usuário com esse username (código)
        if User.objects.filter(username=codigo_limpo).exists():
            return Response({'error': 'Já existe um usuário com este código. Escolha outro código.'}, status=400)
        
        # Atualizar request.data com código limpo para o serializer
        request_data_copy = request.data.copy()
        request_data_copy['codigo'] = codigo_limpo
        
        serializer = EquipeSerializer(data=request_data_copy)
        
        if serializer.is_valid():
            
            equipe = serializer.save()
            
            # Criar usuário automaticamente para a equipe
            try:
                # Criar usuário com username = código da equipe e password = código limpo (sem espaços)
                # IMPORTANTE: Usar codigo_limpo para a senha também, para garantir consistência
                user = User.objects.create_user(
                    username=codigo_limpo,
                    password=codigo_limpo,  # Senha igual ao código limpo
                    email='',  # Email vazio por padrão
                    first_name=request.data.get('responsavel', '')  # Nome do responsável
                )
                
                # Criar perfil de acesso associado à equipe
                perfil = PerfilAcesso.objects.create(
                    usuario=user,
                    nivel='equipe',
                    equipe=equipe,
                    ativo=True
                )
                
                # Verificar se foi criado corretamente
                perfil.refresh_from_db()
                print(f"DEBUG: Usuário criado para equipe - Username: {codigo_limpo}, Equipe: {equipe.nome}, Perfil ID: {perfil.id}, Equipe associada: {perfil.equipe.nome if perfil.equipe else 'NENHUMA'}")
                
                if not perfil.equipe:
                    raise Exception(f'Erro: Perfil criado mas equipe não foi associada. Perfil ID: {perfil.id}')
                
            except Exception as e:
                # Se falhar ao criar usuário, remover a equipe criada (rollback)
                equipe.delete()
                print(f"DEBUG: Erro ao criar usuário: {str(e)}")
                return Response({
                    'error': f'Erro ao criar usuário para a equipe: {str(e)}'
                }, status=400)
            
            return Response(serializer.data, status=201)
        
        print(f"DEBUG: Erros do serializer: {serializer.errors}")
        return Response(serializer.errors, status=400)



@api_view(['GET', 'POST', 'DELETE'])

@verificar_permissao('pode_criar_usuarios')

def gerenciar_usuarios(request):

    """Criar, listar e deletar usuários (apenas administrador)"""

    

    if request.method == 'GET':

        usuarios = User.objects.all()

        dados = []

        for user in usuarios:

            try:

                perfil = user.perfil_acesso

                dados.append({

                    'id': user.id,

                    'username': user.username,

                    'email': user.email,

                    'nivel': perfil.nivel,

                    'nivel_display': perfil.get_nivel_display(),

                    'equipe': perfil.equipe.nome if perfil.equipe else None,

                    'ativo': perfil.ativo

                })

            except PerfilAcesso.DoesNotExist:

                dados.append({

                    'id': user.id,

                    'username': user.username,

                    'email': user.email,

                    'nivel': 'sem_perfil',

                    'nivel_display': 'Sem Perfil',

                    'equipe': None,

                    'ativo': False

                })

        return Response(dados)

    elif request.method == 'DELETE':
        user_id = request.GET.get('user_id') or request.data.get('user_id')
        if not user_id:
            return Response({'error': 'ID do usuário não fornecido'}, status=400)

        try:
            user = User.objects.get(id=user_id)

            # Não permitir deletar o admin principal

            if user.username == 'admin':
                return Response({'error': 'Não é possível remover o usuário admin'}, status=400)

            user.delete()

            return Response({'message': 'Usuário removido com sucesso'}, status=200)

        except User.DoesNotExist:
            return Response({'error': 'Usuário não encontrado'}, status=404)

    elif request.method == 'POST':
        print(f"DEBUG: Dados recebidos para criar usuário: {request.data}")
        
        user_data = {
            
            'username': request.data.get('username'),
            
            'password': request.data.get('password'),
            
            'email': request.data.get('email', '')
            
        }
        
        print(f"DEBUG: user_data para UserSerializer: {user_data}")

        
        
        user_serializer = UserSerializer(data=user_data)
        
        print(f"DEBUG: UserSerializer is_valid(): {user_serializer.is_valid()}")
        if not user_serializer.is_valid():
            print(f"DEBUG: Erros do UserSerializer: {user_serializer.errors}")
            
            # Formatar mensagem de erro amigável
            if 'username' in user_serializer.errors:
                for error in user_serializer.errors['username']:
                    if 'already exists' in str(error):
                        return Response({'error': 'Nome de usuário já existe'}, status=400)
            
            return Response({'error': str(user_serializer.errors)}, status=400)
        
        if user_serializer.is_valid():
            
            user = user_serializer.save()
            
            print(f"DEBUG: Usuário criado com ID: {user.id}")
            print(f"DEBUG: Senha após criação (hash): {user.password}")
            
            # Verificar se a senha funciona
            from django.contrib.auth import authenticate
            test_auth = authenticate(username=user.username, password=request.data.get('password'))
            print(f"DEBUG: Autenticação teste com senha original: {test_auth is not None}")
            
            # Criar perfil de acesso
            equipe_id = request.data.get('equipe')
            
            # Validar se equipe existe (se for nível equipe)
            if request.data.get('nivel') == 'equipe' and equipe_id:
                try:
                    equipe = Equipe.objects.get(id=equipe_id, ativo=True)
                    print(f"DEBUG: Equipe encontrada: {equipe.nome} (ID: {equipe.id})")
                except Equipe.DoesNotExist:
                    return Response({
                        'error': 'Equipe não encontrada ou inativa',
                        'equipe_id': equipe_id
                    }, status=400)
            
            perfil_data = {
                'usuario': user.id,
                'nivel': request.data.get('nivel'),
                'equipe': equipe_id if equipe_id else None,
                'ativo': True
            }
            
            print(f"DEBUG: perfil_data para PerfilAcessoSerializer: {perfil_data}")

            
            
            perfil_serializer = PerfilAcessoSerializer(data=perfil_data)
            
            if perfil_serializer.is_valid():
                
                perfil = perfil_serializer.save()
                
                print(f"DEBUG: Perfil criado - Usuário: {user.username}, Nível: {perfil.nivel}, Equipe: {perfil.equipe}")
                
                return Response({
                    'user': user_serializer.data,
                    'perfil': perfil_serializer.data,
                    'message': 'Usuário e perfil criados com sucesso'
                }, status=201)
            else:
                print(f"DEBUG: Erros ao criar perfil: {perfil_serializer.errors}")
                user.delete()  # Rollback se perfil for inválido
                return Response({
                    'error': 'Erro ao criar perfil de acesso',
                    'details': perfil_serializer.errors
                }, status=400)
        else:
            return Response({
                'error': 'Erro ao criar usuário',
                'details': user_serializer.errors
            }, status=400)

@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_alterar_status_sistema')
def gerenciar_status_sistema(request):
    """Gerenciar status global do sistema (apenas administrador)"""
    
    print(f"DEBUG: gerenciar_status_sistema chamado com método: {request.method}")
    
    if request.method == 'GET':
        try:
            status = StatusSistema.objects.first()
            if not status:
                return Response({'error': 'Status do sistema não configurado'}, status=404)
            
            serializer = StatusSistemaSerializer(status)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    elif request.method == 'POST':
        try:
            novo_status = request.data.get('status')
            if not novo_status:
                return Response({'error': 'Status não fornecido'}, status=400)
            
            status = StatusSistema.objects.first()
            if not status:
                status = StatusSistema.objects.create(
                    status_atual=novo_status,
                    alterado_por=request.user
                )
            else:
                status.status_atual = novo_status
                status.alterado_por = request.user
                status.save()
            
            serializer = StatusSistemaSerializer(status)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    elif request.method == 'PUT':
        try:
            novo_status = request.data.get('status_atual')
            if not novo_status:
                return Response({'error': 'Status não fornecido'}, status=400)
            
            status = StatusSistema.objects.first()
            if not status:
                status = StatusSistema.objects.create(
                    status_atual=novo_status,
                    alterado_por=request.user
                )
            else:
                status.status_atual = novo_status
                status.alterado_por = request.user
                status.save()
            
            serializer = StatusSistemaSerializer(status)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    else:
        return Response({'error': 'Método não permitido'}, status=405)


@api_view(['GET'])
@permission_classes([IsAuthenticated])

def meu_perfil(request):

    """Obter informações do perfil do usuário logado"""

    try:

        perfil = request.user.perfil_acesso

        return Response({

            'user': {

                'id': request.user.id,

                'username': request.user.username,

                'email': request.user.email

            },

            'perfil': {

                'nivel': perfil.nivel,

                'nivel_display': perfil.get_nivel_display(),

                'equipe': perfil.equipe.nome if perfil.equipe else None,

                'ativo': perfil.ativo

            },

            'status_sistema': StatusSistema.get_status_atual(),

            'permissoes': {

                'pode_criar_equipes': perfil.pode_criar_equipes(),

                'pode_criar_usuarios': perfil.pode_criar_usuarios(),

                'pode_alterar_status_sistema': perfil.pode_alterar_status_sistema(),

                
                'pode_ver_dashboard_geral': perfil.pode_ver_dashboard_geral(),

                'pode_validar_propostas': perfil.pode_validar_propostas(),

                'pode_registrar_previsao': perfil.pode_registrar_previsao(),

                'pode_registrar_resultado': perfil.pode_registrar_resultado(),

            }

        })

    except PerfilAcesso.DoesNotExist:

        return Response({'error': 'Perfil de acesso não encontrado'}, status=403)



# Views de Propostas

@api_view(['GET', 'POST'])

@permission_classes([IsAuthenticated])

def gerenciar_propostas(request):

    """Gerenciar propostas conforme estado do sistema"""

    

    if request.method == 'GET':

        # Listar propostas conforme permissões

        perfil = get_perfil_acesso_usuario(request)

        

        if perfil and perfil.nivel == 'equipe':

            # Equipe vê apenas suas propostas

            propostas = Proposta.objects.filter(equipe=perfil.equipe)

        elif perfil and perfil.nivel == 'gestor':

            # Gestor vê todas as propostas

            propostas = Proposta.objects.all()

        else:

            # Admin e Banca veem todas

            propostas = Proposta.objects.all()

        

        serializer = PropostaSerializer(propostas, many=True)

        return Response(serializer.data)

    

    elif request.method == 'POST':

        # Criar proposta - apenas equipes durante workshop

        perfil = get_perfil_acesso_usuario(request)

        

        if not perfil or not perfil.pode_enviar_propostas():

            return Response({

                'error': 'Envio de propostas não permitido no status atual',

                'status_atual': StatusSistema.get_status_atual()

            }, status=403)

        

        # Validar dados da proposta

        serializer = PropostaSerializer(data=request.data)

        if serializer.is_valid():

            proposta = serializer.save(equipe=perfil.equipe)

            

            # Calcular pontos automaticamente

            calcular_pontos_proposta(proposta)

            

            # Atualizar ranking

            atualizar_ranking()

            

            return Response(serializer.data, status=201)

        

        return Response(serializer.errors, status=400)



@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_validar_propostas')
def validar_proposta(request, proposta_id):
    """Validar ou rejeitar proposta (apenas gestor durante workshop)
    
    Fluxo de pontuação:
    - Ao VALIDAR: calcula pontos completos
    - Ao REJEITAR: pontos = 0 (proposta retorna para equipe corrigir)
    """
    
    
    try:
        proposta = Proposta.objects.get(id=proposta_id)
        
        if proposta.status != 'enviada':
            return Response({'error': 'Proposta já foi processada'}, status=400)
        
        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'
        motivo = request.data.get('motivo', '')
        
        if acao == 'validar':
            # VALIDAÇÃO: aprovar proposta
            proposta.status = 'validada'
            proposta.data_validacao = timezone.now()
            proposta.validado_por = request.user
            proposta.motivo_rejeicao = None  # Limpar motivo anterior
            
            # Calcular pontos automaticamente após validação
            pontos = calcular_pontos_proposta(proposta)
            
            print(f"DEBUG: Proposta {proposta_id} VALIDADA - Pontos calculados: {pontos}")
            
            # Atualizar ranking geral
            atualizar_ranking()
            
            return Response({
                'message': 'Proposta validada com sucesso',
                'pontos_calculados': pontos,
                'detalhes': {
                    'pontos_base': pontos,
                    'quantidade_produtos': proposta.quantidade_produtos,
                    'equipe': proposta.equipe.nome
                }
            })
            
        elif acao == 'rejeitar':
            # REJEIÇÃO: invalidar proposta e zerar pontos
            if not motivo:
                return Response({'error': 'Motivo da rejeição é obrigatório'}, status=400)

            proposta.status = 'rejeitada'
            proposta.motivo_rejeicao = motivo
            proposta.data_validacao = timezone.now()
            proposta.validado_por = request.user
            proposta.pontos = 0  # Zerar pontos
            proposta.save(update_fields=['status', 'motivo_rejeicao', 'data_validacao', 'validado_por', 'pontos'])
            
            # Atualizar ranking geral
            atualizar_ranking()
            
            return Response({'message': 'Proposta rejeitada com sucesso'})
        
        else:
            return Response({'error': 'Ação inválida. Use "validar" ou "rejeitar"'}, status=400)
        
    except Proposta.DoesNotExist:
        return Response({'error': 'Proposta não encontrada'}, status=404)
    except Exception as e:
        print(f"DEBUG: Erro na validação: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=500)



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_marcar_vendas')

def marcar_venda(request, proposta_id):

    """Marcar proposta como vendida (apenas equipes durante pós-workshop)"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        

        if proposta.status not in ['validada', 'nao_vendida']:

            return Response({'error': 'Apenas propostas validadas ou não vendidas podem ser marcadas como vendidas'}, status=400)

        

        # Marcar como vendida

        proposta.status = 'vendida'

        proposta.data_venda = timezone.now()

        proposta.valor_venda = request.data.get('valor_venda', proposta.valor_proposta)
        
        # QUANTIDADE DE PRODUTOS VENDIDOS
        proposta.quantidade_produtos_venda = request.data.get('quantidade_produtos_venda', proposta.quantidade_produtos)
        
        # Resetar validação anterior
        proposta.venda_validada = False
        proposta.motivo_rejeicao_venda = None

        proposta.save()

        

        # Adicionar pontos por venda

        # Pontos de venda só fazem sentido após validação da venda pelo gestor,
        # então aqui apenas recalculamos o baseline (proposta validada)

        calcular_pontos_proposta(proposta)

        

        return Response({'message': 'Venda registrada com sucesso e enviada para validação do gestor'})

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_marcar_vendas')
def registrar_venda_pre_workshop(request, proposta_id):
    """Registrar venda de proposta validada no Pré-Workshop"""
    
    try:
        perfil = request.user.perfil_acesso
        
        # Verificar se está no Pré-Workshop
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'pre_workshop':
            return Response({
                'error': 'Registro de vendas permitido apenas no Pré-Workshop',
                'status_atual': status_atual
            }, status=403)
        
        proposta = Proposta.objects.get(id=proposta_id)
        
        # Verificar se a proposta pertence à equipe do usuário
        if perfil.nivel == 'equipe' and proposta.equipe != perfil.equipe:
            return Response({'error': 'Acesso negado a esta proposta'}, status=403)
        
        # Verificar se a proposta foi validada no Workshop
        if proposta.status != 'validada':
            return Response({
                'error': 'Apenas propostas validadas podem ser marcadas como vendidas',
                'status_atual': proposta.status
            }, status=400)
        
        # Verificar se já não foi vendida
        if hasattr(proposta, 'venda'):
            return Response({'error': 'Esta proposta já foi registrada como venda'}, status=400)
        
        # Obter dados da venda
        quantidade_produtos_vendidos = request.data.get('quantidade_produtos_vendidos', proposta.quantidade_produtos)
        valor_total_venda = request.data.get('valor_total_venda', proposta.valor_proposta)
        observacoes = request.data.get('observacoes', '')
        
        # Criar venda
        venda = Venda.objects.create(
            proposta=proposta,
            quantidade_produtos_vendidos=quantidade_produtos_vendidos,
            valor_total_venda=valor_total_venda,
            data_venda=timezone.now(),
            observacoes=observacoes,
            status_validacao='pendente'  # Aguardando validação do gestor
        )
        
        # Atualizar status da proposta
        proposta.status = 'vendida'
        proposta.data_venda = timezone.now()
        proposta.valor_venda = valor_total_venda
        proposta.save()
        
        # Calcular pontos (serão aplicados após validação)
        venda.pontos_gerados = venda.calcular_pontos()
        venda.save()
        
        return Response({
            'message': 'Venda registrada com sucesso! Aguardando validação do gestor.',
            'venda': VendaSerializer(venda).data
        }, status=201)
        
    except Proposta.DoesNotExist:
        return Response({'error': 'Proposta não encontrada'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_validar_vendas')

def validar_venda(request, proposta_id):

    """Validar venda (apenas gestor durante pós-workshop)"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        

        if proposta.status != 'vendida':

            return Response({'error': 'Apenas propostas marcadas como vendidas podem ser validadas'}, status=400)

        

        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'

        

        if acao == 'validar':

            proposta.venda_validada = True

            proposta.data_validacao_venda = timezone.now()

            proposta.venda_validada_por = request.user

            

            # Recalcular pontos após validação da venda

            calcular_pontos_proposta(proposta)

        elif acao == 'rejeitar':

            proposta.status = 'nao_vendida'

            proposta.venda_validada = False
            
            proposta.motivo_rejeicao_venda = request.data.get('motivo', 'Venda rejeitada pelo gestor')
            proposta.data_rejeicao_venda = timezone.now()

            # Recalcular pontos removendo impacto de venda

            calcular_pontos_proposta(proposta)

        

        proposta.save()

        atualizar_ranking()

        

        return Response({'message': f'Venda {acao} com sucesso'})

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_validar_vendas')
def vendas_para_validar(request):
    """Listar vendas pendentes de validação para o gestor no Pré-Workshop"""
    
    try:
        perfil = request.user.perfil_acesso
        
        # Verificar se está no Pré-Workshop
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'pre_workshop':
            return Response({
                'error': 'Validação de vendas permitida apenas no Pré-Workshop',
                'status_atual': status_atual
            }, status=403)
        
        # Filtrar vendas pendentes
        vendas = Venda.objects.filter(status_validacao='pendente')
        
        serializer = VendaSerializer(vendas, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_validar_vendas')
def validar_venda_pre_workshop(request, venda_id):
    """Validar ou rejeitar venda no Pré-Workshop (apenas gestor)"""
    
    try:
        perfil = request.user.perfil_acesso
        
        # Verificar se está no Pré-Workshop
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'pre_workshop':
            return Response({
                'error': 'Validação de vendas permitida apenas no Pré-Workshop',
                'status_atual': status_atual
            }, status=403)
        
        venda = Venda.objects.get(id=venda_id)
        
        if venda.status_validacao != 'pendente':
            return Response({
                'error': 'Esta venda já foi processada',
                'status_atual': venda.status_validacao
            }, status=400)
        
        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'
        motivo = request.data.get('motivo', '')
        
        if acao == 'validar':
            venda.status_validacao = 'validada'
            venda.data_validacao = timezone.now()
            venda.validado_por = request.user
            
            # Aplicar pontos
            venda.pontos_gerados = venda.calcular_pontos()
            venda.save()
            
            # Atualizar ranking
            atualizar_ranking()
            
            message = 'Venda validada com sucesso!'
            
        elif acao == 'rejeitar':
            venda.status_validacao = 'rejeitada'
            venda.data_validacao = timezone.now()
            venda.validado_por = request.user
            venda.pontos_gerados = 0  # Remove pontos
            venda.save()
            
            # Reverter status da proposta
            proposta = venda.proposta
            proposta.status = 'validada'  # Volta para validada
            proposta.data_venda = None
            proposta.valor_venda = None
            proposta.save()

            try:
                calcular_pontos_proposta(proposta)
                atualizar_ranking()
            except Exception:
                pass
            
            # Atualizar ranking
            atualizar_ranking()
            
            message = 'Venda rejeitada com sucesso!'
            
        else:
            return Response({'error': 'Ação inválida. Use "validar" ou "rejeitar"'}, status=400)
        
        return Response({
            'message': message,
            'venda': VendaSerializer(venda).data
        })
        
    except Venda.DoesNotExist:
        return Response({'error': 'Venda não encontrada'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])

@permission_classes([IsAuthenticated])

def ranking_view(request):

    """Ranking das equipes conforme estado atual do sistema"""

    

    perfil = get_perfil_acesso_usuario(request)

    

    if not perfil or not perfil.pode_acessar_sistema_encerrado():

        return Response({'error': 'Acesso não permitido no status atual'}, status=403)

    

    # Obter ranking do estado atual

    status_atual = StatusSistema.get_status_atual()

    ranking = Ranking.objects.filter(estado_sistema=status_atual).order_by('posicao')

    serializer = RankingSerializer(ranking, many=True)

    

    return Response({

        'estado_atual': status_atual,

        'estado_display': dict(StatusSistema.STATUS_CHOICES)[status_atual],

        'ranking': serializer.data

    })



@api_view(['GET', 'POST'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_gerenciar_regras_pontuacao')

def gerenciar_regras_pontuacao(request):

    """Gerenciar regras de pontuação (apenas admin e banca)"""

    

    if request.method == 'GET':

        regras = RegraPontuacao.objects.filter(ativa=True)

        serializer = RegraPontuacaoSerializer(regras, many=True)

        return Response(serializer.data)

    

    elif request.method == 'POST':

        serializer = RegraPontuacaoSerializer(data=request.data)

        if serializer.is_valid():

            serializer.save()

            # Recalcular todos os pontos

            recalcular_todos_pontos()

            return Response(serializer.data, status=201)

        

        return Response(serializer.errors, status=400)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_todas_equipes')

def listar_equipes_gestor(request):
    """Listar equipes para o gestor"""

    

    try:

        perfil = request.user.perfil_acesso

        print(f"DEBUG: Listar equipes - Usuário: {request.user.username} - Nível: {perfil.nivel}")

        

        if perfil.nivel == 'administrador':

            equipes = Equipe.objects.all()

            print(f"DEBUG: Listar equipes - Admin: todas as equipes ({equipes.count()})")

        elif perfil.nivel == 'gestor':
            equipes = Equipe.objects.all()
            print(f"DEBUG: Listar equipes - Gestor: todas as equipes ({equipes.count()})")

        else:

            print(f"DEBUG: Listar equipes - Acesso negado para nível: {perfil.nivel}")

            return Response({'error': 'Acesso negado'}, status=403)

        

        serializer = EquipeSerializer(equipes, many=True)

        print(f"DEBUG: Listar equipes - Serializer OK")

        return Response(serializer.data)

        

    except Exception as e:

        print(f"DEBUG: Listar equipes - Erro: {str(e)}")

        import traceback

        traceback.print_exc()

        return Response({'error': f'Erro interno: {str(e)}'}, status=500)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_todas_propostas')

def listar_propostas_gestor(request):

    """Listar propostas para validação pelo gestor"""

    

    perfil = request.user.perfil_acesso

    

    if perfil.nivel == 'administrador':

        propostas = Proposta.objects.all()

    elif perfil.nivel == 'gestor':
        propostas = Proposta.objects.all()

    else:

        return Response({'error': 'Acesso negado'}, status=403)

    

    # Filtrar apenas propostas enviadas (aguardando validação)

    propostas_pendentes = propostas.filter(status='enviada')

    

    serializer = PropostaSerializer(propostas_pendentes, many=True)

    return Response(serializer.data)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def detalhar_proposta_gestor(request, proposta_id):

    """Ver detalhes completos de uma proposta para validação"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        perfil = request.user.perfil_acesso

        

        print(f"DEBUG: Usuário {request.user.username} - Nível: {perfil.nivel}")

        

        # Verificar permissão

        if perfil.nivel == 'gestor':
            print(f"DEBUG: Gestor - acesso permitido")

        elif perfil.nivel not in ['administrador', 'banca']:

            print(f"DEBUG: Nível não permitido - acesso negado")

            return Response({'error': 'Acesso negado'}, status=403)

        

        print(f"DEBUG: Acesso permitido")

        serializer = PropostaSerializer(proposta)

        return Response(serializer.data)

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_validar_propostas')

def validar_proposta_gestor(request, proposta_id):

    """Validar ou rejeitar proposta com justificativa (apenas gestor)"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        perfil = request.user.perfil_acesso

        


        

        if proposta.status != 'enviada':

            return Response({'error': 'Proposta já foi processada'}, status=400)

        

        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'

        motivo = request.data.get('motivo', '')

        

        if acao == 'validar':
            # VALIDAÇÃO: aprovar proposta
            proposta.status = 'validada'
            proposta.data_validacao = timezone.now()
            proposta.validado_por = request.user
            proposta.motivo_rejeicao = None
            
            # Recalcular pontos: pontuação passa a contar a partir da validação
            calcular_pontos_proposta(proposta)
            
        elif acao == 'rejeitar':
            if not motivo.strip():
                return Response({'error': 'Motivo da rejeição é obrigatório'}, status=400)
            
            # REJEIÇÃO: invalidar proposta e zerar pontos
            proposta.status = 'rejeitada'
            proposta.motivo_rejeicao = motivo
            proposta.data_validacao = timezone.now()
            proposta.validado_por = request.user
            proposta.pontos = 0  # Zerar pontos

        

        proposta.save()

        atualizar_ranking()

        

        return Response({

            'message': f'Proposta {acao} com sucesso',

            'status': proposta.status,

            'motivo_rejeicao': proposta.motivo_rejeicao

        })

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)

    except PerfilAcesso.DoesNotExist:

        return Response({'error': 'Perfil de acesso não encontrado'}, status=403)

    except Exception as e:

        print(f"DEBUG: Erro em validar_proposta_gestor: {str(e)}")

        return Response({'error': f'Erro interno: {str(e)}'}, status=500)



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

def reenviar_proposta(request, proposta_id):

    """Permitir que equipe corrija e reenvie uma proposta rejeitada"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        perfil = request.user.perfil_acesso

        

        # Apenas a equipe dona da proposta pode reenviar

        if perfil.nivel != 'equipe' or proposta.equipe != perfil.equipe:

            return Response({'error': 'Apenas a equipe dona pode reenviar a proposta'}, status=403)

        

        if proposta.status != 'rejeitada':

            return Response({'error': 'Apenas propostas rejeitadas podem ser reenviadas'}, status=400)

        

        # Atualizar dados da proposta

        proposta.valor_proposta = request.data.get('valor_proposta', proposta.valor_proposta)

        proposta.descricao = request.data.get('descricao', proposta.descricao)

        proposta.quantidade_produtos = request.data.get('quantidade_produtos', proposta.quantidade_produtos)

        

        # Resetar status para enviada

        proposta.status = 'enviada'

        proposta.data_validacao = None

        proposta.validado_por = None

        proposta.motivo_rejeicao = None

        

        # Se houver novo PDF

        if 'arquivo_pdf' in request.FILES:

            proposta.arquivo_pdf = request.FILES['arquivo_pdf']

        

        proposta.save()

        

        # Recalcular pontos

        calcular_pontos_proposta(proposta)

        atualizar_ranking()

        

        return Response({

            'message': 'Proposta reenviada com sucesso',

            'status': proposta.status

        })

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)



@api_view(['DELETE'])

@permission_classes([IsAuthenticated])

def apagar_proposta(request, proposta_id):

    """Permitir que equipe apague uma proposta rejeitada"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        perfil = request.user.perfil_acesso

        

        # Apenas a equipe dona pode apagar

        if perfil.nivel != 'equipe' or proposta.equipe != perfil.equipe:

            return Response({'error': 'Apenas a equipe dona pode apagar a proposta'}, status=403)

        

        if proposta.status != 'rejeitada':

            return Response({'error': 'Apenas propostas rejeitadas podem ser apagadas'}, status=400)

        

        proposta.delete()

        atualizar_ranking()

        

        return Response({'message': 'Proposta apagada com sucesso'})

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def dashboard_gestor(request):

    """Dashboard específico para o gestor"""

    

    perfil = request.user.perfil_acesso

    

    if perfil.nivel == 'gestor':
        # Gestor tem visão global
        equipes = Equipe.objects.all()
        propostas = Proposta.objects.all()

    elif perfil.nivel == 'administrador':

        # Admin vê tudo

        equipes = Equipe.objects.all()

        propostas = Proposta.objects.all()

    else:

        return Response({'error': 'Acesso negado'}, status=403)

    

    # Métricas

    total_equipes = equipes.count()

    total_propostas = propostas.count()

    propostas_pendentes = propostas.filter(status='enviada').count()

    propostas_validadas = propostas.filter(status='validada').count()

    propostas_rejeitadas = propostas.filter(status='rejeitada').count()

    

    # Dados por equipe

    equipes_data = []

    status_atual = StatusSistema.get_status_atual()

    for equipe in equipes:

        propostas_equipe = propostas.filter(equipe=equipe)

        equipes_data.append({

            'equipe': equipe.nome,

            'total_propostas': propostas_equipe.count(),

            'propostas_pendentes': propostas_equipe.filter(status='enviada').count(),

            'propostas_validadas': propostas_equipe.filter(status='validada').count(),

            'propostas_rejeitadas': propostas_equipe.filter(status='rejeitada').count(),

        })

    

    return Response({
        'total_equipes': total_equipes,

        'total_propostas': total_propostas,

        'propostas_pendentes': propostas_pendentes,

        'propostas_validadas': propostas_validadas,

        'propostas_rejeitadas': propostas_rejeitadas,

        'taxa_validacao': round((propostas_validadas / total_propostas * 100) if total_propostas > 0 else 0, 2),

        'equipes': equipes_data,

        'status_sistema': status_atual

    })



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_ranking_tempo_real')

def ranking_banca(request):

    """Ranking em tempo real para a banca"""

    

    status_atual = StatusSistema.get_status_atual()

    

    # Obter ranking do estado atual (respeita regra de zerar no Pós-Workshop)
    ranking_qs = Ranking.objects.filter(estado_sistema=status_atual).select_related('equipe').order_by('posicao')
    ranking_data = []

    for item in ranking_qs:
        ranking_data.append({
            'equipe': item.equipe.nome,
            'equipe_id': item.equipe.id,
            'posicao': item.posicao,
            'pontos': item.pontos,
            'propostas_enviadas': item.propostas_enviadas,
            'propostas_validadas': item.propostas_validadas,
            'vendas_concretizadas': item.vendas_concretizadas,
            'valor_total_vendas': item.valor_total_vendas,
        })

    

    return Response({

        'estado_atual': status_atual,

        'estado_display': dict(StatusSistema.STATUS_CHOICES)[status_atual],

        'ranking': ranking_data,

        'total_equipes': len(ranking_data)

    })



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_dashboard_geral')

def dashboard_banca(request):

    """Dashboard específico para a banca com dados em tempo real"""



    # Dados gerais
    status_atual = StatusSistema.get_status_atual()

    if status_atual == 'pos_workshop':
        # No Pós-Workshop, o foco é em vendas validadas pelo gestor
        total_propostas = Proposta.objects.filter(status='vendida', venda_validada=True).count()
        propostas_validadas = total_propostas
    else:
        # Outros estados (Workshop), o foco é em propostas validadas
        total_propostas = Proposta.objects.filter(status='validada').count()
        propostas_validadas = total_propostas
        
    propostas_enviadas = 0  # Não mostrar enviadas na dashboard da banca
    propostas_rejeitadas = Proposta.objects.filter(status='rejeitada').count()
    vendas_concretizadas = Proposta.objects.filter(status='vendida', venda_validada=True).count()



    # Workshop: faturamento previsto (soma do valor das propostas VALIDADAS)

    faturamento_previsto = Proposta.objects.filter(

        status='validada'

    ).aggregate(

        total=Coalesce(Sum('valor_proposta'), Value(0), output_field=FloatField())

    )['total'] or 0



    # Pós-workshop: faturamento realizado (soma das vendas validadas pelo gestor)
    faturamento_realizado = Proposta.objects.filter(
        status='vendida',
        venda_validada=True
    ).aggregate(
        total=Coalesce(Sum('valor_venda'), Value(0), output_field=FloatField())
    )['total'] or 0

    

    # Mix de produtos - apenas propostas validadas
    # No pós-workshop: apenas vendas validadas
    # Fora do pós-workshop: apenas propostas validadas
    if status_atual == 'pos_workshop':
        mix_produtos = Proposta.objects.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(
            total_produtos=Coalesce(Sum('quantidade_produtos'), 0)
        )['total_produtos'] or 0
    else:
        mix_produtos = Proposta.objects.filter(
            status='validada'
        ).aggregate(
            total_produtos=Coalesce(Sum('quantidade_produtos'), 0)
        )['total_produtos'] or 0

    

    # Dados por equipe

    equipes_data = []

    equipes = Equipe.objects.filter(ativo=True)

    

    for equipe in equipes:

        # Dados por equipe - buscar TODAS as propostas da equipe primeiro
        propostas_equipe = Proposta.objects.filter(equipe=equipe)
        
        propostas_enviadas_equipe = propostas_equipe.filter(status='enviada').count()
        propostas_validadas_equipe = propostas_equipe.filter(status='validada').count()
        vendas_equipe = propostas_equipe.filter(status='vendida', venda_validada=True).count()

        if status_atual == 'pos_workshop':
            # Pós-Workshop: considerar apenas vendas validadas pelo gestor como "validadas"
            propostas_validadas_equipe = vendas_equipe

        # No Pós-Workshop, a banca quer ver propostas/produtos vendidos (somente após validação do gestor)
        produtos_vendidos_equipe = propostas_equipe.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(
            total=Coalesce(Sum('quantidade_produtos_venda'), 0)
        )['total'] or 0

        

        # Faturamento previsto por equipe: soma de propostas validadas

        faturamento_previsto_equipe = propostas_equipe.filter(

            status='validada'

        ).aggregate(

            total=Coalesce(Sum('valor_proposta'), Value(0), output_field=FloatField())

        )['total'] or 0

        # Faturamento realizado por equipe: soma das vendas validadas
        faturamento_realizado_equipe = propostas_equipe.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(
            total=Coalesce(Sum('valor_venda'), Value(0), output_field=FloatField())
        )['total'] or 0

        # Quantidade de produtos por equipe
        # IMPORTANTE: Dashboard banca mostra APENAS propostas validadas
        # - No pós-workshop: somatório apenas das vendas validadas
        # - Fora do pós-workshop: somatório apenas das propostas validadas
        if status_atual == 'pos_workshop':
            quantidade_produtos_equipe = produtos_vendidos_equipe
        else:
            # Mostrar apenas produtos de propostas validadas
            quantidade_produtos_equipe = propostas_equipe.filter(
                status='validada'
            ).aggregate(
                total=Coalesce(Sum('quantidade_produtos'), 0)
            )['total'] or 0

        

        pontos_equipe = propostas_equipe.filter(

            status__in=['validada', 'vendida']

        ).aggregate(

            total=Coalesce(Sum('pontos'), 0)

        )['total'] or 0

        

        equipes_data.append({

            'equipe': equipe.nome,

            'propostas_enviadas': propostas_enviadas_equipe,

            'propostas_validadas': propostas_validadas_equipe,

            'vendas_concretizadas': vendas_equipe,

            'quantidade_produtos': quantidade_produtos_equipe,
            'produtos_vendidos': produtos_vendidos_equipe,
            'propostas_vendidas_validada': vendas_equipe,

            'faturamento_previsto': faturamento_previsto_equipe,

            'faturamento_realizado': faturamento_realizado_equipe,

            'pontos': pontos_equipe

        })

    

    return Response({

        'total_propostas': total_propostas,

        'propostas_enviadas': propostas_enviadas,

        'propostas_validadas': propostas_validadas,

        'propostas_rejeitadas': propostas_rejeitadas,

        'vendas_concretizadas': vendas_concretizadas,

        'faturamento_previsto': faturamento_previsto,

        'faturamento_realizado': faturamento_realizado,

        'mix_produtos': mix_produtos,

        'taxa_validacao': round((propostas_validadas / propostas_enviadas * 100) if propostas_enviadas > 0 else 0, 2),

        'taxa_conversao': round((vendas_concretizadas / propostas_validadas * 100) if propostas_validadas > 0 else 0, 2),

        'equipes': equipes_data,

        'status_sistema': status_atual

    })



def recalcular_todos_pontos():

    """Recalcular pontos de todas as propostas para todos os estados"""

    propostas = Proposta.objects.all()

    

    for proposta in propostas:

        proposta.pontos = 0

        

        # Recalcular pontos para cada estado

        for estado, _ in StatusSistema.STATUS_CHOICES:

            # Pontos por envio

            regras_envio = RegraPontuacao.objects.filter(

                ativa=True, 

                tipo='proposta_enviada',

                estado_sistema=estado

            )

            pontos_envio = sum(regra.pontos for regra in regras_envio)

            

            # Pontos por validação

            pontos_validacao = 0

            pontos_produtos = 0

            if proposta.status == 'validada':

                # Usar configuração da banca

                from .models import ConfiguracaoPontuacao

                config = ConfiguracaoPontuacao.get_configuracao()

                

                # Pontos fixos por proposta validada

                pontos_validacao = config.pontos_proposta_validada

                

                # Pontos por quantidade de produtos

                pontos_produtos = config.pontos_por_produto * proposta.quantidade_produtos

            

            # Pontos por venda

            pontos_venda = 0

            if proposta.status == 'vendida' and proposta.venda_validada:

                regras_venda = RegraPontuacao.objects.filter(

                    ativa=True, 

                    tipo='venda_concretizada',

                    estado_sistema=estado

                )

                pontos_venda = sum(regra.pontos for regra in regras_venda)

            

            # Total de pontos para este estado

            pontos_estado = pontos_envio + pontos_validacao + pontos_produtos + pontos_venda

            

            # Atualizar ranking para este estado

            Ranking.objects.update_or_create(

                equipe=proposta.equipe,

                estado_sistema=estado,

                defaults={

                    'pontos': pontos_estado

                }

            )

    

    # Atualizar ranking atual

    atualizar_ranking()





# === APIs PARA BANCA - REGRAS DE PONTUAÇÃO ===


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_gerenciar_regras_pontuacao')
def configuracao_pontuacao_api(request):
    """API para configuração de pontuação (banca)"""
    
    if request.method == 'GET':
        config = ConfiguracaoPontuacao.get_configuracao()
        serializer = ConfiguracaoPontuacaoSerializer(config)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        config = ConfiguracaoPontuacao.get_configuracao()
        
        # Atualizar campos enviados
        if 'pontos_proposta_validada' in request.data:
            config.pontos_proposta_validada = request.data.get('pontos_proposta_validada')
        if 'pontos_por_produto' in request.data:
            config.pontos_por_produto = request.data.get('pontos_por_produto')
            
        config.atualizado_por = request.user
        config.save()
        
        # Recalcular pontos de todas as propostas validadas
        from .models import Proposta
        propostas_validadas = Proposta.objects.filter(status__in=['validada', 'vendida'])
        for proposta in propostas_validadas:
            calcular_pontos_proposta(proposta)
        
        # Atualizar ranking
        atualizar_ranking()
        
        serializer = ConfiguracaoPontuacaoSerializer(config)
        return Response(serializer.data)


@api_view(['GET', 'PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_gerenciar_regras_pontuacao')

def regra_proposta_validada_api(request):

    """API para configuração de pontos por proposta validada"""

    if request.method == 'GET':

        config = ConfiguracaoPontuacao.get_configuracao()

        serializer = ConfiguracaoPontuacaoSerializer(config)

        return Response(serializer.data)

    

    elif request.method == 'PUT':

        config = ConfiguracaoPontuacao.get_configuracao()

        config.pontos_proposta_validada = request.data.get('pontos_proposta_validada', config.pontos_proposta_validada)

        config.atualizado_por = request.user

        config.save()

        # Recalcular pontos de todas as propostas validadas com as novas regras
        from .models import Proposta
        propostas_validadas = Proposta.objects.filter(status__in=['validada', 'vendida'])
        for proposta in propostas_validadas:
            calcular_pontos_proposta(proposta)
        
        # Atualizar ranking
        atualizar_ranking()

        serializer = ConfiguracaoPontuacaoSerializer(config)

        return Response(serializer.data)



@api_view(['GET', 'PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_gerenciar_regras_pontuacao')

def regra_venda_produto_api(request):

    """API para configuração de pontos por produto vendido"""

    try:

        if request.method == 'GET':

            config = ConfiguracaoPontuacao.get_configuracao()

            serializer = ConfiguracaoPontuacaoSerializer(config)

            return Response(serializer.data)

        

        elif request.method == 'PUT':

            config = ConfiguracaoPontuacao.get_configuracao()

            config.pontos_por_produto = request.data.get('pontos_por_produto', config.pontos_por_produto)

            config.atualizado_por = request.user

            config.save()

            # Recalcular pontos de todas as propostas validadas com as novas regras
            from .models import Proposta
            propostas_validadas = Proposta.objects.filter(status__in=['validada', 'vendida'])
            for proposta in propostas_validadas:
                calcular_pontos_proposta(proposta)
            
            # Atualizar ranking
            atualizar_ranking()

            serializer = ConfiguracaoPontuacaoSerializer(config)

            return Response(serializer.data)

    except Exception as e:

        logger.error(f"Erro em regra_venda_produto_api: {str(e)}")

        return Response({'error': str(e)}, status=500)



# === APIs PARA EQUIPES - VENDAS CONCRETIZADAS ===



@api_view(['GET', 'POST'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_marcar_vendas')

def vendas_api(request):

    """API para vendas concretizadas (pós-workshop)"""

    perfil = get_perfil_acesso_usuario(request)

    

    print(f"DEBUG: Vendas API - Usuário: {request.user.username}")

    print(f"DEBUG: Vendas API - Perfil: {perfil}")

    print(f"DEBUG: Vendas API - Nível: {perfil.nivel if perfil else 'None'}")

    print(f"DEBUG: Vendas API - Status sistema: {StatusSistema.get_status_atual()}")

    

    if request.method == 'GET':

        vendas = Venda.objects.all()

        if perfil and perfil.nivel == 'equipe' and perfil.equipe:

            vendas = vendas.filter(proposta__equipe=perfil.equipe)

        

        serializer = VendaSerializer(vendas, many=True)

        return Response(serializer.data)

    

    elif request.method == 'POST':

        print(f"DEBUG: Vendas API - Dados recebidos: {request.data}")

        serializer = VendaSerializer(data=request.data)

        if serializer.is_valid():

            # Verificar se a proposta pertence à equipe (caso seja usuário equipe)

            proposta_id = serializer.validated_data['proposta'].id

            if perfil and perfil.nivel == 'equipe' and perfil.equipe:

                if not Proposta.objects.filter(id=proposta_id, equipe=perfil.equipe).exists():

                    return Response({'error': 'Proposta não pertence à sua equipe'}, status=status.HTTP_403_FORBIDDEN)

            

            serializer.save()

            print(f"DEBUG: Vendas API - Venda criada com sucesso")

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:

            print(f"DEBUG: Vendas API - Erros serializer: {serializer.errors}")

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'PUT', 'DELETE'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_marcar_vendas')

def venda_detail_api(request, pk):

    """API para detalhes/edição/exclusão de venda"""

    try:

        venda = Venda.objects.get(pk=pk)

        perfil = get_perfil_acesso_usuario(request)

        

        # Verificar permissão (apenas admin ou equipe da proposta)

        if perfil and perfil.nivel == 'equipe' and perfil.equipe:

            if venda.proposta.equipe != perfil.equipe:

                return Response({'error': 'Venda não pertence à sua equipe'}, status=status.HTTP_403_FORBIDDEN)

        

    except Venda.DoesNotExist:

        return Response({'error': 'Venda não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    

    if request.method == 'PUT':

        serializer = VendaSerializer(venda, data=request.data, partial=True)

        if serializer.is_valid():

            serializer.save()

            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    

    elif request.method == 'DELETE':

        venda.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_marcar_vendas')

def propostas_validadas_api(request):

    """API para listar propostas disponíveis para registrar vendas (enviadas e validadas)"""

    try:

        perfil = get_perfil_acesso_usuario(request)

        print(f"DEBUG: Propostas para venda - Usuário: {request.user.username} - Nível: {perfil.nivel if perfil else 'None'}")

        

        # Equipes podem registrar vendas de propostas enviadas

        # Gestores/admins veem apenas propostas validadas para validar vendas

        if perfil and perfil.nivel == 'equipe':

            propostas = Proposta.objects.filter(status='validada')

            print(f"DEBUG: Propostas para venda - Equipe: propostas enviadas")

        else:

            propostas = Proposta.objects.filter(status='validada')

            print(f"DEBUG: Propostas para venda - Gestor/Admin: propostas validadas")

        

        print(f"DEBUG: Propostas para venda - Total encontradas: {propostas.count()}")

        

        if perfil and perfil.nivel == 'equipe' and perfil.equipe:

            propostas = propostas.filter(equipe=perfil.equipe)

            print(f"DEBUG: Propostas para venda - Filtradas por equipe: {propostas.count()}")

        

        # Excluir propostas que já têm venda

        from api.models import Venda

        propostas_com_venda = Venda.objects.values_list('proposta_id', flat=True)

        propostas = propostas.exclude(id__in=propostas_com_venda)

        print(f"DEBUG: Propostas para venda - Excluindo vendas: {propostas.count()}")

        

        serializer = PropostaSerializer(propostas, many=True)

        print(f"DEBUG: Propostas para venda - Serializer OK")

        return Response(serializer.data)

        

    except Exception as e:

        print(f"DEBUG: Propostas para venda - Erro: {str(e)}")

        import traceback

        traceback.print_exc()

        return Response({'error': f'Erro interno: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_equipe(request):
    """Dashboard específico para a equipe - usuário tratado diretamente como entidade"""
    try:
        print(f"DEBUG dashboard_equipe: Usuário autenticado: {request.user.username}")
        
        # Forçar refresh do perfil do banco de dados
        try:
            perfil = request.user.perfil_acesso
            # Recarregar do banco para garantir que temos os dados mais recentes
            perfil.refresh_from_db()
            print(f"DEBUG dashboard_equipe: Perfil encontrado - Nível: {perfil.nivel}")
        except PerfilAcesso.DoesNotExist:
            logger.error(f'Perfil não encontrado para usuário: {request.user.username}')
            print(f"DEBUG dashboard_equipe: ERRO - Perfil não encontrado para {request.user.username}")
            return Response({
                'error': 'Perfil de acesso não encontrado',
                'message': 'Entre em contato com o administrador para configurar seu perfil',
                'username': request.user.username
            }, status=403)

        if perfil.nivel != 'equipe':
            logger.warning(f'Usuário {request.user.username} tentou acessar dashboard de equipe com nível {perfil.nivel}')
            print(f"DEBUG dashboard_equipe: ERRO - Nível incorreto: {perfil.nivel}")
            return Response({
                'error': 'Acesso negado',
                'message': 'Este dashboard é apenas para equipes',
                'nivel_atual': perfil.nivel
            }, status=403)

        # NOVA LÓGICA: Usuário é tratado diretamente como a entidade
        # Não precisa mais de equipe associada
        
        logger.info(f'Usuário {request.user.username} acessando dashboard como entidade direta')
        print(f"DEBUG dashboard_equipe: Usuário {request.user.username} tratado como entidade direta")
        
        # Obter status atual do sistema
        try:
            status_atual = StatusSistema.get_status_atual()
            status_display = StatusSistema.get_status_display()
        except:
            status_atual = 'pre_workshop'
            status_display = 'Pré-Workshop'
        
        # Buscar dados diretamente associados ao usuário
        try:
            # Propostas associadas diretamente ao usuário
            propostas = Proposta.objects.filter(usuario_criacao=request.user)
            total_propostas = propostas.count()
            
            # Vendas associadas diretamente ao usuário  
            vendas = Venda.objects.filter(usuario=request.user)
            total_vendas = vendas.count()
            valor_total_vendas = vendas.aggregate(total=Sum('valor'))['total'] or 0
            
            # Previsões associadas diretamente ao usuário
            previsoes = PrevisaoWorkshop.objects.filter(usuario=request.user)
            total_previsoes = previsoes.count()
            valor_previsto = previsoes.aggregate(total=Sum('valor_previsto'))['total'] or 0
            
            print(f"DEBUG dashboard_equipe: Dados encontrados - Propostas: {total_propostas}, Vendas: {total_vendas}, Previsões: {total_previsoes}")
            
        except Exception as e:
            print(f"DEBUG dashboard_equipe: Erro ao buscar dados: {str(e)}")
            # Valores padrão se houver erro
            total_propostas = 0
            total_vendas = 0
            valor_total_vendas = 0
            total_previsoes = 0
            valor_previsto = 0
        
        # Montar resposta
        response_data = {
            'usuario': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'nivel': perfil.nivel,
                'nivel_display': perfil.get_nivel_display()
            },
            'equipe_info': {
                'nome': f'Equipe {request.user.username.replace("equipe", "")}',
                'codigo': request.user.username.upper(),
                'regional': 'São Paulo',  # Padrão, pode ser configurado depois
                'descricao': f'Usuário {request.user.username} operando como equipe'
            },
            'status_sistema': {
                'atual': status_atual,
                'display': status_display
            },
            'estatisticas': {
                'total_propostas': total_propostas,
                'total_vendas': total_vendas,
                'valor_total_vendas': float(valor_total_vendas),
                'total_previsoes': total_previsoes,
                'valor_previsto': float(valor_previsto)
            },
            'permissoes': {
                'pode_enviar_propostas': perfil.pode_enviar_propostas(),
                'pode_marcar_vendas': perfil.pode_marcar_vendas(),
                'pode_ver_ranking': perfil.pode_ver_ranking()
            }
        }
        
        logger.info(f'Dashboard montado com sucesso para usuário {request.user.username}')
        print(f"DEBUG dashboard_equipe: Response data montada com sucesso")
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f'Erro no dashboard_equipe: {str(e)}')
        print(f"DEBUG dashboard_equipe: ERRO GERAL: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return Response({
            'error': 'Erro ao carregar dashboard',
            'message': 'Ocorreu um erro interno. Tente novamente mais tarde.',
            'debug': str(e)
        }, status=500)
        

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_marcar_vendas')
def vendas_concretizadas(request):
    """Gerenciar vendas concretizadas pela equipe"""
    perfil = request.user.perfil_acesso
    
    if request.method == 'GET':
        # Listar propostas da equipe para marcar como vendidas
        # Permite 'validada' (nova venda) ou 'nao_vendida' (venda rejeitada que precisa ser corrigida/reenviada)
        propostas = Proposta.objects.filter(
            equipe=perfil.equipe,
            status__in=['validada', 'nao_vendida']
        ).order_by('-data_envio')
        
        serializer = PropostaSerializer(propostas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Marcar proposta como vendida
        proposta_id = request.data.get('proposta_id')
        valor_venda = request.data.get('valor_venda')
        cliente_venda = request.data.get('cliente_venda')
        quantidade_produtos = request.data.get('quantidade_produtos')
        quantidade_produtos_venda = request.data.get('quantidade_produtos_venda', 0)
        observacoes = request.data.get('observacoes', '')
        
        if not proposta_id or not valor_venda or not cliente_venda or not quantidade_produtos_venda:
            return Response({'error': 'proposta_id, valor_venda, cliente_venda e quantidade_produtos_venda são obrigatórios'}, status=400)
        
        try:
            proposta = Proposta.objects.get(
                id=proposta_id,
                equipe=perfil.equipe,
                status__in=['validada', 'nao_vendida'] # Permitir reenviar se foi rejeitada
            )
            
            proposta.status = 'vendida'
            proposta.valor_venda = valor_venda
            proposta.cliente_venda = cliente_venda
            
            if quantidade_produtos:
                proposta.quantidade_produtos = quantidade_produtos
                
            proposta.quantidade_produtos_venda = quantidade_produtos_venda
            proposta.observacoes_venda = observacoes
            proposta.data_venda = timezone.now()
            
            def parse_bool(val):
                if isinstance(val, bool): return val
                return str(val).lower() in ['true', '1', 'yes', 't']

            # Atualizar bônus se enviados
            if 'bonus_vinhos_casa_perini_mundo' in request.data:
                proposta.bonus_vinhos_casa_perini_mundo = parse_bool(request.data.get('bonus_vinhos_casa_perini_mundo'))
            if 'bonus_vinhos_fracao_unica' in request.data:
                proposta.bonus_vinhos_fracao_unica = parse_bool(request.data.get('bonus_vinhos_fracao_unica'))
            if 'bonus_espumantes_vintage' in request.data:
                proposta.bonus_espumantes_vintage = parse_bool(request.data.get('bonus_espumantes_vintage'))
            if 'bonus_espumantes_premium' in request.data:
                proposta.bonus_espumantes_premium = parse_bool(request.data.get('bonus_espumantes_premium'))
            if 'bonus_aceleracao' in request.data:
                proposta.bonus_aceleracao = parse_bool(request.data.get('bonus_aceleracao'))

            # Atualizar PDF se enviado
            if 'arquivo_pdf' in request.FILES:
                proposta.arquivo_pdf = request.FILES['arquivo_pdf']

            proposta.venda_validada = False
            proposta.data_validacao_venda = None
            proposta.venda_validada_por = None
            proposta.motivo_rejeicao_venda = None
            proposta.data_rejeicao_venda = None
            proposta.save()
            
            return Response({
                'message': 'Venda registrada com sucesso e enviada para validação do gestor',
                'proposta': PropostaSerializer(proposta).data
            })
            
        except Proposta.DoesNotExist:
            return Response({'error': 'Proposta não encontrada ou não pode ser marcada como vendida'}, status=404)
        except Exception as e:
            return Response({'error': f'Erro ao marcar venda: {str(e)}'}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_validar_vendas')
def validar_vendas(request):
    """Validar vendas marcadas pelas equipes (gestor/admin)"""
    perfil = request.user.perfil_acesso
    
    if request.method == 'GET':
        # Listar vendas aguardando validação
        if perfil.nivel == 'administrador':
            propostas = Proposta.objects.filter(
                status='vendida',
                venda_validada=False
            )
        else:  # gestor
            # Gestor vê todas as propostas
            propostas = Proposta.objects.filter(
                status='vendida',
                venda_validada=False
            )
        
        serializer = PropostaSerializer(propostas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Validar/rejeitar venda
        proposta_id = request.data.get('proposta_id')
        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'
        motivo = request.data.get('motivo', '')
        
        if not proposta_id or not acao:
            return Response({'error': 'proposta_id e acao são obrigatórios'}, status=400)
        
        if acao not in ['validar', 'rejeitar']:
            return Response({'error': 'ação deve ser "validar" ou "rejeitar"'}, status=400)
        
        try:
            if perfil.nivel == 'administrador':
                proposta = Proposta.objects.get(
                    id=proposta_id,
                    status='vendida',
                    venda_validada=False
                )
            else:  # gestor
                filtros = {
                    'id': proposta_id,
                    'status': 'vendida',
                    'venda_validada': False,
                }
                proposta = Proposta.objects.get(**filtros)
            
            if acao == 'validar':
                proposta.venda_validada = True
                proposta.data_validacao_venda = timezone.now()
                proposta.venda_validada_por = request.user
                proposta.motivo_rejeicao_venda = None
                proposta.data_rejeicao_venda = None
                message = 'Venda validada com sucesso'
            else:  # rejeitar
                proposta.status = 'nao_vendida'
                proposta.venda_validada = False
                proposta.motivo_rejeicao_venda = motivo
                proposta.data_rejeicao_venda = timezone.now()
                # Limpar campos de validação se houver
                proposta.data_validacao_venda = None
                proposta.venda_validada_por = None
                message = 'Venda rejeitada com sucesso'
            
            proposta.save()

            # Recalcular pontos e ranking
            # Importante: se rejeitada, os pontos devem ser zerados/recalculados
            calcular_pontos_proposta(proposta)
            atualizar_ranking()
            
            return Response({
                'message': message,
                'proposta': PropostaSerializer(proposta).data
            })
            
        except Proposta.DoesNotExist:
            return Response({'error': 'Proposta não encontrada ou não pode ser validada'}, status=404)
        except Exception as e:
            return Response({'error': f'Erro ao validar venda: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_marcar_vendas')
def todas_propostas_equipe(request):
    """Listar todas as propostas da equipe com status"""
    perfil = request.user.perfil_acesso
    
    # Todas as propostas da equipe
    propostas = Proposta.objects.filter(equipe=perfil.equipe).order_by('-data_envio')
    
    serializer = PropostaSerializer(propostas, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_marcar_vendas')
def minhas_vendas_concretizadas(request):
    """Listar vendas da equipe (vendidas e validadas)"""
    perfil = request.user.perfil_acesso
    
    # Propostas vendidas pela equipe
    propostas_vendidas = Proposta.objects.filter(
        equipe=perfil.equipe,
        status='vendida'
    )

    # Separar em aguardando validação e validadas
    aguardando_validacao = propostas_vendidas.filter(venda_validada=False)
    vendas_validadas = propostas_vendidas.filter(venda_validada=True)

    # Vendas rejeitadas (mantém histórico no status nao_vendida)
    vendas_rejeitadas = Proposta.objects.filter(
        equipe=perfil.equipe,
        status='nao_vendida'
    )

    return Response({
        'aguardando_validacao': PropostaSerializer(aguardando_validacao, many=True).data,
        'vendas_validadas': PropostaSerializer(vendas_validadas, many=True).data,
        'vendas_rejeitadas': PropostaSerializer(vendas_rejeitadas, many=True).data,
        'total_aguardando': aguardando_validacao.count(),
        'total_validadas': vendas_validadas.count(),
        'total_rejeitadas': vendas_rejeitadas.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_regionais(request):
    """Listar todas as regionais disponíveis"""
    try:
        # Por enquanto, retorna regionais hardcoded
        # Futuramente pode vir de um modelo Regional
        regionais = [
            {'id': 1, 'nome': 'São Paulo', 'sigla': 'SP'},
            {'id': 2, 'nome': 'Rio de Janeiro', 'sigla': 'RJ'},
            {'id': 3, 'nome': 'Minas Gerais', 'sigla': 'MG'},
            {'id': 4, 'nome': 'Bahia', 'sigla': 'BA'},
        ]
        return Response(regionais)
    except Exception as e:
        return Response({'error': f'Erro ao listar regionais: {str(e)}'}, status=500)



