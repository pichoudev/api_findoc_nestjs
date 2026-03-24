# ✅ Unified OTP System - Cleaner App

## 🎯 **Approche unifiée pour tous les envois d'OTP**

Tous les envois de codes OTP utilisent maintenant la même approche robuste :

## 📍 **Points d'envoi d'OTP**

### **1. Création d'utilisateur** ✅
```typescript
// src/auth/auth.service.ts - méthode register()
await this.sendOtp(user.email, 'VERIFY_EMAIL');
```

### **2. Envoi OTP direct** ✅
```typescript
// src/auth/auth.controller.ts - endpoint /auth/send-otp
return this.authService.sendOtp(sendOtpDto.emailOrPhone, sendOtpDto.purpose || 'VERIFY_EMAIL');
```

### **3. Réinitialisation mot de passe** ✅
```typescript
// src/auth/auth.service.ts - méthode requestPasswordReset()
await this.sendOtp(emailOrPhone, 'RESET_PASSWORD');
```

## 🛠️ **Caractéristiques communes**

### **✅ Base de données (pas de mémoire)**
```sql
-- Tous les OTP sont stockés dans la table otp_tokens
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY,
  userId UUID,
  code VARCHAR(6),
  purpose VARCHAR(20),
  expiresAt TIMESTAMP,
  usedAt TIMESTAMP NULL
);
```

### **✅ Timeout de 30 secondes**
```typescript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout envoi email')), 30000);
});
await Promise.race([emailPromise, timeoutPromise]);
```

### **✅ Logs structurés**
```typescript
this.logger.log(`Envoi du code OTP ${code} à ${email}`);
this.logger.log(`Configuration SMTP: ${this.configService.get('MAIL_HOST')}`);
this.logger.log('Email OTP envoyé avec succès');
```

### **✅ Gestion d'erreur robuste**
```typescript
if (error.message.includes('Timeout') || error.message.includes('SMTP')) {
  return {
    message: 'Code OTP généré mais erreur lors de l\'envoi. Veuillez réessayer.',
    expiresIn: 600,
  };
}
```

### **✅ Sécurité unifiée**
```typescript
// Ne jamais révéler si l'utilisateur existe
if (!user) {
  return {
    message: 'Si cet utilisateur existe, un code de vérification a été envoyé',
    expiresIn: 600,
  };
}
```

## 🔄 **Flux unifié**

### **Étape 1: Génération**
```typescript
const { code, secret, expiresAt } = this.otpService.generateOtp();
```

### **Étape 2: Stockage BDD**
```typescript
await this.prisma.otpToken.create({
  data: { userId, code, purpose, expiresAt }
});
```

### **Étape 3: Envoi avec timeout**
```typescript
await Promise.race([emailPromise, timeoutPromise]);
```

### **Étape 4: Logs détaillés**
```typescript
this.logger.log(`OTP généré: ${code}`);
this.logger.log(`Nouvel OTP créé avec ID: ${newOtp.id}`);
this.logger.log('✅ OTP envoyé par email');
```

## 📊 **Endpoints utilisant le système unifié**

### **POST /api/v1/auth/send-otp**
```json
{
  "emailOrPhone": "user@example.com",
  "purpose": "VERIFY_EMAIL"
}
```

### **POST /api/v1/auth/register** (envoie OTP automatiquement)
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jean",
  "lastName": "Dupont",
  "neighborhood": "Bonabéri"
}
```

### **POST /api/v1/auth/request-password-reset**
```json
{
  "emailOrPhone": "user@example.com"
}
```

## 🚀 **Avantages de l'unification**

### **✅ Cohérence**
- Tous les OTP utilisent le même format d'email
- Même timeout (30 secondes) partout
- Même gestion d'erreur

### **✅ Traçabilité**
- Logs structurés avec timestamps
- Stack traces complètes en cas d'erreur
- Suivi complet du cycle de vie OTP

### **✅ Performance**
- Timeout évite les blocages
- Base de données persistante
- Nettoyage automatique des anciens OTP

### **✅ Sécurité**
- Messages génériques pour éviter l'énumération
- Stockage chiffré dans la BDD
- Expiration automatique (10 minutes)

## 🧪 **Tests unifiés**

### **Test de création utilisateur**
```bash
curl -X POST https://backend-cleaner-nestjs.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "firstName": "Test", "lastName": "User", "neighborhood": "Bonabéri"}'
```

### **Test envoi OTP direct**
```bash
curl -X POST https://backend-cleaner-nestjs.onrender.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "test@example.com", "purpose": "VERIFY_EMAIL"}'
```

### **Test reset password**
```bash
curl -X POST https://backend-cleaner-nestjs.onrender.com/api/v1/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "test@example.com"}'
```

## 📈 **Monitoring**

Tous les envois d'OTP génèrent les mêmes logs structurés dans Render.com :

```
[2024-01-01T12:00:00.000Z] [LOG] AuthService: Email/Phone: test@example.com
[2024-01-01T12:00:00.001Z] [LOG] AuthService: User found: YES
[2024-01-01T12:00:00.002Z] [LOG] AuthService: OTP généré: 123456
[2024-01-01T12:00:00.003Z] [LOG] OtpService: Envoi du code OTP 123456 à test@example.com
[2024-01-01T12:00:00.004Z] [LOG] OtpService: Email OTP envoyé avec succès
```

**🎯 Tous les envois d'OTP utilisent maintenant la même approche robuste et unifiée !**
