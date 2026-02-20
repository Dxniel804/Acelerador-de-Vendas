from django.db import models
from django.contrib.auth.models import User


class Vendedor(models.Model):
    nome = models.CharField(max_length=100)
    codigo = models.CharField(max_length=20, unique=True)
    equipe = models.ForeignKey('Equipe', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendedores')
    
    def __str__(self):
        return self.nome

class Cliente(models.Model):
    nome = models.CharField(max_length=200)
    codigo = models.CharField(max_length=50, unique=True)
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='clientes')
    
    def __str__(self):
        return self.nome

class Workshop(models.Model):
    nome = models.CharField(max_length=200)
    data = models.DateField()
    
    def __str__(self):
        return f"{self.nome} - {self.data}"

class PrevisaoWorkshop(models.Model):
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name='previsoes')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='previsoes')
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='previsoes')
    valor_total_previsto = models.DecimalField(max_digits=12, decimal_places=2)
    numero_propostas = models.IntegerField(default=0)
    linhas_produto = models.TextField(help_text="Lista de linhas de produto previstas")
    faturamento_total_previsto = models.DecimalField(max_digits=12, decimal_places=2)
    data_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Previsão de Workshop"
        verbose_name_plural = "Previsões de Workshop"
    
    def __str__(self):
        return f"Previsão - {self.cliente.nome} - {self.workshop.nome}"

class ResultadoPosWorkshop(models.Model):
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name='resultados')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='resultados')
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='resultados')
    valor_fechado = models.DecimalField(max_digits=12, decimal_places=2)
    numero_propostas_fechadas = models.IntegerField(default=0)
    linhas_produto_vendidas = models.TextField(help_text="Lista de linhas de produto vendidas")
    faturamento_total_realizado = models.DecimalField(max_digits=12, decimal_places=2)
    data_fechamento = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Resultado Pós-Workshop"
        verbose_name_plural = "Resultados Pós-Workshop"
    
    def __str__(self):
        return f"Resultado - {self.cliente.nome} - {self.workshop.nome}"

class Equipe(models.Model):
    nome = models.CharField(max_length=100)
    codigo = models.CharField(max_length=20, unique=True)
    responsavel = models.CharField(max_length=100, default='', help_text="Nome do responsável pela equipe")
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Equipe"
        verbose_name_plural = "Equipes"
    
    def __str__(self):
        return f"{self.nome} ({self.codigo})"

class StatusSistema(models.Model):
    STATUS_CHOICES = [
        ('pre_workshop', 'Pré-Workshop'),
        ('workshop', 'Workshop'),
        ('pos_workshop', 'Pós-Workshop'),
        ('encerrado', 'Encerrado'),
    ]
    
    status_atual = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pre_workshop')
    data_alteracao = models.DateTimeField(auto_now=True)
    alterado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Status do Sistema"
        verbose_name_plural = "Status do Sistema"
    
    def __str__(self):
        return f"Status: {self.get_status_atual_display()}"
    
    @classmethod
    def get_status_atual(cls):
        try:
            return cls.objects.first().status_atual
        except:
            return 'pre_workshop'

class PerfilAcesso(models.Model):
    NIVEL_CHOICES = [
        ('administrador', 'Administrador'),
        ('gestor', 'Gestor'),
        ('banca', 'Banca'),
        ('equipe', 'Equipe'),
    ]
    
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_acesso')
    nivel = models.CharField(max_length=20, choices=NIVEL_CHOICES)
    equipe = models.ForeignKey(Equipe, on_delete=models.SET_NULL, null=True, blank=True, help_text="Equipe permitida para acesso de nível equipe")
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Perfil de Acesso"
        verbose_name_plural = "Perfis de Acesso"
    
    def __str__(self):
        return f"{self.usuario.username} - {self.get_nivel_display()}"
    
    # Permissões Administrador
    def pode_criar_equipes(self):
        return self.nivel in ['administrador', 'admin']
    
    def pode_criar_usuarios(self):
        return self.nivel in ['administrador', 'admin']
    
    def pode_alterar_status_sistema(self):
        return self.nivel in ['administrador', 'admin']
    
    # Permissões Gestor
    
    def pode_ver_todas_equipes(self):
        """Gestor pode ver todas as equipes da sua regional"""
        return self.nivel in ['administrador', 'admin', 'gestor']
    
    def pode_ver_todas_propostas(self):
        """Gestor pode ver todas as propostas para validação"""
        return self.nivel in ['administrador', 'admin', 'gestor']
    
    
    
    
    # Permissões Banca
    def pode_ver_dashboard_geral(self):
        return self.nivel in ['administrador', 'admin', 'banca']
    
    def pode_gerenciar_regras_pontuacao(self):
        """Apenas banca e admin podem gerenciar regras de pontuação - GESTOR NÃO"""
        return self.nivel in ['administrador', 'admin', 'banca']
    
    def pode_ver_ranking_tempo_real(self):
        """Banca pode ver ranking em tempo real"""
        return self.nivel in ['administrador', 'admin', 'banca']
    
    def pode_validar_propostas(self):
        """BANCA NÃO VALIDA PROPOSTAS - APENAS GESTOR"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'workshop':
            return False  # Validação apenas durante workshop
        return self.nivel in ['administrador', 'admin', 'gestor']
    
    # Permissões Equipe
    def pode_ver_dados_equipe(self):
        return self.nivel in ['administrador', 'admin', 'gestor', 'equipe']
    
    def pode_registrar_previsao(self):
        """PRÉ-WORKSHOP: Não permitido para equipes"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual == 'encerrado':
            return False
        if status_atual == 'pre_workshop' and self.nivel == 'equipe':
            return False  # Equipes não operam no pré-workshop
        return self.nivel in ['administrador', 'gestor', 'equipe']
    
    def pode_registrar_resultado(self):
        """PRÉ-WORKSHOP: Não permitido para equipes"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual == 'encerrado':
            return False
        if status_atual == 'pre_workshop' and self.nivel == 'equipe':
            return False  # Equipes não operam no pré-workshop
        return self.nivel in ['administrador', 'gestor', 'equipe']
    
    def pode_enviar_propostas(self):
        """WORKSHOP: Apenas equipes enviam propostas"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'workshop':
            return False  # Propostas apenas durante workshop
        return self.nivel == 'equipe'
    
    def pode_marcar_vendas(self):
        """PÓS-WORKSHOP: Apenas equipes marcam vendas"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'pos_workshop':
            return False  # Marcação de vendas apenas no pós-workshop
        return self.nivel == 'equipe'
    
    def pode_validar_vendas(self):
        """PRÉ-WORKSHOP: Gestor pode validar vendas para preparação"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual not in ['pre_workshop', 'pos_workshop']:
            return False  # Validação apenas no pré ou pós-workshop
        return self.nivel in ['administrador', 'admin', 'gestor']
    
    def pode_acessar_sistema_encerrado(self):
        """ENCERRADO: Apenas admin, gestor e banca acessam dashboards"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual != 'encerrado':
            return True  # Se não está encerrado, todos podem acessar conforme suas permissões
        return self.nivel in ['administrador', 'admin', 'gestor', 'banca']
    
    def _pode_operar_no_status(self):
        """Método legado - mantido para compatibilidade"""
        status_atual = StatusSistema.get_status_atual()
        if status_atual == 'encerrado':
            return False
        if self.nivel == 'equipe' and status_atual == 'pre_workshop':
            return False
        return True
    
    def pode_ver_vendedor(self, vendedor_id):
        if self.nivel in ['administrador', 'banca']:
            return True
        if self.nivel == 'gestor':
            return Vendedor.objects.filter(id=vendedor_id).exists()
        if self.nivel == 'equipe' and self.equipe:
            return Vendedor.objects.filter(id=vendedor_id, equipe=self.equipe).exists()
        return False

class Proposta(models.Model):
    STATUS_CHOICES = [
        ('enviada', 'Enviada'),
        ('validada', 'Validada'),
        ('rejeitada', 'Rejeitada'),
        ('vendida', 'Vendida'),
        ('nao_vendida', 'Não Vendida'),
    ]
    
    equipe = models.ForeignKey(Equipe, on_delete=models.CASCADE, related_name='propostas')
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='propostas')
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='propostas')
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name='propostas')
    
    # Dados da proposta
    valor_proposta = models.DecimalField(max_digits=12, decimal_places=2)
    descricao = models.TextField(null=True, blank=True)
    arquivo_pdf = models.FileField(upload_to='propostas/', null=True, blank=True)
    quantidade_produtos = models.IntegerField(default=0, help_text="Quantidade de produtos cadastrados na proposta")
    
    # Controle de validação
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enviada')
    data_envio = models.DateTimeField(auto_now_add=True)
    data_validacao = models.DateTimeField(null=True, blank=True)
    validado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='propostas_validadas')
    motivo_rejeicao = models.TextField(null=True, blank=True)
    
    # Controle de venda (pós-workshop)
    data_venda = models.DateTimeField(null=True, blank=True)
    valor_venda = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cliente_venda = models.CharField(max_length=255, null=True, blank=True)
    quantidade_produtos_venda = models.IntegerField(default=0, help_text="Quantidade de produtos na venda efetuada")
    observacoes_venda = models.TextField(null=True, blank=True)
    venda_validada = models.BooleanField(default=False)
    data_validacao_venda = models.DateTimeField(null=True, blank=True)
    venda_validada_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendas_validadas_proposta')
    motivo_rejeicao_venda = models.TextField(null=True, blank=True)
    data_rejeicao_venda = models.DateTimeField(null=True, blank=True)
    
    # Bônus (Workshop)
    bonus_vinhos_casa_perini_mundo = models.BooleanField(default=False, verbose_name="Linha Vinhos Casa Perini Mundo - min 5 Caixas")
    bonus_vinhos_fracao_unica = models.BooleanField(default=False, verbose_name="Linha Vinhos Fração Única - min de 5 Caixas")
    bonus_espumantes_vintage = models.BooleanField(default=False, verbose_name="Linha Espumantes Vintage - min de 5 Caixas")
    bonus_espumantes_premium = models.BooleanField(default=False, verbose_name="Linha Espumantes Premium - min de 2 Caixas")
    bonus_aceleracao = models.BooleanField(default=False, verbose_name="Bônus de Aceleração (Venda fechada durante o game)")

    # Pontuação
    pontos = models.IntegerField(default=0)
    pontos_bonus = models.IntegerField(default=0, help_text="Total de pontos extras e de aceleração")

    # Numeração por equipe
    numero_proposta_equipe = models.IntegerField(default=0, help_text="Número sequencial da proposta dentro da equipe")

    class Meta:
        verbose_name = "Proposta"
        verbose_name_plural = "Propostas"
        ordering = ['-data_envio']

    def save(self, *args, **kwargs):
        if not self.pk and self.numero_proposta_equipe == 0:
            # Atribuir número sequencial por equipe ao criar nova proposta
            ultimo = Proposta.objects.filter(equipe=self.equipe).order_by('-numero_proposta_equipe').first()
            self.numero_proposta_equipe = (ultimo.numero_proposta_equipe if ultimo else 0) + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Proposta {self.id} - {self.equipe.nome} - {self.cliente.nome}"

class RegraPontuacao(models.Model):
    """Regras de pontuação definidas pela banca por estado do sistema"""
    nome = models.CharField(max_length=100)
    descricao = models.TextField()
    pontos = models.IntegerField()
    tipo = models.CharField(max_length=50, choices=[
        ('proposta_enviada', 'Proposta Enviada'),
        ('proposta_validada', 'Proposta Validada'),
        ('venda_concretizada', 'Venda Concretizada'),
        ('quantidade_produtos', 'Quantidade de Produtos'),
    ])
    estado_sistema = models.CharField(max_length=20, choices=StatusSistema.STATUS_CHOICES, default='workshop', help_text="Estado em que esta regra se aplica")
    ativa = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Regra de Pontuação"
        verbose_name_plural = "Regras de Pontuação"
        unique_together = ['tipo', 'estado_sistema']  # Evita regras duplicadas por tipo/estado
    
    def __str__(self):
        return f"{self.nome} (+{self.pontos} pts) - {self.get_estado_sistema_display()}"


class ConfiguracaoPontuacao(models.Model):
    """Configurações de pontuação da banca"""
    pontos_proposta_validada = models.IntegerField(default=0, help_text="Pontos fixos por proposta validada")
    pontos_por_produto = models.IntegerField(default=0, help_text="Pontos por produto (aplica-se tanto a propostas validadas quanto a vendas concretizadas)")
    data_atualizacao = models.DateTimeField(auto_now=True)
    atualizado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Configuração de Pontuação"
        verbose_name_plural = "Configurações de Pontuação"
    
    def __str__(self):
        return f"Configuração - Proposta: {self.pontos_proposta_validada}pts, Produto: {self.pontos_por_produto}pts"
    
    @classmethod
    def get_configuracao(cls):
        config, created = cls.objects.get_or_create(
            id=1,
            defaults={
                'pontos_proposta_validada': 1,
                'pontos_por_produto': 1
            }
        )
        return config

class Venda(models.Model):
    """Vendas concretizadas no pós-workshop"""
    proposta = models.OneToOneField(Proposta, on_delete=models.CASCADE, related_name='venda')
    quantidade_produtos_vendidos = models.IntegerField(default=0)
    valor_total_venda = models.DecimalField(max_digits=12, decimal_places=2)
    data_venda = models.DateTimeField()
    observacoes = models.TextField(null=True, blank=True)
    status_validacao = models.CharField(
        max_length=20,
        choices=[
            ('pendente', 'Pendente de Validação'),
            ('validada', 'Venda Validada'),
            ('rejeitada', 'Venda Rejeitada'),
        ],
        default='pendente',
        help_text="Status da validação pelo gestor"
    )
    pontos_gerados = models.IntegerField(default=0, help_text="Pontos calculados para esta venda")
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_validacao = models.DateTimeField(null=True, blank=True, help_text="Data da validação pelo gestor")
    validado_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='vendas_validadas_gestor',
        help_text="Gestor que validou esta venda"
    )
    
    class Meta:
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"Venda #{self.id} - {self.proposta.equipe.nome} - R$ {self.valor_total_venda} ({self.get_status_validacao_display()})"
    
    def save(self, *args, **kwargs):
        # Calcular pontos ao salvar
        if self.status_validacao == 'validada' and not self.pontos_gerados:
            self.pontos_gerados = self.calcular_pontos()
            if not self.data_validacao:
                from django.utils import timezone
                self.data_validacao = timezone.now()
        super().save(*args, **kwargs)
    
    def calcular_pontos(self):
        """Calcular pontos baseado na configuração atual"""
        from api.models import ConfiguracaoPontuacao
        config = ConfiguracaoPontuacao.get_configuracao()
        return self.quantidade_produtos_vendidos * config.pontos_por_produto

class Ranking(models.Model):
    """Ranking das equipes por estado do sistema"""
    equipe = models.ForeignKey(Equipe, on_delete=models.CASCADE, related_name='posicoes_ranking')
    estado_sistema = models.CharField(max_length=20, choices=StatusSistema.STATUS_CHOICES, default='workshop', help_text="Estado em que esta regra se aplica")
    posicao = models.IntegerField()
    pontos = models.IntegerField(default=0)
    propostas_enviadas = models.IntegerField(default=0)
    propostas_validadas = models.IntegerField(default=0)
    vendas_concretizadas = models.IntegerField(default=0)
    valor_total_vendas = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    data_atualizacao = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ranking"
        verbose_name_plural = "Ranking"
        ordering = ['estado_sistema', 'posicao']
        unique_together = ['equipe', 'estado_sistema']  # Uma posição por equipe por estado
    
    def __str__(self):
        return f"#{self.posicao} {self.get_estado_sistema_display()} - {self.equipe.nome} ({self.pontos} pts)"
