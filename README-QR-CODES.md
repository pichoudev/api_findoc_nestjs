# 📱 QR Codes pour Bacs - Guide Complet

## 🎯 Objectif

Permettre aux administrateurs de générer, récupérer et imprimer les QR codes des bacs pour les coller sur les bacs physiques.

## 📋 Fonctionnalités Implémentées

### ✅ 1. Génération Automatique
- **À la création** : Chaque nouveau bac génère automatiquement son QR code
- **En lot** : Générer tous les QR codes existants
- **Unitaire** : Générer un QR code pour un bac spécifique

### ✅ 2. Stockage
- **Base de données** : QR code stocké en base64 (champ `qrCode`)
- **Fichiers** : Export en PNG pour impression
- **URL encodée** : `https://ton-app-frontend.com/bins/{id}`

### ✅ 3. API Endpoints
```
POST   /qr-codes/generate-all     # Générer tous les QR codes
POST   /qr-codes/generate/:id     # Générer un QR code spécifique  
GET    /qr-codes/stats           # Statistiques des QR codes
GET    /qr-codes/download/:file  # Télécharger un fichier
GET    /bins/:id/scan           # Scanner un QR code (public)
```

## 🚀 Utilisation

### Méthode 1: API REST

#### 1. Vérifier les statistiques
```bash
GET /qr-codes/stats
Authorization: Bearer ADMIN_TOKEN
```

#### 2. Générer tous les QR codes
```bash
POST /qr-codes/generate-all
{
  "outputDir": "./qr-codes"
}
```

#### 3. Générer un QR code spécifique
```bash
POST /qr-codes/generate/BIN_ID
{
  "outputDir": "./qr-codes"
}
```

### Méthode 2: Script Automatisé

#### Installation des dépendances
```bash
npm install axios
```

#### Configuration
```javascript
// Dans generate-qr-batch.js
const TOKEN = 'VOTRE_TOKEN_ADMIN';
const API_BASE_URL = 'http://localhost:3000';
```

#### Génération en lot
```bash
# Générer tous les QR codes
node generate-qr-batch.js all

# Voir les statistiques
node generate-qr-batch.js stats

# Générer un bac spécifique
node generate-qr-batch.js BIN_ID REF_CODE
```

## 🖨️ Guide d'Impression

### 1. Format Recommandé
- **Taille** : 3cm × 3cm minimum
- **Résolution** : 300 DPI minimum
- **Format** : PNG avec fond blanc

### 2. Matériaux
- **Autocollant** : Vinyle adhésif
- **Résistance** : Résistant à l'eau et UV
- **Durabilité** : 2-3 ans extérieur

### 3. Protection
- **Laminage** : Protection plastique
- **Plastification** : Encapsulation plastique
- **Location** : À l'abri de la pluie directe

### 4. Positionnement
- **Hauteur** : 1.2m - 1.5m du sol
- **Visibilité** : Face visible, pas d'obstacles
- **Angle** : Perpendiculaire au sol

## 📊 Workflow Complet

```
🏭 Création du bac
     ↓
🔄 Génération QR code automatique
     ↓
📱 Scan test → GET /bins/:id/scan
     ↓
🖨️ Impression du QR code
     ↓
🏷️  Collage sur le bac physique
     ↓
👤 Citoyen scanne avec son téléphone
     ↓
📲 Accès aux infos du bac
     ↓
📝 Signalement possible
```

## 🔧 Maintenance

### Régénération
```bash
# Pour les bacs sans QR code
POST /qr-codes/generate-all
```

### Mise à jour
```bash
# Si l'URL du frontend change
# Modifier la ligne 168 dans bins.service.ts
const qrUrl = `https://nouvelle-url.com/bins/${bin.id}`;
```

### Sauvegarde
```bash
# Backup des QR codes
tar -czf qr-codes-backup-$(date +%Y%m%d).tar.gz ./qr-codes/
```

## 📈 Monitoring

### Métriques à suivre
- **Taux de génération** : % de bacs avec QR code
- **Qualité des scans** : Tests réguliers
- **Usure des étiquettes** : Remplacement tous les 2 ans

### Alertes
- **QR codes manquants** : Bacs créés sans QR
- **Fichiers corrompus** : Vérification des exports
- **Espace disque** : Surveillance du répertoire

## 🛡️ Sécurité

### 1. Authentification
- **Endpoints admin** : Token JWT requis
- **Endpoint scan** : Public (pas d'auth)
- **Rôles** : ADMIN, SUPERVISOR, AGENT

### 2. Validation
- **Format du QR code** : Base64 valide
- **Taille des fichiers** : Max 1MB
- **Types autorisés** : PNG uniquement

## 🚨 Dépannage

### Problèmes Communs

#### QR code ne se génère pas
```bash
# Vérifier les logs
npm run start:dev | grep QR

# Vérifier la base de données
SELECT id, ref_code, qr_code IS NOT NULL FROM bins;
```

#### Fichier corrompu
```bash
# Régénérer un QR code spécifique
POST /qr-codes/generate/BIN_ID
```

#### Scan ne fonctionne pas
```bash
# Tester l'endpoint public
curl http://localhost:3000/bins/BIN_ID/scan

# Vérifier l'URL encodée
# Doit pointer vers votre frontend
```

## 📞 Support

Pour toute question ou problème :
1. Vérifier ce README
2. Consulter les logs de l'application
3. Tester avec les fichiers HTTP fournis

---
**Version** : 1.0.0  
**Mise à jour** : 21/04/2026  
**Auteur** : Système Cleaner App
