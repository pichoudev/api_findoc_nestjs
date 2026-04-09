# 📋 Configuration Logs Production

## Variables d'environnement à ajouter sur Render.com

### **Configuration des logs**
```bash
# Niveau de logs
LOG_LEVEL=info

# Activer les logs de debug (optionnel)
DEBUG=false

# Format des logs
LOG_FORMAT=json

# Timestamp
LOG_TIMESTAMP=true
```

## 🔍 **Où voir les logs en production**

### **1. Render.com Dashboard**
```
1. Allez sur votre dashboard Render
2. Cliquez sur votre service "backend-cleaner-nestjs"
3. Onglet "Logs"
4. Les logs apparaissent en temps réel
```

### **2. Commande Render CLI**
```bash
# Installer Render CLI
npm install -g @render/cli

# Se connecter
render login

# Voir les logs en temps réel
render logs backend-cleaner-nestjs
```

### **3. Via curl avec logs**
```bash
# Tester et voir les logs simultanément
curl -X POST https://backend-cleaner-nestjs.onrender.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "test@example.com", "purpose": "VERIFY_EMAIL"}' \
  -v
```

## 📊 **Format des logs attendus**

### **✅ Logs structurés**
```
[2024-01-01T12:00:00.000Z] [LOG] AuthService: === DÉBUT SEND OTP ===
[2024-01-01T12:00:00.001Z] [LOG] AuthService: Email/Phone: test@example.com
[2024-01-01T12:00:00.002Z] [LOG] AuthService: Purpose: VERIFY_EMAIL
[2024-01-01T12:00:00.003Z] [LOG] AuthService: Is Email: true
[2024-01-01T12:00:00.004Z] [LOG] AuthService: Recherche par email...
[2024-01-01T12:00:00.005Z] [LOG] AuthService: User found: YES
[2024-01-01T12:00:00.006Z] [LOG] AuthService: User ID: uuid-123
[2024-01-01T12:00:00.007Z] [LOG] AuthService: OTP généré: 123456
[2024-01-01T12:00:00.008Z] [LOG] AuthService: Envoi de l'OTP...
[2024-01-01T12:00:00.009Z] [LOG] AuthService: ✅ OTP envoyé par email
[2024-01-01T12:00:00.010Z] [LOG] AuthService: === FIN SEND OTP ===
```

### **❌ Logs d'erreur**
```
[2024-01-01T12:00:00.000Z] [ERROR] AuthService: ❌ Erreur dans sendOtp: Timeout envoi email
Stack trace:
Error: Timeout envoi email
    at /app/src/auth/auth.service.ts:352:25
```

### **⚠️ Logs d'avertissement**
```
[2024-01-01T12:00:00.000Z] [WARN] AuthService: Utilisateur non trouvé - retour silencieux pour sécurité
```

## 🛠️ **Configuration avancée**

### **Logs vers fichier (local)**
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Rediriger les logs vers un fichier en production
  if (process.env.NODE_ENV === 'production') {
    const logFile = fs.createWriteStream(path.join(__dirname, '../logs/app.log'), { flags: 'a' });
    process.stdout.write = logFile.write.bind(logFile);
    process.stderr.write = logFile.write.bind(logFile);
  }
  
  await app.listen(3000);
}
```

### **Logs avec Winston (alternative)**
```bash
# Installer Winston
npm install winston nest-winston
```

## 🚀 **Déploiement avec logs**

1. **Ajoutez les variables d'environnement** sur Render.com
2. **Déployez** votre application
3. **Testez** les endpoints
4. **Vérifiez les logs** dans le dashboard Render

## 📱 **Test immédiat**

```bash
# Testez l'endpoint et vérifiez les logs
curl -X POST https://backend-cleaner-nestjs.onrender.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "apollinebanemb@gmail.com", "purpose": "VERIFY_EMAIL"}'
```

Les logs apparaîtront immédiatement dans votre dashboard Render.com !
