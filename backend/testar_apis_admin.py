#!/usr/bin/env python
import requests

def testar_apis_admin():
    token = '3bdabf4b51b7012bc0478f1d4ad6f9092831d0d0'
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }

    # Testar APIs
    apis = [
        ('http://localhost:8000/api/admin/usuarios/', 'Usuários'),
        ('http://localhost:8000/api/admin/equipes/', 'Equipes'),
        ('http://localhost:8000/api/regionais/', 'Regionais'),
        ('http://localhost:8000/api/admin/status_sistema/', 'Status')
    ]

    for url, nome in apis:
        try:
            response = requests.get(url, headers=headers)
            status = 'OK' if response.status_code == 200 else 'ERRO'
            print(f'{nome}: {response.status_code} - {status}')
            if response.status_code != 200:
                print(f'  Erro: {response.text[:100]}')
        except Exception as e:
            print(f'{nome}: ERRO - {e}')

if __name__ == '__main__':
    testar_apis_admin()
