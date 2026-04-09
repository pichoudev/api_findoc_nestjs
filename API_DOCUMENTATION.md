# 📚 Documentation API - Module Users

Cette documentation décrit toutes les routes disponibles pour la gestion des utilisateurs dans l'API Cleaner.

## 🔐 **Authentification**

Toutes les routes (sauf indication contraire) nécessitent une authentification via le header `Authorization: Bearer <token>`.

## 📋 **Rôles et Permissions**

| Rôle | Permissions |
|------|--------------|
| **ADMIN** | Accès complet à toutes les routes |
| **SUPERVISOR** | Gestion des utilisateurs, stats, activation/désactivation |
| **AGENT** | Lecture des utilisateurs, recherche |
| **CITIZEN** | Mise à jour de son propre profil uniquement |

---

## 🛣️ **Routes Disponibles**

### 1. **Créer un utilisateur**
```http
POST /api/v1/users
```

**Permissions :** ADMIN, SUPERVISOR

**Corps de la requête :**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+237612345678",
  "password": "password123",
  "role": "CITIZEN",
  "neighborhoodId": "uuid-quartier",
  "neighborhood": "Bonaberi"
}
```

**Réponse (201) :**
```json
{
  "id": "uuid-utilisateur",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+237612345678",
  "role": "CITIZEN",
  "isActive": true,
  "isVerified": false,
  "neighborhoodId": "uuid-quartier",
  "neighborhoodRelation": {
    "id": "uuid-quartier",
    "name": "Bonaberi",
    "city": {
      "id": "uuid-ville",
      "name": "Douala",
      "region": "LITTORAL"
    }
  },
  "createdAt": "2026-04-03T05:27:00.000Z",
  "updatedAt": "2026-04-03T05:27:00.000Z"
}
```

---

### 2. **Lister tous les utilisateurs**
```http
GET /api/v1/users
```

**Permissions :** ADMIN, SUPERVISOR, AGENT

**Paramètres de requête :**
- `page` (optionnel) : Numéro de page (défaut: 1)
- `limit` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `role` (optionnel) : Filtrer par rôle (ADMIN, SUPERVISOR, AGENT, CITIZEN)
- `isActive` (optionnel) : Filtrer par statut actif (true/false)
- `isVerified` (optionnel) : Filtrer par statut vérifié (true/false)
- `neighborhoodId` (optionnel) : Filtrer par quartier
- `search` (optionnel) : Rechercher par nom ou email

**Réponse (200) :**
```json
{
  "data": [
    {
      "id": "uuid-utilisateur-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+237612345678",
      "role": "CITIZEN",
      "isActive": true,
      "isVerified": true,
      "neighborhoodId": "uuid-quartier",
      "neighborhoodRelation": {
        "id": "uuid-quartier",
        "name": "Bonaberi",
        "city": {
          "id": "uuid-ville",
          "name": "Douala",
          "region": "LITTORAL"
        }
      },
      "createdAt": "2026-04-03T05:27:00.000Z",
      "updatedAt": "2026-04-03T05:27:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. **Statistiques des utilisateurs**
```http
GET /api/v1/users/stats
```

**Permissions :** ADMIN, SUPERVISOR

**Réponse (200) :**
```json
{
  "totalUsers": 150,
  "activeUsers": 120,
  "verifiedUsers": 95,
  "usersByRole": {
    "ADMIN": 5,
    "SUPERVISOR": 15,
    "AGENT": 30,
    "CITIZEN": 100
  },
  "recentRegistrations": 12,
  "inactiveUsers": 30
}
```

---

### 4. **Rechercher des utilisateurs**
```http
GET /api/v1/users/search?name=john
```

**Permissions :** ADMIN, SUPERVISOR, AGENT

**Paramètres de requête :**
- `name` (requis) : Terme de recherche (nom ou email)
- `page` (optionnel) : Numéro de page
- `limit` (optionnel) : Nombre d'éléments par page

---

### 5. **Profil de l'utilisateur connecté**
```http
GET /api/v1/users/profile
```

**Permissions :** Tous les rôles (utilisateur connecté)

**Réponse (200) :**
```json
{
  "id": "uuid-utilisateur",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+237612345678",
  "role": "CITIZEN",
  "isActive": true,
  "isVerified": true,
  "neighborhoodId": "uuid-quartier",
  "neighborhoodRelation": {
    "id": "uuid-quartier",
    "name": "Bonaberi",
    "city": {
      "id": "uuid-ville",
      "name": "Douala",
      "region": "LITTORAL"
    }
  },
  "createdAt": "2026-04-03T05:27:00.000Z",
  "updatedAt": "2026-04-03T05:27:00.000Z"
}
```

---

### 6. **Mettre à jour le profil**
```http
PATCH /api/v1/users/profile
```

**Permissions :** Tous les rôles (utilisateur connecté)

**Corps de la requête :**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+237698765432",
  "neighborhoodId": "uuid-nouveau-quartier",
  "neighborhood": "Akwa"
}
```

**Note :** Vous pouvez utiliser soit `neighborhoodId` (UUID) soit `neighborhood` (nom du quartier).

---

### 7. **Détails d'un utilisateur**
```http
GET /api/v1/users/:id
```

**Permissions :** ADMIN, SUPERVISOR, AGENT

**Paramètres :**
- `id` (requis) : UUID de l'utilisateur

---

### 8. **Mettre à jour un utilisateur**
```http
PATCH /api/v1/users/:id
```

**Permissions :** ADMIN, SUPERVISOR, CITIZEN (pour son propre profil)

**Paramètres :**
- `id` (requis) : UUID de l'utilisateur

---

### 9. **Mettre à jour le mot de passe**
```http
PATCH /api/v1/users/:id/password
```

**Permissions :** Tous les rôles (pour son propre mot de passe)

**Corps de la requête :**
```json
{
  "oldPassword": "ancienMotDePasse123",
  "newPassword": "nouveauMotDePasse123"
}
```

---

### 10. **Mettre à jour le rôle**
```http
PATCH /api/v1/users/:id/role
```

**Permissions :** ADMIN

**Corps de la requête :**
```json
{
  "role": "AGENT"
}
```

---

### 11. **Activer un utilisateur**
```http
PATCH /api/v1/users/:id/activate
```

**Permissions :** ADMIN, SUPERVISOR

---

### 12. **Désactiver un utilisateur**
```http
PATCH /api/v1/users/:id/deactivate
```

**Permissions :** ADMIN, SUPERVISOR

---

### 13. **Supprimer un utilisateur**
```http
DELETE /api/v1/users/:id
```

**Permissions :** ADMIN

---

## ⚠️ **Codes d'erreur**

| Code | Description | Exemple |
|------|-------------|----------|
| **400** | Données invalides | `{"message": "Le quartier spécifié n'existe pas", "error": "Bad Request", "statusCode": 400}` |
| **401** | Non authentifié | `{"message": "Utilisateur non authentifié", "error": "Unauthorized", "statusCode": 401}` |
| **404** | Non trouvé | `{"message": "Utilisateur non trouvé", "error": "Not Found", "statusCode": 404}` |
| **409** | Conflit | `{"message": "Cet email est déjà utilisé", "error": "Conflict", "statusCode": 409}` |

---

## 📝 **Notes importantes**

1. **Gestion du quartier :** Les routes acceptent soit l'UUID du quartier (`neighborhoodId`) soit le nom du quartier (`neighborhood`). La recherche par nom est insensible à la casse.

2. **Hashage du mot de passe :** Tous les mots de passe sont automatiquement hashés avec bcrypt (10 rounds).

3. **Pagination :** Les routes de liste utilisent une pagination basée sur `page` et `limit`.

4. **Relations :** Les réponses incluent les relations `neighborhoodRelation` et `city` lorsque disponibles.

5. **Sécurité :** Les mots de passe ne sont jamais retournés dans les réponses API.

---

## 🌐 **Accès Swagger**

La documentation interactive est disponible à l'adresse :
```
http://localhost:3000/api
```

Vous pouvez tester toutes les routes directement depuis l'interface Swagger.
