# ========================================
# Scripts de déploiement Back4App
# ========================================

#!/bin/bash

# deploy-back4app.sh - Script de déploiement automatisé
set -e

echo "🚀 Déploiement de Cleaner Backend sur Back4App..."

# Vérifications pré-déploiement
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile non trouvé"
    exit 1
fi

if [ ! -f ".docker-back4app.env" ]; then
    echo "❌ .docker-back4app.env non trouvé"
    exit 1
fi

# Vérification que package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ package.json non trouvé"
    exit 1
fi

# Build de l'image Docker
echo "📦 Build de l'image Docker..."
docker build -t cleaner-backend:latest .

# Tag pour Back4App
BACK4APP_REGISTRY="registry.back4app.com"
BACK4APP_IMAGE="$BACK4APP_REGISTRY/cleaner-backend:latest"

echo "🏷️  Tag de l'image pour Back4App..."
docker tag cleaner-backend:latest $BACK4APP_IMAGE

# Push vers Back4App
echo "📤 Push vers Back4App..."
docker push $BACK4APP_IMAGE

echo "✅ Déploiement terminé !"
echo "🌐 Votre application sera disponible sur: https://your-app.back4app.io"

# ========================================

#!/bin/bash

# health-check.sh - Vérification de santé après déploiement
set -e

APP_URL="https://your-app.back4app.io"
HEALTH_ENDPOINT="$APP_URL/health"

echo "🏥 Vérification de santé de l'application..."

# Attendre que l'application soit prête
for i in {1..30}; do
    if curl -f $HEALTH_ENDPOINT > /dev/null 2>&1; then
        echo "✅ Application en bonne santé !"
        exit 0
    fi
    echo "⏳ Attente de l'application... ($i/30)"
    sleep 10
done

echo "❌ L'application n'est pas en bonne santé après 5 minutes"
exit 1

# ========================================

#!/bin/bash

# rollback-back4app.sh - Retour en arrière si nécessaire
set -e

echo "🔄 Rollback de la dernière version..."

# Récupération de l'image précédente
PREVIOUS_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep cleaner-backend | sed -n '2p')

if [ -z "$PREVIOUS_IMAGE" ]; then
    echo "❌ Aucune image précédente trouvée"
    exit 1
fi

echo "📦 Déploiement de l'image précédente: $PREVIOUS_IMAGE"
BACK4APP_REGISTRY="registry.back4app.com"
BACK4APP_IMAGE="$BACK4APP_REGISTRY/$PREVIOUS_IMAGE"

docker tag $PREVIOUS_IMAGE $BACK4APP_IMAGE
docker push $BACK4APP_IMAGE

echo "✅ Rollback terminé !"
