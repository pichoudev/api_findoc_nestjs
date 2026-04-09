# ========================================
# Instructions de déploiement Back4App
# ========================================

## 📋 Prérequis

1. **Compte Back4App** avec plan supportant Docker
2. **Docker** installé localement
3. **CLI Back4App** (optionnel)
4. **Accès au registre Docker** Back4App

## 🚀 Étapes de déploiement

### 1. Configuration des variables d'environnement

```bash
# Copiez le template d'environnement
cp .docker-back4app.env .env.production

# Éditez avec vos vraies clés
nano .env.production
```

### 2. Build et push de l'image

```bash
# Rendez le script exécutable
chmod +x scripts/deploy-back4app.sh

# Exécutez le déploiement
./scripts/deploy-back4app.sh
```

### 3. Configuration dans Back4App

1. **Connectez-vous** à votre dashboard Back4App
2. **Créez une nouvelle application** ou utilisez une existante
3. **Configurez les variables d'environnement** depuis le dashboard
4. **Activez le support Docker**
5. **Configurez le port** (3000)
6. **Configurez le domaine** personnalisé si nécessaire

### 4. Vérification du déploiement

```bash
# Vérifiez que l'application est en ligne
curl https://your-app.back4app.io/health

# Ou utilisez le script de santé
./scripts/health-check.sh
```

## 🔧 Configuration requise

### Variables d'environnement essentielles

| Variable | Description | Valeur requise |
|----------|-------------|----------------|
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port d'écoute | `3000` |
| `DATABASE_URL` | PostgreSQL | URL Back4App |
| `JWT_SECRET` | Clé JWT | Clé générée |
| `FRONTEND_URL` | URL frontend | URL Back4App |

### Services externes recommandés

- **Email**: SendGrid (intégré à Back4App)
- **SMS**: Twilio (intégré à Back4App)
- **Storage**: Back4App Files
- **Monitoring**: Back4App Analytics

## 🏥 Health Check

L'application expose un endpoint `/health` :

```json
{
  "status": "ok",
  "timestamp": "2026-04-03T09:47:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

## 📊 Monitoring et Logs

### Logs Back4App
- Accédez aux logs depuis le dashboard Back4App
- Configurez les alertes pour les erreurs critiques
- Surveillez les métriques de performance

### Métriques importantes
- **Uptime**: Disponibilité de l'application
- **Response time**: Temps de réponse moyen
- **Error rate**: Taux d'erreurs
- **Memory usage**: Utilisation mémoire
- **CPU usage**: Utilisation processeur

## 🔄 Déploiement continu

### GitHub Actions (optionnel)

```yaml
# .github/workflows/deploy-back4app.yml
name: Deploy to Back4App
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push Docker image
        run: |
          docker build -t cleaner-backend:latest .
          docker push ${{ secrets.BACK4APP_REGISTRY }}/cleaner-backend:latest
```

## 🛠️ Dépannage

### Problèmes courants

1. **Application ne démarre pas**
   - Vérifiez les variables d'environnement
   - Consultez les logs Back4App
   - Vérifiez le port configuré

2. **Connexion base de données échoue**
   - Vérifiez `DATABASE_URL`
   - Confirmez que la base est accessible
   - Vérifiez les permissions

3. **CORS errors**
   - Configurez `FRONTEND_URL` correctement
   - Vérifiez les origines autorisées

### Commandes utiles

```bash
# Vérifier l'image localement
docker run -p 3000:3000 cleaner-backend:latest

# Logs en temps réel
docker logs -f cleaner-backend

# Entrer dans le container
docker exec -it cleaner-backend /bin/sh
```

## 📈 Optimisations

### Performance
- **Compression Gzip** activée
- **Cache Redis** configuré
- **Connection pooling** PostgreSQL
- **CDN** pour fichiers statiques

### Sécurité
- **Utilisateur non-root** dans le container
- **Clés JWT robustes** (256-bit)
- **Rate limiting** configuré
- **HTTPS** obligatoire

## 📞 Support

- **Documentation Back4App**: https://docs.back4app.com
- **Support technique**: support@back4app.com
- **Community**: https://community.back4app.com

---

**✅ Votre application est maintenant prête pour le déploiement professionnel sur Back4App !**
