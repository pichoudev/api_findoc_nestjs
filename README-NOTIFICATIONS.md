# 📱 Notifications Push - Firebase & OneSignal

## 🎯 Objectif

Configurer un système complet de notifications push pour l'application Cleaner App en utilisant Firebase Cloud Messaging (FCM) et OneSignal.

## 📋 Configuration requise

### **🔥 Firebase Cloud Messaging (FCM)**

1. **Créer un projet Firebase**
   - Allez sur [Firebase Console](https://console.firebase.google.com/)
   - Créez un nouveau projet ou utilisez un projet existant

2. **Générer une clé de service**
   - Paramètres du projet → Comptes de service
   - Cliquez sur "Générer une nouvelle clé privée"
   - Téléchargez le fichier JSON ou copiez les informations

3. **Activer Cloud Messaging**
   - Paramètres du projet → Cloud Messaging
   - Activez l'API Cloud Messaging

### **📢 OneSignal**

1. **Créer un compte OneSignal**
   - Allez sur [OneSignal](https://onesignal.com/)
   - Créez un compte gratuit

2. **Créer une application**
   - Dashboard → Applications → Add New App
   - Choisissez "Web Push" ou "Mobile"
   - Configurez les paramètres

3. **Récupérer les clés**
   - App Settings → Keys & IDs
   - Copiez l'App ID et l'API Key

## 🔧 Installation et Configuration

### **1. Installer les dépendances**
```bash
npm install firebase-admin @nestjs/config
```

### **2. Configurer les variables d'environnement**
Copiez `.env.example` vers `.env` et configurez :

```bash
# Firebase
FIREBASE_PROJECT_ID=votre_projet_firebase_id
FIREBASE_CLIENT_EMAIL=votre_service_account_email@votre_projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# OneSignal
ONESIGNAL_APP_ID=votre_onesignal_app_id
ONESIGNAL_API_KEY=votre_onesignal_api_key
```

### **3. Ajouter le module**
Le `NotificationsModule` est déjà configuré dans `app.module.ts`.

## 🚀 Utilisation

### **📱 Firebase Service**

```typescript
import { FirebaseService } from './notifications/firebase.service';

// Envoyer à un utilisateur
await firebaseService.sendNotificationToUser(
  'fcm_token',
  'Titre de la notification',
  'Contenu du message',
  { type: 'CUSTOM_TYPE' },
  'https://example.com/image.jpg'
);

// Envoyer à plusieurs utilisateurs
await firebaseService.sendNotificationToMultipleUsers(
  ['token1', 'token2'],
  'Titre',
  'Message',
  { data: 'value' }
);

// Envoyer à un topic
await firebaseService.sendNotificationToTopic(
  'agents_douala',
  'Message pour les agents',
  'Contenu'
);
```

### **📢 OneSignal Service**

```typescript
import { OneSignalService } from './notifications/onesignal.service';

// Envoyer à tous les utilisateurs
await oneSignalService.sendNotificationToAll(
  'Titre',
  'Message',
  { data: 'value' }
);

// Envoyer à un segment
await oneSignalService.sendNotificationToSegment(
  'agents_douala',
  'Titre',
  'Message'
);

// Envoyer à des utilisateurs spécifiques
await oneSignalService.sendNotificationToMultipleUsers(
  ['player_id_1', 'player_id_2'],
  'Titre',
  'Message'
);
```

## 📊 Endpoints API

### **🔥 Firebase**

#### `POST /api/v1/notifications/send/firebase`
Envoie une notification via Firebase FCM.

**Corps de la requête :**
```json
{
  "tokens": ["fcm_token_1", "fcm_token_2"],
  "title": "Titre de la notification",
  "body": "Contenu du message",
  "data": {
    "type": "CUSTOM_TYPE",
    "additionalData": "value"
  },
  "imageUrl": "https://example.com/image.jpg"
}
```

### **📢 OneSignal**

#### `POST /api/v1/notifications/send/onesignal`
Envoie une notification via OneSignal.

**Corps de la requête :**
```json
{
  "sendToAll": true,
  "segments": ["agents_douala"],
  "playerIds": ["player_id_1", "player_id_2"],
  "title": "Titre de la notification",
  "message": "Contenu du message",
  "data": {
    "type": "CUSTOM_TYPE"
  },
  "imageUrl": "https://example.com/image.jpg",
  "url": "https://your-app.com/target",
  "buttons": [
    {
      "id": "action_1",
      "text": "Voir les détails",
      "url": "https://your-app.com/details"
    }
  ]
}
```

### **🤖 Notifications Automatiques**

#### `POST /api/v1/notifications/send/bin-report`
Notifie automatiquement lors d'un signalement de bac.

```json
{
  "binId": "bin_uuid",
  "reportType": "DEBORDEMENT",
  "neighborhood": "Bonapriso",
  "urgency": "HIGH"
}
```

#### `POST /api/v1/notifications/send/intervention-assigned`
Notifie un agent lors de l'assignation d'une intervention.

```json
{
  "agentId": "agent_user_id",
  "interventionId": "int_123",
  "binRefCode": "BAC-001",
  "reportType": "Dégradation"
}
```

#### `POST /api/v1/notifications/send/bin-status-change`
Notifie les citoyens d'un changement de statut de bac.

```json
{
  "binId": "bin_uuid",
  "refCode": "BAC-001",
  "oldStatus": "ACTIF",
  "newStatus": "INACTIF",
  "neighborhood": "Bonapriso"
}
```

#### `GET /api/v1/notifications/test`
Endpoint de test pour vérifier la configuration.

## 🎨 Personnalisation

### **📱 Android**
- Priorité haute
- Son par défaut
- Badge compteur
- Action au clic

### **🍎 iOS**
- Son personnalisé
- Badge incrémental
- Payload APNS

### **🎯 Boutons d'action**
- Boutons interactifs
- URLs de redirection
- Icônes personnalisées

## 📈 Segmentation OneSignal

### **Segments prédéfinis**
- `agents_douala` : Agents de la ville de Douala
- `citizens_bonapriso` : Citoyens du quartier Bonapriso
- `supervisors` : Superviseurs
- `all` : Tous les utilisateurs

### **Créer des segments dynamiques**
```typescript
await oneSignalService.createSegment(
  'agents_actifs',
  [
    { field: 'tag', operator: 'exists', value: 'agent' },
    { field: 'last_active', operator: '>', value: '7' }
  ]
);
```

## 🔧 Intégration avec les services existants

### **Integrations avec Reports**
```typescript
// Dans reports.service.ts
constructor(
  private notificationsService: NotificationsService,
) {}

async createReport(createReportDto: CreateReportDto) {
  const report = await this.prisma.report.create({ ... });
  
  // Notifier les agents du quartier
  await this.notificationsService.notifyBinReport({
    binId: report.bacId,
    reportType: report.type,
    neighborhood: report.neighborhood,
    urgency: report.urgency
  });
  
  return report;
}
```

### **Intégration avec Interventions**
```typescript
// Dans interventions.service.ts
async assignIntervention(interventionId: string, agentId: string) {
  const intervention = await this.prisma.intervention.update({
    where: { id: interventionId },
    data: { agentId }
  });
  
  // Notifier l'agent
  await this.notificationsService.notifyInterventionAssigned({
    agentId,
    interventionId,
    binRefCode: intervention.binRefCode,
    reportType: intervention.reportType
  });
  
  return intervention;
}
```

## 🧪 Tests

### **Fichiers de test**
- `notifications-test.http` : Tests manuels
- Tests automatiques dans `/test/`

### **Commandes de test**
```bash
# Tester les notifications
npm run test:e2e notifications

# Vérifier la configuration
curl http://localhost:3000/api/v1/notifications/test
```

## 📊 Monitoring

### **Logs**
- Logs détaillés dans la console
- Erreurs spécifiques gérées
- Statistiques d'envoi

### **Métriques OneSignal**
- Dashboard OneSignal
- Taux de livraison
- Ouvertures et clics

### **Métriques Firebase**
- Firebase Console
- Performance FCM
- Erreurs d'envoi

## 🚨 Gestion des erreurs

### **Erreurs Firebase**
- `messaging/registration-token-not-registered` : Token invalide
- `messaging/invalid-argument` : Argument invalide

### **Erreurs OneSignal**
- Réponses détaillées avec codes d'erreur
- Validation des tokens
- Gestion des quotas

## 📱 Configuration Client (Flutter)

### **Installation des dépendances**
```yaml
dependencies:
  firebase_messaging: ^14.7.10
  onesignal_flutter: ^3.5.1
```

### **Initialisation Firebase**
```dart
import 'package:firebase_messaging/firebase_messaging.dart';

final fcmToken = await FirebaseMessaging.instance.getToken();
```

### **Initialisation OneSignal**
```dart
import 'package:onesignal_flutter/onesignal_flutter.dart';

OneSignal.shared.setAppId('votre_onesignal_app_id');
OneSignal.shared.promptUserForPushNotificationPermission();
```

## 🔄 Bonnes pratiques

### **✅ Recommandé**
- Utiliser les deux services (redondance)
- Segmenter les utilisateurs
- Personnaliser les messages
- Tester en environnement de staging

### **❌ À éviter**
- Envoyer des notifications non pertinentes
- Surcharger les utilisateurs
- Ignorer les erreurs de tokens
- Utiliser des messages trop longs

## 📞 Support

### **Documentation**
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [OneSignal API](https://documentation.onesignal.com/reference/api)

### **Limites**
- Firebase : 100 messages/minute par projet
- OneSignal : 100,000 messages/jour (gratuit)

---

**Version**: 1.0.0  
**Date**: 28/04/2026  
**Auteur**: Cleaner App Dev Team
