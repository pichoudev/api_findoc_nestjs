# ========================================
# Dockerfile pour Back4App - NestJS Production
# ========================================
# Optimisé pour le déploiement professionnel avec multi-stage build
# ========================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Définition des métadonnées
LABEL maintainer="Cleaner Backend Team"
LABEL description="NestJS Backend for Cleaner App - Production Ready"
LABEL version="1.0.0"

# Installation des dépendances de build
RUN apk add --no-cache python3 make g++

# Configuration des variables d'environnement de build
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de gestion des dépendances
COPY package*.json ./

# Installation des dépendances (toutes pour le build)
RUN npm install

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# Suppression des dépendances de développement
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Métadonnées de l'image de production
LABEL maintainer="Cleaner Backend Team"
LABEL description="NestJS Backend for Cleaner App - Production Optimized"
LABEL version="1.0.0"

# Installation des dépendances système pour production
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Configuration de l'utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Configuration des variables d'environnement de production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Création du répertoire de l'application
WORKDIR /app

# Copie des fichiers buildés depuis le stage builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Création des répertoires nécessaires avec permissions correctes
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nodejs:nodejs /app

# Changement vers l'utilisateur non-root
USER nodejs

# Exposition du port
EXPOSE 3000

# Configuration du health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Point d'entrée avec dumb-init pour une gestion correcte des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["node", "dist/main.js"]

# ========================================
# Instructions de build pour Back4App
# ========================================
# Build command: docker build -t cleaner-backend:latest .
# Deploy: Push to Back4App container registry
# ========================================
