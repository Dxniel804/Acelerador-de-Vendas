from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Regional, Vendedor, Cliente, Workshop, PrevisaoWorkshop, ResultadoPosWorkshop, Equipe, StatusSistema, PerfilAcesso, Proposta, RegraPontuacao, Ranking, RegraBonus, ConfiguracaoPontuacao, Venda

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

class RegionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regional
        fields = '__all__'

class VendedorSerializer(serializers.ModelSerializer):
    regional_nome = serializers.CharField(source='regional.nome', read_only=True)
    
    class Meta:
        model = Vendedor
        fields = ['id', 'nome', 'codigo', 'regional', 'regional_nome']

class ClienteSerializer(serializers.ModelSerializer):
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    regional_nome = serializers.CharField(source='vendedor.regional.nome', read_only=True)
    
    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'codigo', 'vendedor', 'vendedor_nome', 'regional_nome']

class WorkshopSerializer(serializers.ModelSerializer):
    regional_nome = serializers.CharField(source='regional.nome', read_only=True)
    
    class Meta:
        model = Workshop
        fields = ['id', 'nome', 'data', 'regional', 'regional_nome']

class PrevisaoWorkshopSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    workshop_nome = serializers.CharField(source='workshop.nome', read_only=True)
    regional_nome = serializers.CharField(source='workshop.regional.nome', read_only=True)
    
    class Meta:
        model = PrevisaoWorkshop
        fields = '__all__'

class ResultadoPosWorkshopSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    workshop_nome = serializers.CharField(source='workshop.nome', read_only=True)
    regional_nome = serializers.CharField(source='workshop.regional.nome', read_only=True)
    
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

class DashboardRegionalSerializer(serializers.Serializer):
    regional = serializers.CharField()
    faturamento_previsto = serializers.DecimalField(max_digits=15, decimal_places=2)
    faturamento_realizado = serializers.DecimalField(max_digits=15, decimal_places=2)
    propostas_previstas = serializers.IntegerField()
    propostas_fechadas = serializers.IntegerField()
    taxa_conversao = serializers.DecimalField(max_digits=5, decimal_places=2)
    desempenho_faturamento = serializers.DecimalField(max_digits=5, decimal_places=2)
    diferenca_faturamento = serializers.DecimalField(max_digits=15, decimal_places=2)

class DashboardVendedorSerializer(serializers.Serializer):
    vendedor = serializers.CharField()
    regional = serializers.CharField()
    faturamento_previsto = serializers.DecimalField(max_digits=15, decimal_places=2)
    faturamento_realizado = serializers.DecimalField(max_digits=15, decimal_places=2)
    propostas_previstas = serializers.IntegerField()
    propostas_fechadas = serializers.IntegerField()
    taxa_conversao = serializers.DecimalField(max_digits=5, decimal_places=2)
    desempenho_faturamento = serializers.DecimalField(max_digits=5, decimal_places=2)
    diferenca_faturamento = serializers.DecimalField(max_digits=15, decimal_places=2)

class PerfilAcessoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    regional_nome = serializers.CharField(source='regional.nome', read_only=True)
    vendedor_nome = serializers.CharField(source='vendedor.nome', read_only=True)
    equipe_nome = serializers.CharField(source='equipe.nome', read_only=True)
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    
    class Meta:
        model = PerfilAcesso
        fields = '__all__'

class EquipeSerializer(serializers.ModelSerializer):
    regional_nome = serializers.CharField(source='regional.nome', read_only=True)
    vendedores_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Equipe
        fields = ['id', 'nome', 'codigo', 'regional', 'regional_nome', 'ativo', 'data_criacao', 'vendedores_count']
    
    def get_vendedores_count(self, obj):
        return obj.vendedores.count()

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

class RegraBonusSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegraBonus
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
