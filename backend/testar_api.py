#!/usr/bin/env python
import requests
import json

def testar_api():
    token = '3f5b9e9a932a8d97a366197bcd0ecd23a4b8a11d'
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }

    # Testar API de regra proposta validada
    try:
        response = requests.get('http://localhost:8000/api/banca/regra-proposta-validada/', headers=headers)
        print(f'Status: {response.status_code}')
        if response.status_code == 200:
            data = response.json()
            print('Configuração atual:')
            print(f'  - ID: {data.get("id")}')
            print(f'  - Pontos proposta: {data.get("pontos_proposta_validada")}')
            print(f'  - Pontos produto: {data.get("pontos_por_produto")}')
        else:
            print(f'Erro: {response.text}')
    except Exception as e:
        print(f'Erro: {e}')

if __name__ == '__main__':
    testar_api()
