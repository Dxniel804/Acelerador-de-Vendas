from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Vendedor, Cliente, Workshop, PrevisaoWorkshop, ResultadoPosWorkshop, Equipe, StatusSistema, PerfilAcesso, Proposta, RegraPontuacao, Ranking, ConfiguracaoPontuacao, Venda

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password
        )
        return user


class VendedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendedor
        fields = ['id', 'nome', 'codigo']

class ClienteSerializer(serializers.ModelSerializer):
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    
    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'codigo', 'vendedor', 'vendedor_nome']

class WorkshopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workshop
        fields = ['id', 'nome', 'data']

class PrevisaoWorkshopSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    workshop_nome = serializers.CharField(source='workshop.nome', read_only=True)
    
    class Meta:
        model = PrevisaoWorkshop
        fields = '__all__'

class ResultadoPosWorkshopSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    workshop_nome = serializers.CharField(source='workshop.nome', read_only=True)
    
    class Meta:
        model = ResultadoPosWorkshop
        fields = '__all__'

class DashboardGeralSerializer(serializers.Serializer):
    faturamento_total_previsto = serializers.DecimalField(max_digits=15, decimal_places=2)
    faturamento_total_realizado = serializers.DecimalField(max_digits=15, decimal_places=2)
    numero_total_propostas_previstas = serializers.IntegerField()
    numero_total_propostas_fechadas = serializers.IntegerField()
    taxa_conversao = serializers.DecimalField(max_digits=5, decimal_places=2)
    desempenho_faturamento = serializers.DecimalField(max_digits=5, decimal_places=2)
    diferenca_faturamento = serializers.DecimalField(max_digits=15, decimal_places=2)
    diferenca_propostas = serializers.IntegerField()
    nivel_acesso = serializers.CharField()


class DashboardVendedorSerializer(serializers.Serializer):
    vendedor = serializers.CharField()
    faturamento_previsto = serializers.DecimalField(max_digits=15, decimal_places=2)
    faturamento_realizado = serializers.DecimalField(max_digits=15, decimal_places=2)
    propostas_previstas = serializers.IntegerField()
    propostas_fechadas = serializers.IntegerField()
    taxa_conversao = serializers.DecimalField(max_digits=5, decimal_places=2)
    desempenho_faturamento = serializers.DecimalField(max_digits=5, decimal_places=2)
    diferenca_faturamento = serializers.DecimalField(max_digits=15, decimal_places=2)

class PerfilAcessoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    equipe_nome = serializers.CharField(source='equipe.nome', read_only=True)
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    
    class Meta:
        model = PerfilAcesso
        fields = '__all__'

class EquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        fields = ['id', 'nome', 'codigo', 'responsavel', 'ativo', 'data_criacao']

class StatusSistemaSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_atual_display', read_only=True)
    alterado_por_nome = serializers.CharField(source='alterado_por.username', read_only=True, allow_null=True)
    
    class Meta:
        model = StatusSistema
        fields = '__all__'

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)

class PropostaSerializer(serializers.ModelSerializer):
    equipe_nome = serializers.CharField(source='equipe.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    workshop_nome = serializers.CharField(source='workshop.nome', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    validado_por_nome = serializers.CharField(source='validado_por.username', read_only=True)
    venda_validada_por_nome = serializers.CharField(source='venda_validada_por.username', read_only=True)
    pontos_produtos = serializers.SerializerMethodField()
    bonus_selecionados = serializers.SerializerMethodField()

    class Meta:
        model = Proposta
        fields = '__all__'

    def get_pontos_produtos(self, obj):
        """Calcular pontos totais por quantidade de produtos em propostas validadas"""
        if obj.status != 'validada' or not obj.quantidade_produtos:
            return 0

        # Usar configuração da banca
        from .models import ConfiguracaoPontuacao
        config = ConfiguracaoPontuacao.get_configuracao()

        # Pontos por produtos: quantidade × pontos por produto
        pontos_produtos = config.pontos_por_produto * obj.quantidade_produtos

        # Pontos totais da proposta: pontos fixos + pontos por produtos
        pontos_totais = config.pontos_proposta_validada + pontos_produtos

        return pontos_totais

    def get_bonus_selecionados(self, obj):
        """Retorna lista de bônus selecionados para exibição"""
        bonus = []
        if obj.bonus_vinhos_casa_perini_mundo:
            bonus.append({'label': 'Linha Vinhos Casa Perini Mundo (min 5 Caixas)', 'pontos': 5})
        if obj.bonus_vinhos_fracao_unica:
            bonus.append({'label': 'Linha Vinhos Fração Única (min 5 Caixas)', 'pontos': 5})
        if obj.bonus_espumantes_vintage:
            bonus.append({'label': 'Linha Espumantes Vintage (min 5 Caixas)', 'pontos': 5})
        if obj.bonus_espumantes_premium:
            bonus.append({'label': 'Linha Espumantes Premium (min 2 Caixas)', 'pontos': 5})
        if obj.bonus_aceleracao:
            bonus.append({'label': 'Bônus de Aceleração (Venda fechada durante o game)', 'pontos': 25})
        return bonus



class RegraPontuacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_sistema_display = serializers.CharField(source='get_estado_sistema_display', read_only=True)
    
    class Meta:
        model = RegraPontuacao
        fields = '__all__'

class RankingSerializer(serializers.ModelSerializer):
    equipe_nome = serializers.CharField(source='equipe.nome', read_only=True)
    estado_sistema_display = serializers.CharField(source='get_estado_sistema_display', read_only=True)
    
    class Meta:
        model = Ranking
        fields = '__all__'

class ConfiguracaoPontuacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoPontuacao
        fields = '__all__'

class VendaSerializer(serializers.ModelSerializer):
    proposta_id = serializers.IntegerField(source='proposta.id', read_only=True)
    cliente_nome = serializers.CharField(source='proposta.cliente.nome', read_only=True)
    equipe_nome = serializers.CharField(source='proposta.equipe.nome', read_only=True)
    status_validacao_display = serializers.CharField(source='get_status_validacao_display', read_only=True)
    validado_por_nome = serializers.CharField(source='validado_por.username', read_only=True)
    
    class Meta:
        model = Venda
        fields = '__all__'
