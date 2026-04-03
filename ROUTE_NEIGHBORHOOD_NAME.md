# 🎯 **Route pour trouver les bacs par nom de quartier**

## 📍 **Nouvelle route ajoutée**

### **Route principale**
```
GET /api/v1/bins/neighborhood-name/:neighborhoodName
```

---

## 🔧 **Implémentation**

### **1. Méthode dans le service (BinsService)**
```typescript
async findByNeighborhoodName(neighborhoodName: string) {
  // Vérifier si le quartier existe par nom (insensitive)
  const neighborhood = await this.prisma.neighborhood.findFirst({
    where: {
      name: {
        equals: neighborhoodName,
        mode: 'insensitive'  // Recherche insensible à la casse
      }
    },
    include: { city: true }
  });

  if (!neighborhood) {
    throw new NotFoundException('Quartier non trouvé');
  }

  // Récupérer tous les bacs du quartier
  const bins = await this.prisma.bin.findMany({
    where: { neighborhoodId: neighborhood.id },
    include: {
      neighborhood: { include: { city: true } },
      reports: { /* 3 derniers rapports */ },
      _count: { select: { reports: true } }
    }
  });

  // Extraire les coordonnées GPS
  return bins.map(bin => ({
    ...bin,
    latitude: coordinates?.latitude || null,
    longitude: coordinates?.longitude || null
  }));
}
```

### **2. Route dans le contrôleur (BinsController)**
```typescript
@Get('neighborhood-name/:neighborhoodName')
@Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
@ApiParam({ name: 'neighborhoodName', description: 'Nom du quartier' })
@ApiOperation({ summary: 'Récupérer les bacs d\'un quartier par son nom' })
@ApiResponse({ status: 200, description: 'Bacs du quartier récupérés avec succès' })
@ApiResponse({ status: 404, description: 'Quartier non trouvé' })
async findByNeighborhoodName(@Param('neighborhoodName') neighborhoodName: string) {
  return this.binsService.findByNeighborhoodName(neighborhoodName);
}
```

---

## 📋 **Utilisation**

### **Exemple 1 : Recherche simple**
```http
GET /api/v1/bins/neighborhood-name/Bonaberi
Authorization: Bearer votre_token
```

### **Exemple 2 : Recherche avec casse différente**
```http
GET /api/v1/bins/neighborhood-name/bonaberi
Authorization: Bearer votre_token
```

### **Exemple 3 : Quartier inexistant**
```http
GET /api/v1/bins/neighborhood-name/QuartierInexistant
Authorization: Bearer votre_token
# Retourne 404 - Quartier non trouvé
```

---

## 📊 **Réponse attendue**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "refCode": "BAC-001",
    "binType": "MENAGER",
    "status": "ACTIVE",
    "statusReport": "NORMAL",
    "capacityM3": 2.5,
    "latitude": 4.0483,
    "longitude": 9.7043,
    "neighborhoodId": "e487b5cc-1df4-4650-a1f7-a799859be221",
    "neighborhood": {
      "id": "e487b5cc-1df4-4650-a1f7-a799859be221",
      "name": "Bonaberi",
      "city": {
        "id": "uuid-ville-douala",
        "name": "Douala",
        "region": "LITTORAL"
      }
    },
    "reports": [...],
    "_count": { "reports": 5 }
  }
]
```

---

## ✅ **Avantages**

### **🔍 Recherche insensible à la casse**
- `"Bonaberi"` = `"bonaberi"` = `"BONABERI"`

### **📝 Gestion d'erreur**
- `404` si quartier non trouvé
- Message clair : `"Quartier non trouvé"`

### **📍 Données complètes**
- Coordonnées GPS extraites
- Relations complètes (quartier + ville)
- 3 derniers rapports
- Nombre total de rapports

---

## 🧪 **Tests créés**

Fichier `bins-neighborhood-name-test.http` avec 6 scénarios :

1. **Recherche "Bonaberi"** ✅
2. **Recherche "Akwa"** ✅  
3. **Recherche "Makepe"** ✅
4. **Quartier inexistant** (404) ✅
5. **Casse différente** (insensitive) ✅
6. **Comparaison avec route par ID** ✅

---

## 🎯 **Résumé**

| Route | Méthode | Paramètre | Usage |
|-------|----------|------------|-------|
| `/bins/neighborhood/:id` | GET | UUID | Recherche par ID |
| `/bins/neighborhood-name/:name` | GET | **Nom** | **Recherche par nom** |

**La nouvelle route est prête !** 🎯

Vous pouvez maintenant trouver les bacs d'un quartier en utilisant simplement le nom du quartier.
