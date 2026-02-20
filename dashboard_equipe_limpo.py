# Função dashboard_equipe limpa para substituir a corrompida

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
