#!/bin/bash

# Script d'initialisation pour le développement
echo "🚀 Initialisation du projet Cleaner Backend..."

# Créer les dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p dist/uploads/compressed
mkdir -p uploads/compressed

# Copier les fichiers existants si nécessaire
if [ -d "uploads" ] && [ ! -d "dist/uploads" ]; then
    echo "📋 Copie des fichiers uploads existants..."
    cp -r uploads/ dist/
fi

echo "✅ Initialisation terminée !"
echo "🎯 Vous pouvez maintenant lancer: npm run start:dev"
