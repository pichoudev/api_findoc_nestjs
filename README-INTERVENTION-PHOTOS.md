# 📱 Gestion des Photos d'Interventions

## 🎯 Vue d'ensemble

Système complet pour gérer les photos des interventions en utilisant la même logique que les reports : **Sharp + Vercel Blob Storage** avec fallback en base64.

## 🔄 Flux de traitement

```
📱 App Mobile
     ↓ (1) Upload image
🌐 Backend NestJS
     ↓ (2) SharpPipe: traitement image
🖼️ Sharp Library
     ↓ (3) Compression WebP 800x800
☁️ Vercel Blob Storage
     ↓ (4) URL publique
📊 PostgreSQL
     ↓ (5) Sauvegarde URL
📱 App Mobile
```

## 🛠️ Architecture

### **1. Multer Configuration**
- **Memory Storage** : Buffer en mémoire pour traitement
- **File Filter** : Validation des types MIME
- **Size Limit** : 5MB max par fichier

### **2. SharpPipe**
- **Traitement** : Redimensionnement 800x800 max
- **Compression** : WebP qualité 75%
- **Stockage** : Vercel Blob (production) ou local
- **Fallback** : Base64 si Blob échoue

### **3. Contrôleur d'Upload**
- **Endpoints** : Upload, mise à jour, suppression
- **Validation** : UUID, permissions, formats
- **Logging** : Traçabilité complète

## 📊 Base de Données

### **Table Interventions**
```sql
ALTER TABLE interventions 
ADD COLUMN photo_url TEXT; -- URL de la photo (Vercel Blob ou base64)
```

## 🚀 Endpoints API

### **📸 Upload de Photos**

#### `POST /api/v1/interventions/:id/upload-photo`
```bash
curl -X POST http://localhost:3000/api/v1/interventions/123e4567-e89b-12d3-a456-426614174000/upload-photo \
  -H "Authorization: Bearer TOKEN" \
  -F "photo=@image.jpg" \
  -F "comment=Photo avant intervention"
```

**Réponse :**
```json
{
  "success": true,
  "message": "Photo uploadée avec succès",
  "data": {
    "interventionId": "123e4567-e89b-12d3-a456-426614174000",
    "photoUrl": "https://blob.vercel-storage.com/cleaner-app/intervention-2026-04-29-abc123.webp",
    "comment": "Photo avant intervention",
    "uploadedAt": "2026-04-29T13:15:30.000Z"
  },
  "intervention": { ... }
}
```

#### `PATCH /api/v1/interventions/:id/photo`
Mettre à jour la photo existante

#### `POST /api/v1/interventions/:id/upload-photo-url`
Ajouter une photo par URL (service externe)

```json
{
  "photoUrl": "https://storage.googleapis.com/bucket/photo.jpg",
  "comment": "Photo depuis Google Cloud Storage"
}
```

### **🔍 Gestion des Photos**

#### `GET /api/v1/interventions/:id/photos`
```json
{
  "interventionId": "123e4567-e89b-12d3-a456-426614174000",
  "photos": [
    {
      "url": "https://blob.vercel-storage.com/cleaner-app/intervention-2026-04-29-abc123.webp",
      "type": "intervention_photo",
      "uploadedAt": "2026-04-29T13:15:30.000Z",
      "comment": "Photo avant intervention"
    }
  ],
  "count": 1
}
```

#### `PATCH /api/v1/interventions/:id/remove-photo`
Supprimer la photo d'une intervention

### **🔄 Mise à jour de statut avec photo**

#### `PATCH /api/v1/interventions/:id/status`
```json
{
  "status": "EN_COURS",
  "photoUrl": "https://blob.vercel-storage.com/cleaner-app/intervention-2026-04-29-def456.webp",
  "comment": "Intervention commencée avec photo"
}
```

## 📱 Intégration Mobile (Flutter)

### **Upload avec Dio**
```dart
import 'package:dio/dio.dart';

Future<void> uploadInterventionPhoto(
  String interventionId,
  File imageFile,
  String comment,
  String token,
) async {
  final dio = Dio();
  
  try {
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(
        imageFile.path,
        filename: 'intervention_photo.jpg',
      ),
      'comment': comment,
    });

    final response = await dio.post(
      'http://localhost:3000/api/v1/interventions/$interventionId/upload-photo',
      data: formData,
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'multipart/form-data',
        },
      ),
    );

    print('Photo uploadée: ${response.data}');
  } catch (e) {
    print('Erreur upload: $e');
  }
}
```

### **Upload depuis Camera/Gallery**
```dart
import 'package:image_picker/image_picker.dart';

Future<void> captureAndUploadPhoto(
  String interventionId,
  String token,
) async {
  final picker = ImagePicker();
  final pickedFile = await picker.pickImage(
    source: ImageSource.camera,
    maxWidth: 1920,
    maxHeight: 1920,
    imageQuality: 85,
  );

  if (pickedFile != null) {
    await uploadInterventionPhoto(
      interventionId,
      File(pickedFile.path),
      'Photo prise le ${DateTime.now()}',
      token,
    );
  }
}
```

## 🧪 Tests

### **Fichier de test**
Le fichier `intervention-upload-test.http` contient tous les tests nécessaires :

- ✅ **Upload** avec traitement Sharp
- ✅ **Mise à jour** de photo existante
- ✅ **Ajout** par URL externe
- ✅ **Suppression** de photo
- ✅ **Récupération** des informations
- ✅ **Fallback** base64

### **Commandes de test**
```bash
# Upload avec curl
curl -X POST http://localhost:3000/api/v1/interventions/ID/upload-photo \
  -H "Authorization: Bearer TOKEN" \
  -F "photo=@image.jpg" \
  -F "comment=Test upload"

# Ajout par URL
curl -X POST http://localhost:3000/api/v1/interventions/ID/upload-photo-url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photoUrl":"https://example.com/photo.jpg","comment":"Test URL"}'
```

## 📊 Monitoring et Logs

### **Logs structurés**
```
InterventionUploadController - Upload request received: {
  interventionId: "123e4567-e89b-12d3-a456-426614174000",
  hasPhotoUrl: true,
  photoUrl: "https://blob.vercel-storage.com/...",
  comment: "Photo avant intervention"
}

SharpPipe - Environment detection: {
  isVercel: true,
  hasBlobToken: true,
  blobToken: "configured",
  filename: "intervention-2026-04-29-abc123.webp"
}

SharpPipe - Vercel Blob upload successful: {
  url: "https://blob.vercel-storage.com/cleaner-app/...",
  contentType: "image/webp",
  pathname: "/cleaner-app/intervention-2026-04-29-abc123.webp"
}
```

### **Métriques**
- **Taux de succès** des uploads
- **Taille moyenne** des images traitées
- **Temps de traitement** Sharp
- **Erreurs** par type (format, taille, etc.)

## 🔧 Configuration

### **Variables d'environnement**
```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token

# Configuration Sharp
SHARP_MEMORY_LIMIT=256
SHARP_CONCURRENCY=4

# Multer limits
MAX_FILE_SIZE=5242880  # 5MB
```

### **Configuration Vercel**
```json
{
  "functions": {
    "src/main.ts": {
      "maxDuration": 30
    }
  },
  "build": {
    "env": {
      "BLOB_READ_WRITE_TOKEN": "@blob_rw_token"
    }
  }
}
```

## 📋 Bonnes Pratiques

### **📱 Côté Mobile**
- **Compression** avant upload : réduire la taille
- **Validation** : vérifier le format et la taille
- **Feedback** : indiquer la progression de l'upload
- **Retry** : gérer les erreurs réseau

### **🖼️ Traitement Image**
- **Format WebP** : meilleur compression
- **Redimensionnement** : 800x800 max suffisant
- **Qualité** : 75% optimal pour mobile
- **Métadonnées** : conserver les infos importantes

### **☁️ Stockage**
- **URL publique** : accessible directement
- **CDN** : Vercel Edge pour performance
- **Backup** : Vercel gère la réplication
- **Cleanup** : supprimer les anciennes photos

## 🔄 Workflow Recommandé

### **1. Agent sur le terrain**
```dart
// 1. Prendre photo
final photo = await picker.pickImage(source: ImageSource.camera);

// 2. Upload immédiat
await uploadInterventionPhoto(interventionId, File(photo.path), "Photo avant", token);

// 3. Mettre à jour statut
await updateInterventionStatus(interventionId, "EN_COURS", token);
```

### **2. Agent après intervention**
```dart
// 1. Prendre photo après
final photoApres = await picker.pickImage(source: ImageSource.camera);

// 2. Upload photo après
await uploadInterventionPhoto(interventionId, File(photoApres.path), "Photo après", token);

// 3. Marquer comme résolu
await updateInterventionStatus(interventionId, "RESOLU", token);
```

### **3. Superviseur (validation)**
```dart
// 1. Récupérer les photos
final photos = await getInterventionPhotos(interventionId, token);

// 2. Valider la qualité
if (photos.isNotEmpty && photos.first.url.contains('blob.vercel-storage.com')) {
  // 3. Approuver l'intervention
  await approveIntervention(interventionId, token);
}
```

## 🚨 Gestion des Erreurs

### **Types d'erreurs**
- **Format invalide** : Seuls JPEG/PNG/WebP acceptés
- **Taille excessive** : Max 5MB par fichier
- **Upload échoué** : Retry avec fallback base64
- **Permission refusée** : Vérifier les rôles utilisateur

### **Messages d'erreur**
```json
{
  "statusCode": 400,
  "message": "Seules les images sont autorisées",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 404,
  "message": "Intervention non trouvée",
  "error": "Not Found"
}
```

## 📈 Performance

### **Optimisations**
- **Sharp** : Traitement en mémoire, pas de disque
- **WebP** : 25-35% plus petit que JPEG
- **Vercel Blob** : CDN mondial
- **Cache** : Headers HTTP appropriés

### **Benchmarks**
- **Upload 2MB JPEG** : ~2-3 secondes
- **Traitement Sharp** : ~500ms
- **Stockage Blob** : ~1 seconde
- **Total** : ~3-4 secondes

---

**Version**: 1.0.0  
**Date**: 29/04/2026  
**Auteur**: Cleaner App Dev Team

**Fonctionnalités**:
- ✅ Upload avec Sharp + Vercel Blob
- ✅ Traitement WebP optimisé
- ✅ Fallback base64 automatique
- ✅ CRUD complet des photos
- ✅ Permissions et validation
- ✅ Documentation complète
- ✅ Tests prêts à l'emploi
