#!/bin/bash
echo "=== FORÇANDO REBUILD COMPLETO ==="
echo ""

# 1. Para todos os containers
echo "🛑 Parando containers..."
docker-compose down --remove-orphans

# 2. Remove imagens e volumes para limpar completamente
echo "🗑️ Limpando imagens e volumes..."
docker-compose down --rmi all --volumes --remove-orphans

# 3. Remove containers parados
echo "🧹 Limpando containers parados..."
docker container prune -f

# 4. Limpa o cache do Docker
echo "💾 Limpando cache do Docker..."
docker system prune -af

# 5. Build do zero
echo "🔨 Construindo do zero..."
docker-compose build --no-cache --pull

# 6. Sobe os containers
echo "🚀 Subindo containers..."
docker-compose up -d --force-recreate

# 7. Aguarda um pouco para os serviços iniciarem
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# 8. Verifica status
echo "📊 Verificando status..."
docker-compose ps

# 9. Mostra logs para verificar se está tudo OK
echo ""
echo "📋 Logs dos serviços:"
docker-compose logs --tail=20

echo ""
echo "✅ Rebuild completo finalizado!"
echo ""
echo "🌐 Acesse:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API:      http://localhost:8000/api/"
echo ""
echo "🔧 Se ainda não funcionar, tente:"
echo "   1. Limpar cache do navegador (Ctrl+F5)"
echo "   2. Abrir em aba anônima"
echo "   3. Verificar se há erros no console (F12)"
