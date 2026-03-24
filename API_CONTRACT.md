# 📋 Contrat API - Cleaner App

## 🌐 Informations Générales

### **Base URL**
```
Production: https://api.cleaner.cm/api/v1
Développement: http://localhost:3000/api/v1
```

### **Authentification**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### **Format des réponses**
```json
{
  "success": true,
  "data": {},
  "message": "Opération réussie"
}
```

---

## 🔐 **Module Authentification**

### **POST /api/v1/auth/register**
Inscription d'un nouvel utilisateur

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+237697876543",
  "role": "CITIZEN"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "CITIZEN",
      "isActive": false
    }
  }
}
```

### **POST /api/v1/auth/login**
Connexion d'un utilisateur

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "CITIZEN"
    }
  }
}
```

### **POST /api/v1/auth/refresh-token**
Rafraîchir le token d'accès

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### **POST /api/v1/auth/logout**
Déconnexion

**Headers:** `Authorization: Bearer <token>`

### **POST /api/v1/auth/request-otp**
Demander un code OTP

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
  "purpose": "VERIFY_EMAIL"
}
```

### **POST /api/v1/auth/verify-otp**
Vérifier un code OTP

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
  "code": "123456",
  "purpose": "VERIFY_EMAIL"
}
```

---

## 👥 **Module Utilisateurs**

### **GET /api/v1/users/profile**
Obtenir le profil utilisateur

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+237697876543",
    "role": "CITIZEN",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### **PUT /api/v1/users/profile**
Mettre à jour le profil

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+237697876543"
}
```

---

## 🏙️ **Module Villes & Quartiers**

### **GET /api/v1/cities**
Lister toutes les villes

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Douala",
      "region": {
        "id": "uuid",
        "name": "Littoral"
      }
    }
  ]
}
```

### **GET /api/v1/cities/:cityId/neighborhoods**
Lister les quartiers d'une ville

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Bonabéri",
      "cityId": "uuid"
    }
  ]
}
```

---

## 🗑️ **Module Bacs**

### **GET /api/v1/bins**
Lister tous les bacs

**Query Parameters:**
- `cityId` (optional): Filtrer par ville
- `neighborhoodId` (optional): Filtrer par quartier
- `status` (optional): Filtrer par statut (ACTIVE, INACTIVE)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "refCode": "BAC-001",
      "location": {
        "type": "Point",
        "coordinates": [9.7043, 4.0483]
      },
      "capacityM3": 1.5,
      "binType": "ORGANIC",
      "status": "ACTIVE",
      "neighborhood": {
        "name": "Bonabéri",
        "city": {
          "name": "Douala"
        }
      }
    }
  ]
}
```

### **GET /api/v1/bins/:id**
Détails d'un bac

### **POST /api/v1/bins**
Créer un bac (Admin/Supervisor)

**Request Body:**
```json
{
  "refCode": "BAC-001",
  "latitude": 4.0483,
  "longitude": 9.7043,
  "capacityM3": 1.5,
  "binType": "ORGANIC",
  "neighborhoodId": "uuid"
}
```

---

## 📝 **Module Signalements**

### **GET /api/v1/reports**
Lister les signalements

**Query Parameters:**
- `page` (optional): Numéro de page (default: 1)
- `limit` (optional): Nombre par page (default: 10)
- `status` (optional): Filtrer par statut
- `reportType` (optional): Filtrer par type
- `priority` (optional): Filtrer par priorité

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "referenceCode": "REP-2024-001",
        "description": "Bac plein",
        "reportType": "FULL",
        "priority": "HIGH",
        "status": "PENDING",
        "photoUrl": "/uploads/compressed/1704123456789-image.webp",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "user": {
          "firstName": "Jean",
          "lastName": "Dupont"
        },
        "bac": {
          "refCode": "BAC-001",
          "location": {
            "coordinates": [9.7043, 4.0483]
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### **POST /api/v1/reports**
Créer un signalement

**Headers:** 
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
bacId: uuid
reportType: FULL
description: Le bac est complètement plein
priority: HIGH
photo: [file]
```

**Response (201):**
```json
{
  "success": true,
  "message": "Signalement créé avec succès",
  "data": {
    "id": "uuid",
    "referenceCode": "REP-2024-001",
    "photoUrl": "/uploads/compressed/1704123456789-image.webp"
  }
}
```

### **GET /api/v1/reports/:id**
Détails d'un signalement

### **PATCH /api/v1/reports/:id/status**
Mettre à jour le statut (Admin/Agent)

**Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

### **DELETE /api/v1/reports/:id**
Supprimer un signalement

---

## 🔧 **Module Interventions**

### **GET /api/v1/interventions**
Lister les interventions

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "IN_PROGRESS",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "agent": {
        "firstName": "Agent",
        "lastName": "Smith"
      },
      "report": {
        "referenceCode": "REP-2024-001",
        "description": "Bac plein"
      }
    }
  ]
}
```

### **POST /api/v1/interventions**
Créer une intervention (Supervisor/Admin)

**Request Body:**
```json
{
  "reportId": "uuid",
  "agentId": "uuid"
}
```

### **PATCH /api/v1/interventions/:id/status**
Mettre à jour le statut

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

### **GET /api/v1/interventions/my-interventions**
Mes interventions (Agent)

---

## 🔔 **Module Notifications**

### **GET /api/v1/notifications**
Lister les notifications

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `unreadOnly` (boolean): Uniquement les non lues

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "REPORT_RECEIVED",
      "title": "Nouveau signalement",
      "body": "Votre signalement REP-2024-001 a été créé",
      "isRead": false,
      "sentAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### **GET /api/v1/notifications/unread-count**
Nombre de notifications non lues

### **PATCH /api/v1/notifications/:id/read**
Marquer comme lue

### **PATCH /api/v1/notifications/mark-all-read**
Tout marquer comme lu

### **DELETE /api/v1/notifications/:id**
Supprimer une notification

---

## 📍 **Module Géolocalisation**

### **GET /api/v1/geo/bins**
Bacs au format GeoJSON

**Response (200):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "uuid",
        "refCode": "BAC-001",
        "status": "ACTIVE",
        "reportsCount": 5
      },
      "geometry": {
        "type": "Point",
        "coordinates": [9.7043, 4.0483]
      }
    }
  ]
}
```

### **GET /api/v1/geo/neighborhoods**
Quartiers au format GeoJSON

---

## 📊 **Module Statistiques**

### **GET /api/v1/reports/stats**
Statistiques des signalements

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "PENDING": 45,
      "IN_PROGRESS": 30,
      "COMPLETED": 75
    },
    "byPriority": {
      "LOW": 60,
      "MEDIUM": 50,
      "HIGH": 40
    },
    "thisMonth": 25
  }
}
```

### **GET /api/v1/interventions/stats**
Statistiques des interventions

---

## 🚨 **Codes d'Erreur**

### **400 - Bad Request**
```json
{
  "success": false,
  "message": "Données invalides",
  "error": "Validation failed"
}
```

### **401 - Unauthorized**
```json
{
  "success": false,
  "message": "Non authentifié",
  "error": "Invalid token"
}
```

### **403 - Forbidden**
```json
{
  "success": false,
  "message": "Accès refusé",
  "error": "Insufficient permissions"
}
```

### **404 - Not Found**
```json
{
  "success": false,
  "message": "Ressource non trouvée"
}
```

### **500 - Internal Server Error**
```json
{
  "success": false,
  "message": "Erreur interne du serveur",
  "error": "Database connection failed"
}
```

---

## 🔄 **Webhooks & Événements**

### **Événements de notification**
Le système émet automatiquement des notifications pour :

- `REPORT_CREATED` : Création de signalement
- `REPORT_ASSIGNED` : Assignation d'intervention
- `REPORT_STATUS_CHANGED` : Changement de statut
- `INTERVENTION_STARTED` : Début d'intervention
- `INTERVENTION_COMPLETED` : Fin d'intervention
- `USER_PROFILE_UPDATED` : Mise à jour de profil

---

## 📱 **Exemple d'intégration**

### **JavaScript/React**
```javascript
// Configuration API
const API_BASE = 'https://api.cleaner.cm/api/v1';

// Authentification
const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrPhone: email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.data.accessToken);
  }
  return data;
};

// Créer un signalement
const createReport = async (formData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  return await response.json();
};
```

### **Flutter/Dart**
```dart
// Configuration API
const String API_BASE = 'https://api.cleaner.cm/api/v1';

// Authentification
Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('$API_BASE/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'emailOrPhone': email,
      'password': password,
    }),
  );
  
  final data = jsonDecode(response.body);
  if (data['success']) {
    await storage.write(key: 'token', value: data['data']['accessToken']);
  }
  return data;
}
```

---

## 📋 **Checklist Développement**

### **✅ Authentification**
- [ ] Inscription/Login
- [ ] Refresh token
- [ ] OTP verification
- [ ] Logout

### **✅ Signalements**
- [ ] Création avec photo
- [ ] Liste paginée
- [ ] Filtres (statut, priorité)
- [ ] Mise à jour statut

### **✅ Interventions**
- [ ] Création
- [ ] Assignation
- [ ] Suivi statut
- [ ] Statistiques

### **✅ Notifications**
- [ ] Liste temps réel
- [ ] Marquer lu/non lu
- [ ] Push notifications

### **✅ Géolocalisation**
- [ ] Carte des bacs
- [ ] GeoJSON
- [ ] Filtrage par zone

---

**📞 Support Technique**
- Email: api-support@cleaner.cm
- Documentation: https://docs.cleaner.cm
- Statut API: https://status.cleaner.cm
