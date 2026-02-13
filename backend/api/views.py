import logging



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

    UserSerializer, RegionalSerializer, VendedorSerializer, ClienteSerializer,

    WorkshopSerializer, PrevisaoWorkshopSerializer, ResultadoPosWorkshopSerializer,

    DashboardGeralSerializer, DashboardRegionalSerializer, DashboardVendedorSerializer,

    EquipeSerializer, StatusSistemaSerializer, PerfilAcessoSerializer, LoginSerializer,

    PropostaSerializer, RegraPontuacaoSerializer, RegraBonusSerializer, 

    ConfiguracaoPontuacaoSerializer, VendaSerializer

)

from .models import Regional, Vendedor, Cliente, Workshop, PrevisaoWorkshop, ResultadoPosWorkshop, PerfilAcesso, Equipe, StatusSistema, Proposta, RegraPontuacao, Ranking, RegraBonus, ConfiguracaoPontuacao, Venda



logger = logging.getLogger(__name__)



class UserViewSet(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = UserSerializer

    permission_classes = [AllowAny]



class RegionalViewSet(viewsets.ModelViewSet):

    queryset = Regional.objects.all()

    serializer_class = RegionalSerializer

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

    elif perfil_acesso.nivel == 'regional' and perfil_acesso.regional:

        queryset_previsto = queryset_previsto.filter(workshop__regional=perfil_acesso.regional)

        queryset_realizado = queryset_realizado.filter(workshop__regional=perfil_acesso.regional)

    

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

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_todas_regionais')

def dashboard_regional(request, regional_id=None):

    """Dashboard por regional"""

    

    perfil_acesso = get_perfil_acesso_usuario(request)

    

    if regional_id:

        # Verificar permissão

        if perfil_acesso and not perfil_acesso.pode_ver_regional(regional_id):

            return Response({'error': 'Acesso negado a esta regional'}, status=403)

        

        # Dashboard de uma regional específica

        regional = Regional.objects.get(id=regional_id)

        

        # Dados previstos

        queryset_previsto = PrevisaoWorkshop.objects.filter(workshop__regional=regional)

        queryset_realizado = ResultadoPosWorkshop.objects.filter(workshop__regional=regional)

        

        # Aplicar filtros adicionais de acesso

        queryset_previsto, queryset_realizado = filtrar_dados_por_acesso(

            queryset_previsto, queryset_realizado, perfil_acesso

        )

        

        dados_previstos = queryset_previsto.aggregate(

            faturamento_previsto=Coalesce(Sum('faturamento_total_previsto'), 0),

            propostas_previstas=Coalesce(Sum('numero_propostas'), 0)

        )

        

        dados_realizados = queryset_realizado.aggregate(

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

        

        data = [{

            'regional': regional.nome,

            'faturamento_previsto': faturamento_previsto,

            'faturamento_realizado': faturamento_realizado,

            'propostas_previstas': propostas_previstas,

            'propostas_fechadas': propostas_fechadas,

            'taxa_conversao': round(taxa_conversao, 2),

            'desempenho_faturamento': round(desempenho_faturamento, 2),

            'diferenca_faturamento': diferenca_faturamento

        }]

        

    else:

        # Dashboard de todas as regionais (respeitando o nível de acesso)

        if perfil_acesso:

            if perfil_acesso.nivel == 'geral':

                regionais = Regional.objects.all()

            elif perfil_acesso.nivel == 'regional' and perfil_acesso.regional:

                regionais = Regional.objects.filter(id=perfil_acesso.regional.id)

            else:

                regionais = Regional.objects.none()

        else:

            regionais = Regional.objects.all()

        

        data = []

        

        for regional in regionais:

            # Dados previstos

            queryset_previsto = PrevisaoWorkshop.objects.filter(workshop__regional=regional)

            queryset_realizado = ResultadoPosWorkshop.objects.filter(workshop__regional=regional)

            

            # Aplicar filtros adicionais de acesso

            queryset_previsto, queryset_realizado = filtrar_dados_por_acesso(

                queryset_previsto, queryset_realizado, perfil_acesso

            )

            

            dados_previstos = queryset_previsto.aggregate(

                faturamento_previsto=Coalesce(Sum('faturamento_total_previsto'), 0),

                propostas_previstas=Coalesce(Sum('numero_propostas'), 0)

            )

            

            dados_realizados = queryset_realizado.aggregate(

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

                'regional': regional.nome,

                'faturamento_previsto': faturamento_previsto,

                'faturamento_realizado': faturamento_realizado,

                'propostas_previstas': propostas_previstas,

                'propostas_fechadas': propostas_fechadas,

                'taxa_conversao': round(taxa_conversao, 2),

                'desempenho_faturamento': round(desempenho_faturamento, 2),

                'diferenca_faturamento': diferenca_faturamento

            })

    

    serializer = DashboardRegionalSerializer(data, many=True)

    return Response(serializer.data)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_ver_dados_equipe')

def dashboard_vendedor(request, vendedor_id=None, regional_id=None):

    """Dashboard por vendedor"""

    

    perfil_acesso = get_perfil_acesso_usuario(request)

    

    # Construir queryset base respeitando o nível de acesso

    if perfil_acesso:

        if perfil_acesso.nivel == 'geral':

            queryset = Vendedor.objects.all()

        elif perfil_acesso.nivel == 'regional' and perfil_acesso.regional:

            queryset = Vendedor.objects.filter(regional=perfil_acesso.regional)

        elif perfil_acesso.nivel == 'vendedor' and perfil_acesso.vendedor:

            queryset = Vendedor.objects.filter(id=perfil_acesso.vendedor.id)

        else:

            queryset = Vendedor.objects.none()

    else:

        queryset = Vendedor.objects.all()

    

    # Aplicar filtros adicionais da URL

    if regional_id:

        queryset = queryset.filter(regional_id=regional_id)

    

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

            'regional': vendedor.regional.nome,

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

        

        # Verificar permissão

        if perfil_acesso and not perfil_acesso.pode_ver_regional(workshop.regional.id):

            return Response({'error': 'Acesso negado a este workshop'}, status=403)

        

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

            'regional': workshop.regional.nome,

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

    

    # Usuário fixo para equipes

    user = authenticate(username='equipe', password=password)

    

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

                    'regional': perfil.regional.nome if perfil.regional else None

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

                'regional': equipe.regional.nome

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

    except PerfilAcesso.DoesNotExist:

        return Response({'error': 'Perfil de acesso não encontrado'}, status=403)



    if perfil.nivel != 'equipe':

        return Response({'error': 'Acesso negado'}, status=403)



    if not perfil.equipe:

        return Response({'error': 'Equipe não selecionada para este usuário'}, status=400)

    

    if request.method == 'GET':

        # Listar apenas propostas da equipe

        propostas = Proposta.objects.filter(equipe=perfil.equipe)

        serializer = PropostaSerializer(propostas, many=True)

        return Response(serializer.data)

    

    elif request.method == 'POST':

        # Criar nova proposta

        if not perfil.pode_enviar_propostas():

            return Response({

                'error': 'Envio de propostas não permitido no status atual',

                'status_atual': StatusSistema.get_status_atual()

            }, status=403)

        

        # Debug: Mostrar dados recebidos

        print(f"DEBUG: Dados recebidos: {request.data}")

        print(f"DEBUG: Arquivos: {request.FILES}")

        print(f"DEBUG: Content-Type: {request.content_type}")

        print(f"DEBUG: Método: {request.method}")

        

        # Criar objetos Cliente e Vendedor automaticamente

        try:

            # Validar campos obrigatórios

            cliente_nome = request.data.get('cliente', '').strip()

            vendedor_nome = request.data.get('vendedor', '').strip()

            valor_proposta = request.data.get('valor_proposta')

            

            if not cliente_nome:

                return Response({'error': 'Campo cliente é obrigatório'}, status=400)

            if not vendedor_nome:

                return Response({'error': 'Campo vendedor é obrigatório'}, status=400)

            if not valor_proposta:

                return Response({'error': 'Campo valor_proposta é obrigatório'}, status=400)

            

            # Converter valor_proposta para número

            try:

                # Remover formatação brasileira e converter para decimal

                valor_str = str(valor_proposta).replace('.', '').replace(',', '.')

                valor_proposta_decimal = float(valor_str)

                print(f"DEBUG: Valor convertido: {valor_proposta_decimal}")

            except (ValueError, TypeError):

                return Response({'error': 'Campo valor_proposta deve ser um número válido'}, status=400)

            

            # Criar ou obter vendedor primeiro

            vendedor, created_vendedor = Vendedor.objects.get_or_create(

                nome=vendedor_nome,

                defaults={

                    'codigo': f"VEN_{vendedor_nome.upper().replace(' ', '_')}",

                    'regional': perfil.equipe.regional,

                }

            )

            print(f"DEBUG: Vendedor {'criado' if created_vendedor else 'encontrado'}: {vendedor.nome}")

            

            # Criar ou obter cliente com o vendedor já definido

            cliente, created_cliente = Cliente.objects.get_or_create(

                nome=cliente_nome,

                defaults={

                    'codigo': f"CLI_{cliente_nome.upper().replace(' ', '_')}",

                    'vendedor': vendedor,  # Vendedor já existe

                }

            )

            print(f"DEBUG: Cliente {'criado' if created_cliente else 'encontrado'}: {cliente.nome}")

            

            # Se o cliente já existia sem vendedor, atualizar

            if not created_cliente and not cliente.vendedor:

                cliente.vendedor = vendedor

                cliente.save()

                print(f"DEBUG: Cliente existente atualizado com vendedor: {vendedor.nome}")

            

            # Obter workshop da equipe

            workshop = Workshop.objects.filter(regional=perfil.equipe.regional).first()

            if not workshop:

                return Response({'error': 'Nenhum workshop encontrado para esta regional'}, status=400)

            print(f"DEBUG: Workshop encontrado: {workshop.nome}")

            

            # Preparar dados da proposta

            proposta_data = {

                'equipe': perfil.equipe.id,

                'cliente': cliente.id,

                'vendedor': vendedor.id,

                'workshop': workshop.id,

                'valor_proposta': valor_proposta_decimal,

                'descricao': request.data.get('descricao', ''),

                'quantidade_produtos': request.data.get('quantidade_produtos', 0),

            }

            

            # Adicionar arquivo PDF se enviado

            if 'arquivo_pdf' in request.FILES:

                proposta_data['arquivo_pdf'] = request.FILES['arquivo_pdf']

                print(f"DEBUG: Arquivo PDF recebido: {request.FILES['arquivo_pdf'].name}")

            

            print(f"DEBUG: Dados da proposta preparados: {proposta_data}")

            

            # Validar e salvar

            serializer = PropostaSerializer(data=proposta_data)

            if serializer.is_valid():

                proposta = serializer.save()

                print(f"DEBUG: Proposta criada com ID: {proposta.id}")

                

                # Calcular pontos automaticamente

                calcular_pontos_proposta(proposta)

                

                # Atualizar ranking

                atualizar_ranking()

                

                return Response(serializer.data, status=201)

            else:

                print(f"DEBUG: Erros do serializer: {serializer.errors}")

                return Response(serializer.errors, status=400)

            

        except Exception as e:

            logger.error(f"Erro ao criar proposta: {str(e)}")

            print(f"DEBUG: Exceção: {str(e)}")

            return Response({'error': f'Erro ao criar proposta: {str(e)}'}, status=400)



@api_view(['GET'])

@permission_classes([IsAuthenticated])

def dashboard_equipe(request):

    """Dashboard específico para a equipe"""



    try:

        perfil = request.user.perfil_acesso

    except PerfilAcesso.DoesNotExist:

        return Response({'error': 'Perfil de acesso não encontrado'}, status=403)



    if perfil.nivel != 'equipe':

        return Response({'error': 'Acesso negado'}, status=403)



    if not perfil.equipe:

        return Response({'error': 'Equipe não selecionada para este usuário'}, status=400)



    try:

        # Propostas da equipe

        propostas = Proposta.objects.filter(equipe=perfil.equipe)



        # Métricas

        total_propostas = propostas.count()

        propostas_enviadas = propostas.filter(status='enviada').count()

        propostas_validadas = propostas.filter(status='validada').count()

        propostas_rejeitadas = propostas.filter(status='rejeitada').count()

        propostas_vendidas = propostas.filter(status='vendida').count()
        vendas_pendentes_validacao = propostas.filter(status='vendida', venda_validada=False).count()
        vendas_validadas = propostas.filter(status='vendida', venda_validada=True).count()
        vendas_rejeitadas = propostas.filter(status='nao_vendida').count()



        return Response({

            'equipe': perfil.equipe.nome,

            'equipe_id': perfil.equipe.id,

            'regional': perfil.equipe.regional.nome,

            'total_propostas': total_propostas,

            'propostas_enviadas': propostas_enviadas,

            'propostas_validadas': propostas_validadas,

            'propostas_rejeitadas': propostas_rejeitadas,

            'propostas_vendidas': propostas_vendidas,

            'vendas_concretizadas': vendas_validadas,
            'vendas_pendentes_validacao': vendas_pendentes_validacao,
            'vendas_validadas': vendas_validadas,
            'vendas_rejeitadas': vendas_rejeitadas,

            'status_sistema': StatusSistema.get_status_atual(),

            'pode_enviar_propostas': perfil.pode_enviar_propostas(),

            'pode_marcar_vendas': perfil.pode_marcar_vendas()

        })

    except Exception as e:

        logger.exception('Erro em dashboard_equipe')

        return Response({'error': str(e)}, status=500)



@api_view(['POST'])

@permission_classes([AllowAny])

def login_view(request):

    """Login único para equipes e login individual para outros perfis"""

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

            

            return Response({

                'token': token.key,

                'user': {

                    'id': user.id,

                    'username': user.username,

                    'nivel': perfil.nivel,

                    'nivel_display': perfil.get_nivel_display(),

                    'equipe': perfil.equipe.nome if perfil.equipe else None,

                    'regional': perfil.regional.nome if perfil.regional else None

                },

                'status_sistema': StatusSistema.get_status_atual()

            })

        except PerfilAcesso.DoesNotExist:

            return Response({'error': 'Perfil de acesso não encontrado'}, status=403)

    else:

        return Response({'error': 'Credenciais inválidas'}, status=401)



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

            equipe.delete()

            return Response({'message': 'Equipe removida com sucesso'}, status=200)

        except Equipe.DoesNotExist:

            return Response({'error': 'Equipe não encontrada'}, status=404)

    

    elif request.method == 'POST':

        serializer = EquipeSerializer(data=request.data)

        if serializer.is_valid():

            serializer.save()

            return Response(serializer.data, status=201)

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

                    'regional': perfil.regional.nome if perfil.regional else None,

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

                    'regional': None,

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

        user_data = {

            'username': request.data.get('username'),

            'password': request.data.get('password'),

            'email': request.data.get('email', '')

        }

        

        user_serializer = UserSerializer(data=user_data)

        if user_serializer.is_valid():

            user = user_serializer.save()

            

            # Criar perfil de acesso

            perfil_data = {

                'usuario': user.id,

                'nivel': request.data.get('nivel'),

                'equipe': request.data.get('equipe'),

                'regional': request.data.get('regional')

            }

            

            perfil_serializer = PerfilAcessoSerializer(data=perfil_data)

            if perfil_serializer.is_valid():

                perfil_serializer.save()

                return Response({

                    'user': user_serializer.data,

                    'perfil': perfil_serializer.data

                }, status=201)

            else:

                user.delete()  # Rollback se perfil for inválido

                return Response(perfil_serializer.errors, status=400)

        else:

            return Response(user_serializer.errors, status=400)

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

                'regional': perfil.regional.nome if perfil.regional else None,

                'ativo': perfil.ativo

            },

            'status_sistema': StatusSistema.get_status_atual(),

            'permissoes': {

                'pode_criar_equipes': perfil.pode_criar_equipes(),

                'pode_criar_usuarios': perfil.pode_criar_usuarios(),

                'pode_alterar_status_sistema': perfil.pode_alterar_status_sistema(),

                'pode_ver_todas_regionais': perfil.pode_ver_todas_regionais(),

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

            # Gestor vê propostas da sua regional

            propostas = Proposta.objects.filter(equipe__regional=perfil.regional)

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

    """Validar ou rejeitar proposta (apenas gestor durante workshop)"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        

        if proposta.status != 'enviada':

            return Response({'error': 'Proposta já foi processada'}, status=400)

        

        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'

        motivo = request.data.get('motivo', '')

        

        if acao == 'validar':

            proposta.status = 'validada'

            proposta.data_validacao = timezone.now()

            proposta.validado_por = request.user

            

            # Recalcular pontos: pontuação conta apenas a partir da validação

            calcular_pontos_proposta(proposta)

            

        elif acao == 'rejeitar':

            proposta.status = 'rejeitada'

            proposta.motivo_rejeicao = motivo

            proposta.data_validacao = timezone.now()

            proposta.validado_por = request.user

        

        proposta.save()

        atualizar_ranking()

        

        return Response({'message': f'Proposta {acao} com sucesso'})

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_marcar_vendas')

def marcar_venda(request, proposta_id):

    """Marcar proposta como vendida (apenas equipes durante pós-workshop)"""

    

    try:

        proposta = Proposta.objects.get(id=proposta_id)

        

        if proposta.status != 'validada':

            return Response({'error': 'Apenas propostas validadas podem ser marcadas como vendidas'}, status=400)

        

        # Marcar como vendida

        proposta.status = 'vendida'

        proposta.data_venda = timezone.now()

        proposta.valor_venda = request.data.get('valor_venda', proposta.valor_proposta)

        proposta.save()

        

        # Adicionar pontos por venda

        # Pontos de venda só fazem sentido após validação da venda pelo gestor,
        # então aqui apenas recalculamos o baseline (proposta validada)

        calcular_pontos_proposta(proposta)

        

        return Response({'message': 'Venda marcada com sucesso'})

        

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
        
        # Se for gestor, filtrar por regional
        if perfil.nivel == 'gestor' and perfil.regional:
            vendas = vendas.filter(proposta__equipe__regional=perfil.regional)
        
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
        
        # Se for gestor, verificar se pode acessar esta regional
        if perfil.nivel == 'gestor' and perfil.regional:
            if venda.proposta.equipe.regional != perfil.regional:
                return Response({'error': 'Acesso negado a esta venda'}, status=403)
        
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

    """Listar equipes para o gestor (apenas da sua regional)"""

    

    try:

        perfil = request.user.perfil_acesso

        print(f"DEBUG: Listar equipes - Usuário: {request.user.username} - Nível: {perfil.nivel}")

        print(f"DEBUG: Listar equipes - Regional: {perfil.regional}")

        

        if perfil.nivel == 'administrador':

            equipes = Equipe.objects.all()

            print(f"DEBUG: Listar equipes - Admin: todas as equipes ({equipes.count()})")

        elif perfil.nivel == 'gestor':

            equipes = Equipe.objects.filter(regional=perfil.regional) if perfil.regional else Equipe.objects.all()

            print(f"DEBUG: Listar equipes - Gestor: equipes da regional ({equipes.count()})")

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

        propostas = Proposta.objects.filter(equipe__regional=perfil.regional) if perfil.regional else Proposta.objects.all()

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

        print(f"DEBUG: Regional do gestor: {perfil.regional}")

        print(f"DEBUG: Regional da proposta: {proposta.equipe.regional}")

        

        # Verificar permissão

        if perfil.nivel == 'gestor':

            if not perfil.regional:

                print(f"DEBUG: Gestor sem regional - acesso permitido")

                # Permitir acesso se gestor não tem regional (gestor global)

            elif proposta.equipe.regional != perfil.regional:

                print(f"DEBUG: Regional diferente - acesso negado")

                return Response({'error': 'Acesso negado a esta proposta'}, status=403)

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

        

        # Verificar permissão por regional apenas se gestor tiver regional atribuída

        if perfil.nivel == 'gestor' and perfil.regional and proposta.equipe.regional != perfil.regional:

            return Response({'error': 'Acesso negado a esta proposta'}, status=403)

        

        if proposta.status != 'enviada':

            return Response({'error': 'Proposta já foi processada'}, status=400)

        

        acao = request.data.get('acao')  # 'validar' ou 'rejeitar'

        motivo = request.data.get('motivo', '')

        

        if acao == 'validar':

            proposta.status = 'validada'

            proposta.data_validacao = timezone.now()

            proposta.validado_por = request.user

            proposta.motivo_rejeicao = None

            

            # Recalcular pontos: pontuação passa a contar a partir da validação

            calcular_pontos_proposta(proposta)

            

        elif acao == 'rejeitar':

            if not motivo.strip():

                return Response({'error': 'Motivo da rejeição é obrigatório'}, status=400)

            

            proposta.status = 'rejeitada'

            proposta.motivo_rejeicao = motivo

            proposta.data_validacao = timezone.now()

            proposta.validado_por = request.user

        

        proposta.save()

        atualizar_ranking()

        

        return Response({

            'message': f'Proposta {acao} com sucesso',

            'status': proposta.status,

            'motivo_rejeicao': proposta.motivo_rejeicao

        })

        

    except Proposta.DoesNotExist:

        return Response({'error': 'Proposta não encontrada'}, status=404)



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

        # Se gestor tiver regional atribuída, filtra; senão, visão global

        equipes = Equipe.objects.filter(regional=perfil.regional) if perfil.regional else Equipe.objects.all()

        propostas = Proposta.objects.filter(equipe__regional=perfil.regional) if perfil.regional else Proposta.objects.all()

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

        'regional': perfil.regional.nome if perfil.regional else 'Todas',

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



    status_atual = StatusSistema.get_status_atual()


    # Dados gerais

    total_propostas = Proposta.objects.count()

    propostas_enviadas = Proposta.objects.filter(status='enviada').count()

    propostas_validadas = Proposta.objects.filter(status='validada').count()

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

    

    # Mix de produtos

    mix_produtos = Proposta.objects.filter(

        status__in=['validada', 'vendida']

    ).aggregate(

        total_produtos=Coalesce(Sum('quantidade_produtos'), 0)

    )['total_produtos'] or 0

    

    # Dados por equipe

    equipes_data = []

    equipes = Equipe.objects.filter(ativo=True)

    

    for equipe in equipes:

        propostas_equipe = Proposta.objects.filter(equipe=equipe)

        propostas_enviadas_equipe = propostas_equipe.count()

        propostas_validadas_equipe = propostas_equipe.filter(status='validada').count()

        vendas_equipe = propostas_equipe.filter(status='vendida', venda_validada=True).count()

        # No Pós-Workshop, a banca quer ver propostas/produtos vendidos (somente após validação do gestor)
        produtos_vendidos_equipe = propostas_equipe.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(
            total=Coalesce(Sum('quantidade_produtos'), 0)
        )['total'] or 0

        

        # Faturamento previsto por equipe: soma de propostas validadas/vendidas

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
        # - Fora do pós-workshop: somatório das propostas (visão geral)
        # - No pós-workshop: somatório apenas das vendas validadas
        if status_atual == 'pos_workshop':
            quantidade_produtos_equipe = produtos_vendidos_equipe
        else:
            quantidade_produtos_equipe = propostas_equipe.aggregate(
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



# Funções auxiliares de pontuação

def calcular_pontos_proposta(proposta):

    """Calcular pontos para uma proposta conforme estado atual.

    Lógica: 
    - Pontos por proposta validada: valor fixo por proposta validada
    - Pontos por produto: (quantidade de produtos × pontos por produto)
    - Total = pontos_proposta_validada + (quantidade_produtos × pontos_por_produto)
    - Soma aos pontos existentes da equipe
    """

    from .models import ConfiguracaoPontuacao

    status_atual = StatusSistema.get_status_atual()

    pontos = 0

    

    # Não pontua no envio

    

    # Pontos apenas se proposta estiver validada ou vendida

    if proposta.status in ['validada', 'vendida']:

        # Obter configuração de pontuação

        config = ConfiguracaoPontuacao.get_configuracao()

        

        # Pontos fixos por proposta validada

        pontos_proposta = config.pontos_proposta_validada or 0

        

        # Pontos por quantidade de produtos

        pontos_produtos = (proposta.quantidade_produtos or 0) * (config.pontos_por_produto or 0)

        

        # Total de pontos desta proposta

        pontos = pontos_proposta + pontos_produtos

        

        print(f"DEBUG: Cálculo de pontos - Proposta {proposta.id}")

        print(f"  - Status: {proposta.status}")

        print(f"  - Pontos por proposta: {pontos_proposta}")

        print(f"  - Quantidade produtos: {proposta.quantidade_produtos}")

        print(f"  - Pontos por produto: {config.pontos_por_produto}")

        print(f"  - Pontos produtos: {pontos_produtos}")

        print(f"  - Total pontos: {pontos}")

    # Pontos por venda concretizada (somente se venda foi validada pelo gestor)

    if proposta.status == 'vendida' and getattr(proposta, 'venda_validada', False):

        # TODO: Implementar se necessário para pós-workshop

        pass

    

    # Salvar pontos na proposta

    proposta.pontos = pontos

    proposta.save()

    

    # Atualizar pontos da equipe (soma com pontos existentes)

    if proposta.equipe:

        equipe = proposta.equipe

        
        # Calcular total de pontos da equipe (somando todas as propostas validadas)

        total_pontos_equipe = Proposta.objects.filter(

            equipe=equipe,

            status__in=['validada', 'vendida']

        ).aggregate(

            total=Coalesce(Sum('pontos'), 0)

        )['total'] or 0

        

        print(f"DEBUG: Atualizando equipe {equipe.nome} - Total pontos: {total_pontos_equipe}")

        

        # Atualizar ranking se existir

        try:

            ranking = Ranking.objects.get(

                equipe=equipe,

                estado_sistema=status_atual

            )

            ranking.pontos = total_pontos_equipe

            ranking.save()

            print(f"DEBUG: Ranking atualizado para equipe {equipe.nome}")

        except Ranking.DoesNotExist:

            print(f"DEBUG: Ranking não encontrado para equipe {equipe.nome} no status {status_atual}")

    

    return pontos



def adicionar_pontos_validacao(proposta):

    """Adicionar pontos por validação de proposta conforme estado atual"""

    status_atual = StatusSistema.get_status_atual()

    pontos_adicionais = 0

    regras = RegraPontuacao.objects.filter(

        ativa=True, 

        tipo='proposta_validada',

        estado_sistema=status_atual

    )

    pontos_adicionais += sum(regra.pontos for regra in regras)

    proposta.pontos += pontos_adicionais

    proposta.save()



def adicionar_pontos_venda(proposta):

    """Adicionar pontos por venda concretizada conforme estado atual"""

    status_atual = StatusSistema.get_status_atual()

    pontos_adicionais = 0

    regras = RegraPontuacao.objects.filter(

        ativa=True, 

        tipo='venda_concretizada',

        estado_sistema=status_atual

    )

    pontos_adicionais += sum(regra.pontos for regra in regras)

    proposta.pontos += pontos_adicionais

    proposta.save()



def atualizar_ranking():

    """Atualizar ranking conforme estado atual do sistema"""

    from django.db.models import Sum, Count

    

    status_atual = StatusSistema.get_status_atual()

    equipes = Equipe.objects.all()

    

    # Calcular estatísticas com base em todas as propostas (independente do estado)

    ranking_calculado = []

    for equipe in equipes:

        propostas = Proposta.objects.filter(equipe=equipe)
        
        propostas_enviadas = propostas.count()
        
        propostas_validadas = propostas.filter(status='validada').count()
        
        # Incluir vendas validadas no Pré-Workshop
        vendas_validadas_pre_workshop = Venda.objects.filter(
            proposta__equipe=equipe,
            status_validacao='validada'
        ).count()
        
        vendas_concretizadas = propostas.filter(
            status='vendida', 
            venda_validada=True
        ).count()
        
        # Total de vendas = Pós-Workshop + Pré-Workshop
        total_vendas = vendas_concretizadas + vendas_validadas_pre_workshop
        
        valor_total_vendas_pos = propostas.filter(
            status='vendida',
            venda_validada=True
        ).aggregate(total=Sum('valor_venda'))['total'] or 0
        
        # Incluir valor das vendas do Pré-Workshop
        valor_total_vendas_pre = Venda.objects.filter(
            proposta__equipe=equipe,
            status_validacao='validada'
        ).aggregate(total=Sum('valor_total_venda'))['total'] or 0
        
        valor_total_vendas = valor_total_vendas_pos + valor_total_vendas_pre

        

        # Calcular pontos apenas com regras do estado atual
        # Regra de negócio:
        # - No Pós-Workshop, o ranking deve zerar e contar pontos somente após validação do gestor
        #   (ou seja, considerar apenas propostas vendidas e validadas)
        pontos_totais = 0

        regras_validacao = RegraPontuacao.objects.filter(
            ativa=True,
            tipo='proposta_validada',
            estado_sistema=status_atual
        )
        regras_produtos = RegraPontuacao.objects.filter(
            ativa=True,
            tipo='quantidade_produtos',
            estado_sistema=status_atual
        )
        regras_venda = RegraPontuacao.objects.filter(
            ativa=True,
            tipo='venda_concretizada',
            estado_sistema=status_atual
        )

        for proposta in propostas:
            if status_atual == 'pos_workshop':
                if proposta.status == 'vendida' and proposta.venda_validada:
                    # Pontuação no pós-workshop passa a ser por venda validada
                    pontos_totais += sum(regra.pontos for regra in regras_venda)
                    pontos_totais += sum(regra.pontos for regra in regras_produtos) * (proposta.quantidade_produtos or 0)
            else:
                if proposta.status == 'validada':
                    pontos_totais += sum(regra.pontos for regra in regras_validacao)
                    pontos_totais += sum(regra.pontos for regra in regras_produtos) * (proposta.quantidade_produtos or 0)
                elif proposta.status == 'vendida' and proposta.venda_validada:
                    # Verificar se é venda do Pré-Workshop (validada através da tabela Venda)
                    if hasattr(proposta, 'venda') and proposta.venda:
                        # Venda validada no Pré-Workshop - usa pontos da tabela Venda
                        pontos_totais += proposta.venda.pontos_gerados or 0
                    else:
                        # Venda validada no Pós-Workshop - usa regras de pontuação
                        pontos_totais += sum(regra.pontos for regra in regras_validacao)
                        pontos_totais += sum(regra.pontos for regra in regras_produtos) * (proposta.quantidade_produtos or 0)
                        pontos_totais += sum(regra.pontos for regra in regras_venda)

        # Pontos bônus (mantém funcionamento global: soma todas regras bônus ativas)
        try:
            bonus_total = RegraBonus.objects.filter(ativa=True).aggregate(total=Coalesce(Sum('pontos'), 0))['total'] or 0
            pontos_totais += bonus_total
        except Exception:
            pass

        

        ranking_calculado.append({
            'equipe': equipe,
            'pontos': int(pontos_totais or 0),
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



@api_view(['GET', 'POST'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_gerenciar_regras_pontuacao')

def regras_bonus_api(request):

    """API para regras de pontos bônus da banca"""

    print(f"DEBUG: Requisição para regras_bonus_api - Método: {request.method}")

    print(f"DEBUG: Requisição para regras_bonus_api - Usuário: {request.user.username}")

    

    if request.method == 'GET':

        regras = RegraBonus.objects.filter(ativa=True).order_by('-data_criacao')

        print(f"DEBUG: Requisição para regras_bonus_api - Encontradas {regras.count()} regras")

        serializer = RegraBonusSerializer(regras, many=True)

        return Response(serializer.data)

    

    elif request.method == 'POST':

        print(f"DEBUG: Requisição para regras_bonus_api - Dados recebidos: {request.data}")

        serializer = RegraBonusSerializer(data=request.data)

        if serializer.is_valid():

            regra = serializer.save()

            print(f"DEBUG: Requisição para regras_bonus_api - Regra criada: {regra.id}")

            return Response(regra.data, status=status.HTTP_201_CREATED)

        else:

            print(f"DEBUG: Requisição para regras_bonus_api - Erros serializer: {serializer.errors}")

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'PUT', 'DELETE'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_gerenciar_regras_pontuacao')

def regra_bonus_detail_api(request, pk):

    """API para detalhes/edição/exclusão de regra de bônus"""

    try:

        regra = RegraBonus.objects.get(pk=pk)

    except RegraBonus.DoesNotExist:

        return Response({'error': 'Regra não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    

    if request.method == 'PUT':

        serializer = RegraBonusSerializer(regra, data=request.data, partial=True)

        if serializer.is_valid():

            serializer.save()

            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    

    elif request.method == 'DELETE':

        regra.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)



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

            propostas = Proposta.objects.filter(status='enviada')

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



@api_view(['PUT'])

@permission_classes([IsAuthenticated])

@verificar_permissao('pode_validar_vendas')

def validar_venda_gestor(request, venda_id):

    """Validar ou rejeitar venda (apenas gestor/admin)"""

    try:

        venda = Venda.objects.get(id=venda_id)

        perfil = request.user.perfil_acesso

        

        # Verificar permissão (gestor só valida da sua regional)

        if perfil.nivel == 'gestor' and perfil.regional:

            if venda.proposta.equipe.regional != perfil.regional:

                return Response({'error': 'Acesso negado a esta venda'}, status=403)

        elif perfil.nivel not in ['administrador', 'gestor']:

            return Response({'error': 'Acesso negado'}, status=403)

        

        novo_status = request.data.get('status_validacao')

        if novo_status not in ['validada', 'rejeitada']:

            return Response({'error': 'Status inválido'}, status=400)

        

        # Atualizar status

        venda.status_validacao = novo_status

        if novo_status == 'validada':

            venda.validado_por = request.user

            print(f"DEBUG: Venda #{venda_id} validada por {request.user.username}")

        else:

            venda.validado_por = None

            print(f"DEBUG: Venda #{venda_id} rejeitada por {request.user.username}")

        

        venda.save()

        try:

            proposta = venda.proposta

            if novo_status == 'validada':

                proposta.venda_validada = True

                proposta.valor_venda = venda.valor_total_venda

                proposta.data_validacao_venda = venda.data_validacao

                proposta.venda_validada_por = request.user

            else:

                proposta.venda_validada = False

            proposta.save()

            calcular_pontos_proposta(proposta)

            atualizar_ranking()

        except Exception as e:

            print(f"DEBUG: Erro ao sincronizar proposta com venda: {str(e)}")

        

        serializer = VendaSerializer(venda)

        return Response(serializer.data)

        

    except Venda.DoesNotExist:

        return Response({'error': 'Venda não encontrada'}, status=404)

    except Exception as e:

        print(f"DEBUG: Erro ao validar venda: {str(e)}")

        return Response({'error': f'Erro interno: {str(e)}'}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@verificar_permissao('pode_marcar_vendas')
def vendas_concretizadas(request):
    """Gerenciar vendas concretizadas pela equipe"""
    perfil = request.user.perfil_acesso
    
    if request.method == 'GET':
        # Listar propostas da equipe para marcar como vendidas
        propostas = Proposta.objects.filter(
            equipe=perfil.equipe,
            status='validada'  # Apenas propostas validadas podem ser marcadas como vendidas
        ).exclude(
            status='vendida'  # Excluir já vendidas
        )
        
        serializer = PropostaSerializer(propostas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Marcar proposta como vendida
        proposta_id = request.data.get('proposta_id')
        valor_venda = request.data.get('valor_venda')
        cliente_venda = request.data.get('cliente_venda')
        observacoes = request.data.get('observacoes', '')
        
        if not proposta_id or not valor_venda or not cliente_venda:
            return Response({'error': 'proposta_id, valor_venda e cliente_venda são obrigatórios'}, status=400)
        
        try:
            proposta = Proposta.objects.get(
                id=proposta_id,
                equipe=perfil.equipe,
                status='validada'
            )
            
            proposta.status = 'vendida'
            proposta.valor_venda = valor_venda
            proposta.cliente_venda = cliente_venda
            proposta.observacoes_venda = observacoes
            proposta.data_venda = timezone.now()
            proposta.venda_validada = False
            proposta.data_validacao_venda = None
            proposta.venda_validada_por = None
            proposta.motivo_rejeicao_venda = None
            proposta.data_rejeicao_venda = None
            proposta.save()
            
            return Response({
                'message': 'Proposta marcada como vendida com sucesso',
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
            # Gestor vê apenas da sua regional (se tiver regional definida)
            propostas = Proposta.objects.filter(
                status='vendida',
                venda_validada=False
            )
            if perfil.regional:
                propostas = propostas.filter(equipe__regional=perfil.regional)
        
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
                if perfil.regional:
                    filtros['equipe__regional'] = perfil.regional
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
                message = 'Venda rejeitada com sucesso'
            
            proposta.save()

            try:
                calcular_pontos_proposta(proposta)
                atualizar_ranking()
            except Exception:
                pass
            
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



