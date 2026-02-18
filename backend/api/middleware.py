from django.http import JsonResponse
from functools import wraps

# MANTENHA O TOPO LIMPO DE IMPORTS DO SEU PRÓPRIO APP
# Isso evita o erro de "cannot import name" e travamento do WSGI

class StatusSistemaMiddleware:
    """
    Middleware para verificar o status do sistema e controlar acesso
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Obter status atual do sistema de forma lazy para evitar import circular
        try:
            from .models import StatusSistema
            request.status_sistema = StatusSistema.get_status_atual()
        except (ImportError, Exception):
            request.status_sistema = 'pre_workshop'  # valor padrão
        
        response = self.get_response(request)
        return response

class PermissaoMiddleware:
    """
    Middleware para verificar permissões baseadas no perfil do usuário
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Inicializa o atributo para evitar erros de "AttributeError" em outros lugares
        request.perfil_acesso = None
        
        print(f"DEBUG: Middleware - User authenticated: {request.user.is_authenticated}")
        print(f"DEBUG: Middleware - User: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        if request.user.is_authenticated:
            try:
                # Usamos getattr para segurança caso o campo não exista no modelo User
                request.perfil_acesso = getattr(request.user, 'perfil_acesso', None)
                print(f"DEBUG: Middleware - Perfil acesso: {request.perfil_acesso}")
                print(f"DEBUG: Middleware - Perfil nivel: {request.perfil_acesso.nivel if request.perfil_acesso else 'None'}")
            except Exception as e:
                print(f"DEBUG: Middleware - Erro ao obter perfil: {e}")
        
        response = self.get_response(request)
        return response

def verificar_status_sistema(permitidos=None):
    """
    Decorator para verificar se o usuário pode operar no status atual do sistema
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                from .models import StatusSistema
                status_atual = StatusSistema.get_status_atual()
            except (ImportError, Exception):
                status_atual = 'pre_workshop'
            
            # Se não houver restrição de status, permite
            if permitidos is None:
                return view_func(request, *args, **kwargs)
            
            # Se o status atual não estiver na lista de permitidos, bloqueia
            if status_atual not in permitidos:
                return JsonResponse({
                    'error': 'Operação não permitida no status atual',
                    'status_atual': status_atual
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def verificar_permissao(acao_requerida):
    """
    Decorator para verificar permissões específicas do usuário
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # 1. Verifica se está autenticado
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Autenticação requerida'}, status=401)
            
            # 2. Tenta obter o perfil (usando getattr para evitar quebra)
            perfil = getattr(request.user, 'perfil_acesso', None)
            
            if not perfil:
                return JsonResponse({'error': 'Perfil de acesso não encontrado'}, status=403)
            
            if not perfil.ativo:
                return JsonResponse({'error': 'Perfil de acesso inativo'}, status=403)
            
            # 3. Verificar se o método/campo de permissão existe
            if hasattr(perfil, acao_requerida):
                metodo_ou_valor = getattr(perfil, acao_requerida)
                
                # Se for uma função (método do model), executa. Se for booleano, apenas lê.
                resultado = metodo_ou_valor() if callable(metodo_ou_valor) else metodo_ou_valor
                
                if not resultado:
                    # Tenta pegar o status do request (definido no Middleware lá em cima)
                    status_atual = getattr(request, 'status_sistema', 'desconhecido')
                    
                    return JsonResponse({
                        'error': f'Permissão negada para a ação: {acao_requerida}',
                        'nivel_acesso': getattr(perfil, 'nivel', 'N/A'),
                        'status_sistema': status_atual
                    }, status=403)
            else:
                return JsonResponse({'error': 'Ação de permissão inválida ou inexistente'}, status=500)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator