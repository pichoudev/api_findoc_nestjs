# 📚 Documentation API Complète - Cleaner Backend

Cette documentation décrit **toutes les routes** disponibles dans l'API Cleaner Backend avec leurs paramètres, permissions et exemples.

---

## 🔐 **Authentification**

### **Base URL**
```
http://localhost:3000/api/v1
```

### **Header d'authentification**
```
Authorization: Bearer <token_jwt>
```

### **Rôles et Permissions**
| Rôle | Permissions | Description |
|------|-------------|-------------|
| **ADMIN** | Accès complet à toutes les routes | Administrateur système |
| **SUPERVISOR** | Gestion des utilisateurs, bacs, signalements, interventions | Superviseur d'équipe |
| **AGENT** | Gestion des signalements, interventions, consultation | Agent de terrain |
| **CITIZEN** | Signalement, consultation de son profil | Citoyen ordinaire |

---

## 🛣️ **Routes par Module**

### 📱 **Module Authentification** (`/auth`)
*Routes publiques (pas d'authentification requise)*

#### 1. **Connexion**
```http
POST /auth/login
```
**Permissions :** Public  
**Corps :**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Réponse (200) :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-utilisateur",
    "email": "user@example.com",
    "role": "CITIZEN"
  }
}
```

#### 2. **Inscription**
```http
POST /auth/register
```
**Permissions :** Public  
**Corps :**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "phone": "+237612345678",
  "password": "password123",
  "role": "CITIZEN",
  "neighborhoodId": "uuid-quartier"
}
```

#### 3. **Rafraîchir le token**
```http
POST /auth/refresh
```
**Permissions :** Public  
**Corps :**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 4. **Déconnexion**
```http
POST /auth/logout
```
**Permissions :** Authentifié  
**Corps :**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 5. **Profil utilisateur**
```http
GET /auth/me
```
**Permissions :** Authentifié

#### 6. **Authentification Google**
```http
GET /auth/google
GET /auth/google/callback
```
**Permissions :** Public

#### 7. **Envoyer OTP**
```http
POST /auth/send-otp
```
**Permissions :** Public  
**Corps :**
```json
{
  "emailOrPhone": "user@example.com",
  "purpose": "ACCOUNT_VERIFICATION"
}
```

#### 8. **Vérifier OTP**
```http
POST /auth/verify-otp
```
**Permissions :** Public  
**Corps :**
```json
{
  "emailOrPhone": "user@example.com",
  "code": "123456",
  "purpose": "ACCOUNT_VERIFICATION"
}
```

#### 9. **Demander réinitialisation mot de passe**
```http
POST /auth/request-password-reset
```
**Permissions :** Public  
**Corps :**
```json
{
  "emailOrPhone": "user@example.com"
}
```

#### 10. **Réinitialiser mot de passe**
```http
POST /auth/reset-password
```
**Permissions :** Public  
**Corps :**
```json
{
  "emailOrPhone": "user@example.com",
  "code": "123456",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

---

### 👥 **Module Utilisateurs** (`/users`)
*Documentation détaillée dans `API_DOCUMENTATION.md`*

#### Routes principales :
- `POST /users` - Créer un utilisateur (ADMIN, SUPERVISOR)
- `GET /users` - Lister avec pagination/filtres (ADMIN, SUPERVISOR, AGENT)
- `GET /users/profile` - Profil connecté (Tous les rôles)
- `PATCH /users/profile` - Mettre à jour profil (Tous les rôles)
- `GET /users/:id` - Détails utilisateur (ADMIN, SUPERVISOR, AGENT)
- `PATCH /users/:id` - Mettre à jour utilisateur (ADMIN, SUPERVISOR, CITIZEN)
- `PATCH /users/:id/password` - Mettre à jour mot de passe (Tous les rôles)
- `PATCH /users/:id/role` - Mettre à jour rôle (ADMIN)
- `PATCH /users/:id/activate` - Activer utilisateur (ADMIN, SUPERVISOR)
- `PATCH /users/:id/deactivate` - Désactiver utilisateur (ADMIN, SUPERVISOR)
- `DELETE /users/:id` - Supprimer utilisateur (ADMIN)
- `GET /users/stats` - Statistiques (ADMIN, SUPERVISOR)
- `GET /users/search` - Rechercher utilisateurs (ADMIN, SUPERVISOR, AGENT)

---

### 🗑️ **Module Bacs** (`/bins`)

#### 1. **Créer un bac**
```http
POST /bins
```
**Permissions :** ADMIN, SUPERVISOR, AGENT  
**Corps :**
```json
{
  "refCode": "BAC-001",
  "binType": "PLASTIC",
  "capacityM3": 2.5,
  "localisation": "POINT(9.733 4.055)",
  "neighborhoodId": "uuid-quartier"
}
```

#### 2. **Lister tous les bacs**
```http
GET /bins
```
**Permissions :** Tous les rôles  
**Paramètres :**
- `page`, `limit` : Pagination
- `binType`, `status`, `statusReport` : Filtres
- `neighborhoodId` : Filtre par quartier
- `search` : Recherche par code

#### 3. **Rechercher des bacs**
```http
GET /bins/search?name=BAC-001
```
**Permissions :** Tous les rôles

#### 4. **Statistiques des bacs**
```http
GET /bins/stats
```
**Permissions :** ADMIN, SUPERVISOR, AGENT

#### 5. **Bacs pleins**
```http
GET /bins/full
```
**Permissions :** ADMIN, SUPERVISOR, AGENT

#### 6. **Bacs par quartier**
```http
GET /bins/neighborhood/:neighborhoodId
```
**Permissions :** Tous les rôles

#### 7. **Détails d'un bac**
```http
GET /bins/:id
```
**Permissions :** Tous les rôles

#### 8. **Mettre à jour un bac**
```http
PATCH /bins/:id
```
**Permissions :** ADMIN, SUPERVISOR, AGENT

#### 9. **Mettre à jour statut bac**
```http
PATCH /bins/:id/status
```
**Permissions :** ADMIN, SUPERVISOR, AGENT  
**Corps :**
```json
{
  "status": "FULL"
}
```

#### 10. **Supprimer un bac**
```http
DELETE /bins/:id
```
**Permissions :** ADMIN, SUPERVISOR

---

### 📢 **Module Signalements** (`/reports`)

#### 1. **Créer un signalement**
```http
POST /reports
```
**Permissions :** Tous les rôles  
**Corps (multipart/form-data) :**
```
photo: [fichier image]
reportData: {
  "bacId": "uuid-bac",
  "type": "FULL",
  "description": "Le bac est plein",
  "severity": "HIGH"
}
```

#### 2. **Lister tous les signalements**
```http
GET /reports
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 3. **Mes signalements**
```http
GET /reports/my-reports
```
**Permissions :** Tous les rôles

#### 4. **Signalements par bac**
```http
GET /reports/bin/:bacId
```
**Permissions :** Tous les rôles

#### 5. **Signalements d'un citoyen**
```http
GET /reports/citizen/:userId
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 6. **Détails d'un signalement**
```http
GET /reports/:id
```
**Permissions :** Tous les rôles

#### 7. **Mettre à jour un signalement**
```http
PATCH /reports/:id
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 8. **Mettre à jour statut signalement**
```http
PATCH /reports/:id/status
```
**Permissions :** AGENT, SUPERVISOR, ADMIN  
**Corps :**
```json
{
  "status": "ASSIGNED"
}
```

#### 9. **Supprimer un signalement**
```http
DELETE /reports/:id
```
**Permissions :** SUPERVISOR, ADMIN

#### 10. **Synchroniser statut bac**
```http
POST /reports/sync/:bacId
POST /reports/sync-all
```
**Permissions :** SUPERVISOR, ADMIN

---

### 🔧 **Module Interventions** (`/interventions`)

#### 1. **Créer une intervention**
```http
POST /interventions
```
**Permissions :** SUPERVISOR, ADMIN  
**Corps :**
```json
{
  "reportId": "uuid-report",
  "agentId": "uuid-agent",
  "description": "Intervention en cours",
  "estimatedDuration": 30
}
```

#### 2. **Lister toutes les interventions**
```http
GET /interventions
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 3. **Mes interventions**
```http
GET /interventions/my-interventions
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 4. **Interventions par signalement**
```http
GET /interventions/report/:reportId
```
**Permissions :** AGENT, SUPERVISOR, ADMIN

#### 5. **Assigner une intervention**
```http
POST /interventions/report/:reportId/assign
```
**Permissions :** SUPERVISOR, ADMIN  
**Corps :**
```json
{
  "agentId": "uuid-agent",
  "priority": "HIGH"
}
```

#### 6. **Mettre à jour statut intervention**
```http
PATCH /interventions/:id/status
```
**Permissions :** AGENT, SUPERVISOR, ADMIN  
**Corps :**
```json
{
  "status": "RESOLVED",
  "comment": "Bac vidé avec succès"
}
```

---

### 🏘️ **Module Quartiers** (`/neighborhoods`)

#### 1. **Créer un quartier**
```http
POST /neighborhoods
```
**Permissions :** ADMIN, SUPERVISOR

#### 2. **Lister tous les quartiers**
```http
GET /neighborhoods
```
**Permissions :** Tous les rôles

#### 3. **Quartiers par ville**
```http
GET /neighborhoods/city/:cityId
```
**Permissions :** Tous les rôles

#### 4. **Rechercher des quartiers**
```http
GET /neighborhoods/search?name=Bonaberi
```
**Permissions :** Tous les rôles

#### 5. **Mettre à jour un quartier**
```http
PATCH /neighborhoods/:id
```
**Permissions :** ADMIN, SUPERVISOR

#### 6. **Activer/Désactiver un quartier**
```http
PATCH /neighborhoods/:id/activate
PATCH /neighborhoods/:id/deactivate
```
**Permissions :** ADMIN, SUPERVISOR

---

### 🏙️ **Module Villes** (`/cities`)

#### 1. **Créer une ville**
```http
POST /cities
```
**Permissions :** ADMIN, SUPERVISOR

#### 2. **Lister toutes les villes**
```http
GET /cities
```
**Permissions :** Tous les rôles

#### 3. **Rechercher des villes**
```http
GET /cities/search?name=Douala
```
**Permissions :** Tous les rôles

#### 4. **Mettre à jour une ville**
```http
PATCH /cities/:id
```
**Permissions :** ADMIN, SUPERVISOR

---

### 🗺️ **Module Géographie** (`/geo`)

#### 1. **GeoJSON des bacs**
```http
GET /geo/bins
```
**Permissions :** Tous les rôles  
**Description :** Retourne tous les bacs avec coordonnées au format GeoJSON pour visualisation sur geojson.io

#### 2. **GeoJSON des quartiers**
```http
GET /geo/neighborhoods
```
**Permissions :** Tous les rôles

#### 3. **GeoJSON complet**
```http
GET /geo/all
```
**Permissions :** Tous les rôles  
**Description :** Bacs + quartiers au format GeoJSON

---

### 🔔 **Module Notifications** (`/notifications`)

#### 1. **Lister mes notifications**
```http
GET /notifications
```
**Permissions :** Tous les rôles  
**Paramètres :**
- `unreadOnly` : Filtrer non lues seulement
- `limit`, `offset` : Pagination

#### 2. **Nombre de notifications non lues**
```http
GET /notifications/unread-count
```
**Permissions :** Tous les rôles

#### 3. **Marquer comme lue**
```http
PATCH /notifications/:id/read
```
**Permissions :** Tous les rôles

#### 4. **Marquer toutes comme lues**
```http
PATCH /notifications/mark-all-read
```
**Permissions :** Tous les rôles

#### 5. **Supprimer une notification**
```http
DELETE /notifications/:id
```
**Permissions :** Tous les rôles

#### 6. **Tester notification**
```http
POST /notifications/test
```
**Permissions :** ADMIN

---

### 📊 **Module Audit** (`/audit`)

#### 1. **Lister les logs d'audit**
```http
GET /audit
```
**Permissions :** ADMIN, SUPERVISOR  
**Paramètres :**
- `page`, `limit` : Pagination
- `userId`, `action`, `status`, `resource` : Filtres
- `startDate`, `endDate` : Filtre temporel

#### 2. **Statistiques d'audit**
```http
GET /audit/stats
```
**Permissions :** ADMIN, SUPERVISOR

---

### 🏠 **Module Application** (`/`)

#### 1. **Health check**
```http
GET /
```
**Permissions :** Public  
**Réponse :**
```json
{
  "message": "Hello World!"
}
```

---

## ⚠️ **Codes d'erreur standards**

| Code | Description | Exemple |
|------|-------------|----------|
| **200** | Succès | Opération réussie |
| **201** | Créé | Ressource créée avec succès |
| **400** | Requête invalide | `{"message": "Données invalides", "statusCode": 400}` |
| **401** | Non authentifié | `{"message": "Utilisateur non authentifié", "statusCode": 401}` |
| **403** | Accès refusé | `{"message": "Permissions insuffisantes", "statusCode": 403}` |
| **404** | Non trouvé | `{"message": "Ressource non trouvée", "statusCode": 404}` |
| **409** | Conflit | `{"message": "Ressource déjà existante", "statusCode": 409}` |
| **500** | Erreur serveur | `{"message": "Erreur interne du serveur", "statusCode": 500}` |

---

## 🔧 **Notes importantes**

### **Gestion des coordonnées géographiques**
- Les bacs utilisent le format PostGIS `GEOGRAPHY`
- Les routes `/geo/*` retournent du GeoJSON pour geojson.io
- Coordonnées disponibles : `latitude` et `longitude` dans les réponses

### **Upload de fichiers**
- Les signalements acceptent les photos (multipart/form-data)
- Les images sont automatiquement redimensionnées avec Sharp
- Formats supportés : JPEG, PNG, WebP

### **Pagination**
- Standard : `page` (défaut: 1) et `limit` (défaut: 10)
- Réponse inclut : `data[]`, `meta.total`, `meta.page`, `meta.totalPages`

### **Recherche**
- Recherche textuelle insensible à la casse
- Disponible sur : users, bins, reports, neighborhoods, cities

### **Notifications**
- Créées automatiquement pour les événements système
- Types : REPORT_CREATED, REPORT_ASSIGNED, USER_PASSWORD_RESET, etc.
- Support FCM pour notifications push

---

## 🌐 **Accès Swagger**

Documentation interactive disponible :
```
http://localhost:3000/api
```

**Features Swagger :**
- 📖 Documentation interactive de toutes les routes
- 🧪 Test direct des endpoints
- 📝 Exemples de requêtes/réponses
- 🔐 Gestion de l'authentification
- 📱 Téléchargement de collection Postman

---

## 📚 **Résumé des routes**

| Module | Routes | Permissions principales |
|--------|---------|---------------------|
| **Auth** | 10 routes | Public + Authentifié |
| **Users** | 13 routes | ADMIN/SUPERVISOR/AGENT/CITIZEN |
| **Bins** | 10 routes | Tous les rôles (lecture) |
| **Reports** | 12 routes | Tous les rôles (création) |
| **Interventions** | 9 routes | AGENT/SUPERVISOR/ADMIN |
| **Neighborhoods** | 10 routes | Tous les rôles (lecture) |
| **Cities** | 7 routes | Tous les rôles (lecture) |
| **Geo** | 3 routes | Tous les rôles |
| **Notifications** | 6 routes | Tous les rôles |
| **Audit** | 2 routes | ADMIN/SUPERVISOR |
| **App** | 1 route | Public |

**Total : 73 routes** couvrant tous les aspects de l'application Cleaner !
