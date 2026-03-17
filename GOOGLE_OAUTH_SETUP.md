# Guide de Configuration Google OAuth2 pour Cleaner App
## 🔐 Configuration requise pour l'authentification Google

### Étape 1: Créer un projet Google Cloud Console
1. Allez sur [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Sélectionner un projet"** puis **"Nouveau projet"**
4. Donnez un nom: `Cleaner App Auth`
5. Notez l'**ID du projet** (sera utile plus tard)

### Étape 2: Activer les APIs Google
1. Dans votre projet, allez dans **"Bibliothèque et API"**
2. Cliquez sur **"+ Activer les API et services"**
3. Cherchez et activez :
   - **Google+ API** (pour les informations de profil)
   - **People API** (pour les informations email)

### Étape 3: Configurer OAuth2
1. Allez dans **"Identifiants"** → **"ID client OAuth"**
2. Cliquez sur **"Créer des identifiants"**
3. Remplissez le formulaire :
   - **Type d'application** : Application web
   - **Nom** : Cleaner App Auth
   - **URI de redirection autorisés** :
     ```
     http://localhost:3000/auth/google/callback
     http://localhost:3001/auth/google/callback
     https://votre-domaine.com/auth/google/callback
     ```
4. Cliquez sur **"Créer"**

### Étape 4: Obtenir les identifiants
Après création, vous aurez :
- **ID Client** (à copier dans `.env`)
- **Secret client** (à copier dans `.env`)

### Étape 5: Configurer l'écran de consentement
1. Dans les identifiants OAuth2, cliquez sur votre ID client
2. Allez dans **"Écran de consentement OAuth"**
3. Configurez :
   - **Type d'application** : Interne
   - **Utilisateurs autorisés** : Tous les utilisateurs
   - **Domaines autorisés** : Ajoutez vos domaines de développement/production

### Étape 6: Configurer le fichier .env
```bash
# Copiez ce fichier en .env (remplacez les valeurs)
cp .env.example .env
```

Éditez le fichier `.env` avec vos identifiants :
```env
# Configuration Google OAuth2
GOOGLE_CLIENT_ID="votre-id-client-ici.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre-secret-client-ici"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

## 🔗 URLs de configuration importantes

| Environnement | URL de callback |
|---------------|----------------|
| Développement | `http://localhost:3000/auth/google/callback` |
| Staging | `https://staging.cleaner.cm/auth/google/callback` |
| Production | `https://api.cleaner.cm/auth/google/callback` |

## 🧪 Test de configuration

### 1. Démarrer le serveur
```bash
npm run start:dev
```

### 2. Tester l'authentification Google
Ouvrez votre navigateur et allez sur :
```
http://localhost:3000/auth/google
```

### 3. Vérifier les logs
Dans les logs du serveur, vous devriez voir :
```
✅ Connexion Google réussie pour: utilisateur@gmail.com
🔄 Redirection vers: http://localhost:3001/auth/success?access_token=...
```

## 📋 Flux d'authentification Google

1. **Utilisateur clique sur "Se connecter avec Google"**
2. **Redirection vers Google** → Écran de consentement
3. **Autorisation** → Redirection vers `/auth/google/callback`
4. **Création/Mise à jour utilisateur** → Génération des tokens
5. **Redirection vers frontend** → Connexion automatique

## 🎯 Points importants

1. **HTTPS obligatoire en production** : Google n'accepte que les URLs HTTPS
2. **Domaines autorisés** : Ajoutez tous vos domaines dans l'écran de consentement
3. **Secret client** : Gardez-le secret et ne l'exposez jamais
4. **Callback URL** : Doit correspondre exactement à celle configurée

## 🔍 Dépannage

### Erreurs communes :
- **redirect_uri_mismatch** : URL de callback incorrecte
- **invalid_client** : ID client invalide
- **access_denied** : Utilisateur a refusé l'autorisation

### Solutions :
1. Vérifiez que l'URL de callback correspond exactement
2. Assurez-vous que le domaine est dans la liste des domaines autorisés
3. Vérifiez que les APIs Google+ et People sont activées

## 📞 Support Google

- Documentation Google OAuth2 : https://developers.google.com/identity/protocols/oauth2
- Guide Google Cloud : https://cloud.google.com/docs
- Support développeurs : https://support.google.com/cloud
