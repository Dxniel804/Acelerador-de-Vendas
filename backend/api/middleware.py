from django.http import JsonResponse
from django.core.exceptions import PermissionDenied

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
        except ImportError:
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
        print(f"DEBUG: Middleware - Path: {request.path}")
        
        # Obter perfil de acesso se usuário estiver autenticado
        if request.user.is_authenticated:
            try:
                request.perfil_acesso = request.user.perfil_acesso
                print(f"DEBUG: Middleware - Usuário {request.user.username} autenticado com perfil {request.perfil_acesso.nivel}")
            except Exception as e:
                print(f"DEBUG: Middleware - Erro ao obter perfil: {e}")
                request.perfil_acesso = None
        else:
            print(f"DEBUG: Middleware - Usuário não autenticado")
            request.perfil_acesso = None
        
        response = self.get_response(request)
        return response

def verificar_status_sistema(permitidos=None):
    """
    Decorator para verificar se o usuário pode operar no status atual do sistema
    permitidos: lista de status onde a operação é permitida
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            try:
                from .models import StatusSistema
                status_atual = StatusSistema.get_status_atual()
            except ImportError:
                status_atual = 'pre_workshop'
            
            # Se não houver restrição de status, permite
            if permitidos is None:
                return view_func(request, *args, **kwargs)
            
            # Se o status atual não estiver na lista de permitidos, bloqueia
            if status_atual not in permitidos:
                return JsonResponse({
                    'error': f'Operação não permitida no status atual',
                    'status_atual': status_atual
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def verificar_permissao(acao_requerida):
    """
    Decorator para verificar permissões específicas do usuário
    acao_requerida: nome do método de permissão no PerfilAcesso
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Autenticação requerida'}, status=401)
            
            try:
                perfil = request.user.perfil_acesso
                print(f"DEBUG: Middleware - Usuário {request.user.username} - Nível: {perfil.nivel} - Ação: {acao_requerida}")
            except:
                return JsonResponse({'error': 'Perfil de acesso não encontrado'}, status=403)
            
            if not perfil.ativo:
                return JsonResponse({'error': 'Perfil de acesso inativo'}, status=403)
            
            # Verificar se o método de permissão existe e retorna True
            if hasattr(perfil, acao_requerida):
                metodo = getattr(perfil, acao_requerida)
                resultado = metodo()
                print(f"DEBUG: Middleware - Resultado da verificação: {resultado}")
                try:
                    from .models import StatusSistema
                    status_atual = StatusSistema.get_status_atual()
                    print(f"DEBUG: Middleware - Status sistema: {status_atual}")
                except ImportError:
                    status_atual = 'pre_workshop'
                    print(f"DEBUG: Middleware - Status sistema: {status_atual} (padrão)")
                
                if not resultado:
                    return JsonResponse({
                        'error': f'Permissão negada para a ação: {acao_requerida}',
                        'nivel_acesso': perfil.nivel,
                        'status_sistema': status_atual
                    }, status=403)
            else:
                return JsonResponse({'error': 'Ação de permissão inválida'}, status=500)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
