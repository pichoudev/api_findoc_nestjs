# 📱 Système Simplifié de Notifications OneSignal

## 🎯 Vue d'ensemble

Système de notifications push **uniquement avec OneSignal** pour éviter toute confusion. Simple, efficace et facile à maintenir.

## 🔄 Flux Simplifié

```
📱 App Mobile
     ↓ (1) Récupération Player ID
🌐 Backend NestJS
     ↓ (2) Inscription/Connexion avec Player ID
📊 PostgreSQL
     ↓ (3) Stockage Player ID
📢 OneSignal API
     ↓ (4) Envoi notification
📱 App Mobile
```

## 📊 Base de Données

### **Users Table**
```sql
-- Champs ajoutés pour OneSignal
ALTER TABLE users 
ADD COLUMN onesignal_player_id TEXT;
```

### **Notifications Table**
```sql
-- Table existante pour l'historique
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

## 🚀 Services Implémentés

### **1. SimpleNotificationService** - Service Principal
- **Flux simple** : Base → OneSignal
- **Gestion d'erreurs** : Logs détaillés
- **Bulk sending** : Envoi à plusieurs utilisateurs
- **Segmentation** : Envoi par segments (agents, citoyens, etc.)

### **2. OneSignalService** - Service OneSignal
- Envoi individuel et segmenté
- Support des boutons interactifs
- Images et URLs personnalisées
- Gestion des erreurs spécifiques

## 📱 Endpoints API

### **🔧 Gestion des Player IDs**

#### `POST /api/v1/auth/register`
```json
{
  "firstName": "Marie",
  "lastName": "Curie", 
  "email": "marie.curie@example.com",
  "phone": "+237698765432",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "CITIZEN",
  "neighborhood": "Bonapriso",
  "oneSignalPlayerId": "12345678-1234-1234-1234-123456789012"
}
```

#### `POST /api/v1/auth/login`
```json
{
  "email": "marie.curie@example.com",
  "password": "password123",
  "oneSignalPlayerId": "12345678-1234-1234-1234-123456789012"
}
```

#### `POST /api/v1/device-tokens/onesignal`
```json
{
  "playerId": "12345678-1234-1234-1234-123456789012"
}
```

#### `GET /api/v1/device-tokens/status`
Retourne le Player ID OneSignal enregistré

#### `POST /api/v1/device-tokens/test`
```json
{
  "title": "🧪 Test OneSignal",
  "body": "Ceci est un test de notification"
}
```

#### `POST /api/v1/device-tokens/clear`
Supprime le Player ID (déconnexion)

### **📢 Envoi de Notifications**

#### Utilisation du service simplifié
```typescript
import { SimpleNotificationService } from './notifications/simple-notification.service';

@Injectable()
export class ReportsService {
  constructor(
    private notificationService: SimpleNotificationService,
  ) {}

  async createReport(createReportDto: CreateReportDto) {
    const report = await this.prisma.report.create({ ... });
    
    // Notifier avec OneSignal
    await this.notificationService.createAndSendNotification(
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

## 📱 Intégration Mobile (Flutter)

### **Installation**
```yaml
dependencies:
  onesignal_flutter: ^3.5.1
```

### **Code d'initialisation**
```dart
import 'package:onesignal_flutter/onesignal_flutter.dart';

class NotificationService {
  static Future<String?> initializeOneSignal() async {
    // Initialiser OneSignal
    OneSignal.shared.setAppId('VOTRE_ONESIGNAL_APP_ID');
    
    // Demander la permission
    await OneSignal.shared.promptUserForPushNotificationPermission();
    
    // Obtenir le Player ID
    final deviceState = await OneSignal.shared.getDeviceState();
    final playerId = deviceState?.userId;
    
    print('🎯 OneSignal Player ID: $playerId');
    
    // Envoyer au backend lors de l'inscription/connexion
    if (playerId != null) {
      await _sendPlayerIdToBackend(playerId);
    }
    
    return playerId;
  }
  
  static Future<void> _sendPlayerIdToBackend(String playerId) async {
    final token = await getAuthToken(); // Votre méthode d'auth
    final response = await http.post(
      Uri.parse('http://localhost:3000/api/v1/auth/register'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'email': email,
        'password': password,
        'oneSignalPlayerId': playerId,
        // ... autres champs
      }),
    );
    
    print('📤 Player ID envoyé: ${response.statusCode}');
  }
}

// Dans main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialiser OneSignal
  await NotificationService.initializeOneSignal();
  
  runApp(MyApp());
}
```

## 🧪 Tests

### **Fichier de test**
Le fichier `register-with-tokens.http` contient tous les tests nécessaires :

- ✅ **Inscription** avec OneSignal Player ID
- ✅ **Connexion** avec OneSignal Player ID
- ✅ **Vérification** du statut des tokens
- ✅ **Test** d'envoi de notifications

### **Commandes de test**
```bash
# Inscription avec OneSignal
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Curie",
    "email": "marie.curie@example.com",
    "phone": "+237698765432",
    "password": "password123",
    "confirmPassword": "password123",
    "oneSignalPlayerId": "12345678-1234-1234-1234-123456789012"
  }'

# Connexion avec OneSignal
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marie.curie@example.com",
    "password": "password123",
    "oneSignalPlayerId": "12345678-1234-1234-1234-123456789012"
  }'

# Tester les notifications
curl -X POST http://localhost:3000/api/v1/device-tokens/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "🧪 Test", "body": "Test OneSignal"}'
```

## 📊 Monitoring

### **Logs structurés**
```
📝 Enregistrement de la notification pour l'utilisateur userId
✅ Notification enregistrée en base: notificationId
📢 Envoi via OneSignal pour l'utilisateur userId
✅ OneSignal: Notification envoyée avec succès
🎉 Notification envoyée avec succès pour l'utilisateur userId
⏱️ Traitement terminé en 150ms
```

### **Métriques disponibles**
- **Taux de livraison** OneSignal
- **Erreurs** détaillées
- **Player IDs** actifs/inactifs
- **Notifications** créées et envoyées

## 🔧 Configuration

### **Variables d'environnement**
```bash
# .env
ONESIGNAL_APP_ID=votre_onesignal_app_id
ONESIGNAL_API_KEY=votre_onesignal_api_key
```

### **Configuration OneSignal**
1. **Créer une app** sur dashboard.onesignal.com
2. **Récupérer l'App ID** dans Settings > Keys & IDs
3. **Générer une REST API Key** dans Settings > Keys & IDs
4. **Configurer les platforms** (iOS/Android)

## 📋 Avantages du Système Simplifié

### **✅ Simplicité**
- **Un seul service** : OneSignal uniquement
- **Pas de confusion** : Pas de double gestion Firebase/OneSignal
- **Code clair** : Facile à maintenir

### **🛡️ Fiabilité**
- **Base de données** : Historique complet
- **Gestion d'erreurs** : Logs détaillés
- **Nettoyage automatique** : Player IDs invalides

### **🚀 Performance**
- **Flux direct** : Base → OneSignal
- **Envoi optimisé** : Segmentation efficace
- **Ressources minimales** : Un seul service

## 🔄 Migration depuis Firebase

Si vous aviez déjà Firebase :

1. **Installer OneSignal SDK** dans votre app mobile
2. **Mettre à jour les endpoints** pour utiliser `oneSignalPlayerId`
3. **Supprimer les références** à `fcmToken`
4. **Tester** avec le nouveau système

## 📞 Support

### **Problèmes courants**
- **Player ID invalide** : Vérifier le format UUID
- **Permission refusée** : Demander la notification dans l'app
- **Base de données** : Vérifier la connexion Prisma

### **Debug**
```typescript
// Activer les logs détaillés
constructor() {
  this.logger.setLogLevel('debug');
}

// Vérifier le Player ID
const hasPlayerId = await this.notificationService.hasOneSignalPlayerId(userId);
```

---

**Version**: 1.0.0  
**Date**: 29/04/2026  
**Auteur**: Cleaner App Dev Team

**Fonctionnalités**:
- ✅ Uniquement OneSignal (pas de confusion)
- ✅ Enregistrement automatique lors inscription/connexion
- ✅ Service simplifié et maintenable
- ✅ Documentation complète
- ✅ Tests prêts à l'emploi
