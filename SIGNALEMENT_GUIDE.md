# 📋 **Champs requis pour signaler un bac**

## 🎯 **Champ OBLIGATOIRE**

### **1. bacId** (UUID)
- **Description**: ID du bac signalé
- **Type**: UUID
- **Exemple**: `"550e8400-e29b-41d4-a716-446655440000"`
- **Validation**: Requis et doit exister dans la base

## 🔧 **Champs OPTIONNELS**

### **2. reportType** (Enum)
- **Description**: Type de signalement
- **Type**: Enum
- **Valeurs possibles**:
  - `"PLEIN"` (bac plein)
  - `"ENDOMMAGE"` (bac endommagé)
  - `"MANQUANT"` (bac manquant)
  - `"DEGRADATION"` (dégradation autour)
  - `"AUTRE"` (autre problème)
- **Défaut**: `"PLEIN"`

### **3. description** (String)
- **Description**: Description détaillée du problème
- **Type**: String
- **Longueur max**: 1000 caractères
- **Exemple**: `"Le bac déborde depuis 2 jours, il y a des déchets autour"`

### **4. photo** (File)
- **Description**: Photo du problème
- **Type**: Fichier image
- **Format**: multipart/form-data
- **Traitement**: Redimensionnée automatiquement
- **Exemple**: `test-image.jpg`

### **5. priority** (Enum)
- **Description**: Priorité du signalement
- **Type**: Enum
- **Valeurs possibles**:
  - `"LOW"` (basse)
  - `"MEDIUM"` (moyenne)
  - `"HIGH"` (haute)
  - `"URGENT"` (urgente)
- **Défaut**: `"MEDIUM"`

### **6. locationUser** (String JSON)
- **Description**: Emplacement de la personne qui signale
- **Type**: String (format JSON)
- **Exemple**: `'{"lat": 4.0583, "lng": 9.7043}'`

---

## 📝 **Exemples d'utilisation**

### **🔥 Signalement MINIMAL (recommandé)**
```json
{
  "bacId": "550e8400-e29b-41d4-a716-446655440000",
  "reportType": "PLEIN"
}
```

### **📸 Signalement COMPLET**
```json
{
  "bacId": "550e8400-e29b-41d4-a716-446655440000",
  "reportType": "PLEIN",
  "description": "Le bac est complètement plein et déborde depuis 2 jours",
  "priority": "HIGH"
}
```
+ Photo (fichier joint)

### **📱 Requête HTTP complète**
```http
POST /api/v1/reports
Content-Type: multipart/form-data
Authorization: Bearer VOTRE_TOKEN

------WebKitFormBoundary
Content-Disposition: form-data; name="bacId"
550e8400-e29b-41d4-a716-446655440000
------WebKitFormBoundary
Content-Disposition: form-data; name="reportType"
PLEIN
------WebKitFormBoundary
Content-Disposition: form-data; name="description"
Le bac déborde depuis 2 jours
------WebKitFormBoundary
Content-Disposition: form-data; name="priority"
HIGH
------WebKitFormBoundary
Content-Disposition: form-data; name="photo"; filename="photo.jpg"
Content-Type: image/jpeg
[données de l'image]
------WebKitFormBoundary--
```

---

## ⚠️ **Points importants**

1. **bacId est OBLIGATOIRE** et doit être un UUID valide
2. **L'utilisateur doit être authentifié** (token JWT requis)
3. **La photo est optionnelle** mais recommandée
4. **Le bac doit exister** dans la base de données
5. **L'utilisateur doit avoir le rôle** CITIZEN, AGENT, SUPERVISOR ou ADMIN

---

## 🎯 **Résumé**

| Champ | Requis | Type | Description |
|--------|---------|-------|-------------|
| `bacId` | ✅ OUI | UUID du bac |
| `reportType` | ❌ Non | Type de problème |
| `description` | ❌ Non | Description textuelle |
| `photo` | ❌ Non | Fichier image |
| `priority` | ❌ Non | Niveau d'urgence |
| `locationUser` | ❌ Non | Position GPS |

**Seul `bacId` est obligatoire pour signaler un bac !** 🎯
