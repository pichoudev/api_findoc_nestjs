# Guide de Configuration SMTP Gmail pour Cleaner App
## 📧 Configuration requise pour l'envoi d'emails OTP

### Étape 1: Activer la validation en deux étapes Gmail
1. Allez sur [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Connectez-vous à votre compte Gmail
3. Dans la section "Connexion à Google", cliquez sur **"Validation en deux étapes"**
4. Activez l'option

### Étape 2: Générer un mot de passe d'application
1. Sur la même page sécurité, allez dans **"Mots de passe des applications"**
2. Cliquez sur **"+ Sélectionner une application"**
3. Choisissez **"Autre (nom personnalisé)"**
4. Donnez un nom: "Cleaner App OTP"
5. Cliquez sur **"Générer"**
6. **Copiez le mot de passe de 16 caractères** généré

### Étape 3: Configurer le fichier .env
```bash
# Copiez ce fichier en .env (remplacez les valeurs)
cp .env.example .env
```

Éditez le fichier `.env` avec vos informations :
```env
# Configuration SMTP pour OTP (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="xxxx-xxxx-xxxx-xxxx"  # Mot de passe d'application de 16 caractères
SMTP_FROM="noreply@cleaner.cm"
```

### Étape 4: Redémarrer le serveur
```bash
npm run start:dev
```

## 🔐 Variables importantes

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SMTP_HOST` | Serveur SMTP Gmail | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Votre email Gmail | `votre-email@gmail.com` |
| `SMTP_PASS` | **Mot de passe d'application** (pas le mot de passe du compte) | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Email d'expéditeur | `noreply@cleaner.cm` |

## ⚠️ Points importants

1. **N'utilisez JAMAIS votre mot de passe Gmail habituel** dans `SMTP_PASS`
2. **Utilisez TOUJOURS un mot de passe d'application** de 16 caractères
3. Le mot de passe d'application est différent de votre mot de passe de compte
4. Gardez le mot de passe d'application sécurisé
5. Chaque mot de passe d'application est unique

## 🧪 Test de configuration

Après configuration, testez avec cette requête HTTP :
```http
POST http://localhost:3000/auth/send-otp
Content-Type: application/json

{
  "emailOrPhone": "votre-email@gmail.com"
}
```

## 🔍 Vérification

1. **Vérifiez les logs du serveur** pour voir les messages SMTP
2. **Vérifiez votre boîte de réception** Gmail
3. **Vérifiez le dossier Spam** si l'email n'arrive pas

## 🚨 Erreurs communes

- `535-5.7.8 Username and Password not accepted` → Mauvais mot de passe ou utilisation du mot de passe de compte au lieu du mot de passe d'application
- `Connection timeout` → Problème réseau ou firewall
- `Greeting never received` -> Mauvais serveur SMTP ou port

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez la documentation Gmail : https://support.google.com/accounts/answer/185833
2. Assurez-vous que la validation en deux étapes est activée
3. Générez un nouveau mot de passe d'application si nécessaire
