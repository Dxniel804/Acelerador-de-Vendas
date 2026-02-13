from django.contrib.auth.models import User
from api.models import PerfilAcesso, Regional, Equipe

def criar_perfis_ausentes():
    users_sem_perfil = User.objects.filter(perfil_acesso__isnull=True)
    
    for user in users_sem_perfil:
        # Criar perfil básico como 'geral' para usuários sem perfil
        perfil = PerfilAcesso.objects.create(
            usuario=user,
            nivel='geral',
            ativo=True
        )
        print(f"Perfil criado para usuário: {user.username}")
    
    print(f"Total de perfis criados: {users_sem_perfil.count()}")

if __name__ == "__main__":
    criar_perfis_ausentes()
