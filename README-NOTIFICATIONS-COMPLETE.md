# 📱 Système Complet de Notifications Push

## 🎯 Vue d'ensemble

Ce système implémente un flux complet de notifications push avec **enregistrement en base de données** avant l'envoi aux serveurs de messagerie (Firebase + OneSignal).

## 🔄 Architecture du Flux

```
📱 App Mobile
     ↓ (1) Envoi token
🌐 Backend NestJS
     ↓ (2) Enregistrement en base
📊 PostgreSQL
     ↓ (3) Envoi push
🔥 Firebase FCM / 📢 OneSignal
     ↓ (4) Distribution
📱 App Mobile
```

## 📊 Modèle de Données

### **Notifications Table**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type NotificationType NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT now()
);
```

### **Users Table (avec tokens)**
```sql
ALTER TABLE users 
ADD COLUMN onesignal_player_id TEXT,
ADD COLUMN fcm_token TEXT;
```

## 🚀 Services Implémentés

### **1. PushNotificationService** - Service Principal
- **Flux complet** : Base → Firebase → OneSignal
- **Gestion d'erreurs** : Nettoyage automatique des tokens invalides
- **Bulk sending** : Envoi à plusieurs utilisateurs
- **Segmentation** : Envoi par segments (agents, citoyens, etc.)

### **2. FirebaseService** - Service FCM
- Envoi individuel et multiple
- Gestion des topics
- Support Android/iOS
- Gestion des erreurs spécifiques

### **3. OneSignalService** - Service OneSignal
- Envoi global et segmenté
- Boutons interactifs
- Images et URLs
- Dashboard analytics

### **4. NotificationService** - Service Existant
- Templates de notifications
- Événements et handlers
- Gestion en base de données

## 📱 Endpoints API

### **🔧 Gestion des Tokens**

#### `POST /api/v1/device-tokens/fcm`
```json
{
  "token": "fcm_token_here_1234567890"
}
```

#### `POST /api/v1/device-tokens/onesignal`
```json
{
  "playerId": "12345678-1234-1234-1234-123456789012"
}
```

#### `POST /api/v1/device-tokens/both`
```json
{
  "fcmToken": "fcm_token_here_1234567890",
  "oneSignalPlayerId": "12345678-1234-1234-1234-123456789012"
}
```

#### `GET /api/v1/device-tokens/status`
Retourne les tokens enregistrés pour l'utilisateur

#### `POST /api/v1/device-tokens/test`
```json
{
  "title": "🧪 Test personnalisé",
  "body": "Ceci est un test"
}
```

#### `POST /api/v1/device-tokens/clear`
Supprime tous les tokens (déconnexion)

### **📢 Envoi de Notifications**

#### `POST /api/v1/notifications/send/firebase`
```json
{
  "tokens": ["fcm_token_1", "fcm_token_2"],
  "title": "Titre de la notification",
  "body": "Contenu du message",
  "data": { "type": "CUSTOM" },
  "imageUrl": "https://example.com/image.jpg"
}
```

#### `POST /api/v1/notifications/send/onesignal`
```json
{
  "sendToAll": true,
  "segments": ["agents_douala"],
  "playerIds": ["player_id_1"],
  "title": "Titre",
  "message": "Message",
  "data": { "type": "CUSTOM" },
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
```json
{
  "binId": "bin_uuid",
  "reportType": "DEBORDEMENT",
  "neighborhood": "Bonapriso",
  "urgency": "HIGH"
}
```

## 🔧 Intégration dans vos Services

### **Exemple dans ReportsService**
```typescript
import { PushNotificationService } from '../notifications/push-notification.service';

@Injectable()
export class ReportsService {
  constructor(
    private pushNotificationService: PushNotificationService,
  ) {}

  async createReport(createReportDto: CreateReportDto) {
    const report = await this.prisma.report.create({ ... });
    
    // Notifier immédiatement
    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: report.reporterId,
        title: '🗑️ Signalement créé',
        body: `Votre signalement ${report.referenceCode} est en cours de traitement`,
        data: {
          type: 'REPORT_CREATED',
          reportId: report.id,
          referenceCode: report.referenceCode,
        },
        url: `/reports/${report.id}`,
      },
      NotificationType.REPORT_RECEIVED,
      'report',
      report.id,
    );
    
    return report;
  }
}
```

### **Exemple dans InterventionsService**
```typescript
async assignIntervention(interventionId: string, agentId: string) {
  const intervention = await this.prisma.intervention.update({
    where: { id: interventionId },
    data: { agentId }
  });
  
  // Notifier l'agent
  await this.pushNotificationService.createAndSendPushNotification(
    {
      userId: agentId,
      title: '🔧 Nouvelle intervention',
      body: `Intervention assignée pour le bac ${intervention.binRefCode}`,
      data: {
        type: 'INTERVENTION_ASSIGNED',
        interventionId: intervention.id,
      },
      url: `/interventions/${intervention.id}`,
      priority: 'high',
    },
    NotificationType.REPORT_ASSIGNED,
    'intervention',
    intervention.id,
  );
  
  return intervention;
}
```

## 📱 Intégration Flutter (Côté Client)

### **Installation des dépendances**
```yaml
dependencies:
  firebase_messaging: ^14.7.10
  onesignal_flutter: ^3.5.1
  flutter_local_notifications: ^16.1.0
```

### **Code d'initialisation**
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';

class NotificationService {
  static Future<void> initialize() async {
    // Initialisation Firebase
    final fcmToken = await FirebaseMessaging.instance.getToken();
    print('FCM Token: $fcmToken');
    
    // Initialisation OneSignal
    OneSignal.shared.setAppId('votre_onesignal_app_id');
    OneSignal.shared.promptUserForPushNotificationPermission();
    
    final deviceState = await OneSignal.shared.getDeviceState();
    final playerId = deviceState?.userId;
    print('OneSignal Player ID: $playerId');
    
    // Envoyer les tokens au backend
    await _registerTokens(fcmToken, playerId);
  }
  
  static Future<void> _registerTokens(String? fcmToken, String? playerId) async {
    if (fcmToken != null && playerId != null) {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/v1/device-tokens/both'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $userToken',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
          'oneSignalPlayerId': playerId,
        }),
      );
      
      print('Tokens enregistrés: ${response.statusCode}');
    }
  }
  
  static Future<void> setupForegroundHandlers() async {
    // Firebase messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Reçu Firebase: ${message.notification?.title}');
      _showLocalNotification(message);
    });
    
    // OneSignal messages
    OneSignal.shared.setNotificationWillShowInForegroundHandler((notification) {
      print('Reçu OneSignal: ${notification.title}');
      _handleOneSignalNotification(notification);
    });
  }
  
  static void _showLocalNotification(RemoteMessage message) {
    flutterLocalNotificationsPlugin.show(
      message.hashCode(),
      message.notification?.title,
      message.notification?.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'cleaner_channel',
          'Cleaner Notifications',
          channelDescription: 'Notifications de l\'app Cleaner',
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: IOSNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }
}
```

## 📊 Monitoring et Statistiques

### **Récupérer les statistiques**
```typescript
// Statistiques globales
const stats = await pushNotificationService.getNotificationStats();

// Statistiques par utilisateur
const userStats = await pushNotificationService.getNotificationStats(
  userId,
  startDate,
  endDate
);
```

### **Logs et Erreurs**
- **Logs détaillés** dans la console NestJS
- **Erreurs spécifiques** gérées (tokens invalides, etc.)
- **Métriques d'envoi** (succès/échec par service)

## 🧪 Tests

### **Fichiers de test**
- `notifications-test.http` : Tests des endpoints de notifications
- `device-tokens-test.http` : Tests des tokens

### **Commandes de test**
```bash
# Tester les tokens
curl -X POST http://localhost:3000/api/v1/device-tokens/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "🧪 Test", "body": "Ceci est un test"}'

# Tester les notifications
curl http://localhost:3000/api/v1/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Flow Complet d'une Notification

### **1. Enregistrement des Tokens**
```
📱 App → POST /device-tokens/both
     ↓
🗄️ Base → Mise à jour user.fcmToken, user.oneSignalPlayerId
     ↓
🔧 Test → Envoi notification de test
```

### **2. Création et Envoi**
```
📝 Service → createAndSendPushNotification()
     ↓
🗄️ Base → Création notification dans notifications
     ↓
🔥 Firebase → sendNotificationToUser()
     ↓
📢 OneSignal → sendNotificationToUser() (fallback)
     ↓
📱 App → Réception et affichage
```

### **3. Gestion des Erreurs**
```
❌ Token invalide → Nettoyage automatique
     ↓
📧 Logs → Erreurs détaillées
     ↓
🔄 Retry → Tentative avec l'autre service
```

## 📈 Bonnes Pratiques

### **✅ Recommandé**
- **Double tokens** : Firebase + OneSignal pour redondance
- **Validation** : Toujours valider les tokens avant enregistrement
- **Segmentation** : Utiliser les segments pour les envois bulk
- **Personnalisation** : Adapter les messages au contexte
- **Monitoring** : Surveiller les taux de livraison

### **❌ À éviter**
- **Tokens en dur** : Toujours les récupérer dynamiquement
- **Envoi synchrone** : Utiliser les queues pour les envois bulk
- **Messages longs** : Garder les notifications concises
- **Spam** : Respecter les fréquences d'envoi

## 🚀 Déploiement

### **Variables d'environnement**
```bash
# Firebase
FIREBASE_PROJECT_ID=votre_projet_firebase_id
FIREBASE_CLIENT_EMAIL=votre_service_account_email@votre_projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# OneSignal
ONESIGNAL_APP_ID=votre_onesignal_app_id
ONESIGNAL_API_KEY=votre_onesignal_api_key
```

### **Migration de la base**
```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy
```

## 📞 Support et Dépannage

### **Problèmes courants**
- **Token FCM invalide** : Nettoyage automatique implémenté
- **OneSignal rate** : Fallback sur Firebase
- **Base de données** : Vérifier la connexion Prisma
- **Permissions** : Vérifier les permissions de notification

### **Debug**
```typescript
// Activer les logs détaillés
constructor() {
  this.logger.setLogLevel('debug');
}

// Vérifier les tokens
await this.checkTokenValidity(userId);
```

---

**Version**: 2.0.0  
**Date**: 28/04/2026  
**Auteur**: Cleaner App Dev Team

**Fonctionnalités**:
- ✅ Enregistrement en base avant envoi
- ✅ Double service (Firebase + OneSignal)
- ✅ Gestion automatique des tokens invalides
- ✅ Segmentation et envoi bulk
- ✅ Monitoring et statistiques
- ✅ Documentation complète
