# 🚨 Configuration SMTP pour Render.com

## Variables d'environnement à ajouter sur Render.com

### **Ajoutez ces variables dans votre dashboard Render → Environment Variables**

```bash
# Configuration SMTP optimisée pour Render.com
NODE_ENV=production
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-app-password-16-caractères
MAIL_FROM_NAME=Cleaner App
MAIL_FROM_ADDRESS=noreply@cleaner.cm

# Logs
LOG_LEVEL=info
DEBUG=false
```

## 🔧 **Points critiques**

### **1. Port 465 (SSL/TLS)**
```bash
# Render.com fonctionne mieux avec le port 465 (SSL)
MAIL_PORT=465
MAIL_SECURE=true
```

### **2. App Password Gmail**
```bash
# Doit être un App Password de 16 caractères
# Pas le mot de passe normal Gmail !
# Généré ici: https://myaccount.google.com/apppasswords
```

### **3. NODE_ENV=production**
```bash
# Active la configuration production dans le code
NODE_ENV=production
```

## 🚀 **Déploiement**

1. **Ajoutez les variables** sur Render.com
2. **Redémarrez le service** 
3. **Testez** l'endpoint send-otp

## 📊 **Logs attendus**

```
[LOG] OtpService: Configuration SMTP: PRODUCTION - Port 465
[LOG] OtpService: Timeout configuré: 60000ms (PRODUCTION)
[LOG] OtpService: Envoi du code OTP 123456 à email@example.com
[LOG] OtpService: Email OTP envoyé avec succès
```

## 🔍 **Si ça ne fonctionne toujours pas**

### **Alternative 1: SendGrid**
```bash
# Créez un compte SendGrid (plus stable que Gmail)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.votre-api-key
```

### **Alternative 2: Mailgun**
```bash
# Autre option fiable pour production
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USERNAME=postmaster@votre-domaine.com
MAIL_PASSWORD=votre-mailgun-password
```

## 🎯 **Test après configuration**

```bash
curl -X POST https://votre-app.onrender.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "test@example.com", "purpose": "VERIFY_EMAIL"}'
```

**Le port 465 avec SSL devrait résoudre le problème de timeout sur Render.com !** 🚀
