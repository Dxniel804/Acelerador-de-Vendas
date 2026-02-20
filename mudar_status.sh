#!/bin/bash
echo "=== CONTROLE DE STATUS DO SISTEMA ==="
echo ""
echo "Status disponíveis:"
echo "1. pre_workshop   - Pré-Workshop"
echo "2. workshop       - Workshop"
echo "3. pos_workshop   - Pós-Workshop"
echo "4. encerrado      - Encerrado"
echo ""

# Verifica se foi passado um parâmetro
if [ "$1" == "" ]; then
    echo "Uso: ./mudar_status.sh [numero_status]"
    echo ""
    echo "Exemplos:"
    echo "  ./mudar_status.sh 1  # Mudar para Pré-Workshop"
    echo "  ./mudar_status.sh 2  # Mudar para Workshop"
    echo "  ./mudar_status.sh 3  # Mudar para Pós-Workshop"
    echo "  ./mudar_status.sh 4  # Mudar para Encerrado"
    exit 1
fi

# Define o status baseado no parâmetro
case $1 in
    1)
        STATUS="pre_workshop"
        NOME="Pré-Workshop"
        ;;
    2)
        STATUS="workshop"
        NOME="Workshop"
        ;;
    3)
        STATUS="pos_workshop"
        NOME="Pós-Workshop"
        ;;
    4)
        STATUS="encerrado"
        NOME="Encerrado"
        ;;
    *)
        echo "❌ Status inválido! Use 1, 2, 3 ou 4."
        exit 1
        ;;
esac

echo "🔄 Alterando status para: $NOME ($STATUS)"
echo ""

# Executa no Docker
docker-compose exec backend python manage.py shell << EOF
from api.models import StatusSistema

# Pega ou cria o status do sistema
status_obj, created = StatusSistema.objects.get_or_create(
    id=1,
    defaults={'status_atual': 'pre_workshop'}
)

# Atualiza o status
status_obj.status_atual = '$STATUS'
status_obj.save()

print(f"✅ Status alterado com sucesso!")
print(f"📊 Novo status: $NOME")
print(f"🔧 Código: $STATUS")
print(f"📅 Alterado em: {status_obj.data_alteracao}")
EOF

echo ""
echo "✅ Status do sistema atualizado para: $NOME"
echo ""
echo "🌐 Verifique em: https://aceleradorvendas.online"
echo "👤 Login como admin para ver as mudanças"
