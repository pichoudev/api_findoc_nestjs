# 🔧 **Correction des erreurs de création de signalement**

## ❌ **Erreurs identifiées**

```json
{
  "message": [
    "property photo should not exist",
    "reportType must be one of the following values: NORMAL, PLEIN, ENDOMMAGE, MANQUANT, DEBORDENT"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## 🎯 **Causes et solutions**

### **1. Erreur `property photo should not exist`**
**Cause** : Le DTO `CreateReportDto` contenait le champ `photo` mais pour les requêtes `multipart/form-data`, il ne doit pas être dans le corps JSON.

**Solution** : Création de deux DTOs séparés :
- `CreateReportDto` : pour les requêtes JSON sans photo
- `CreateReportWithPhotoDto` : pour les requêtes multipart/form-data avec photo

### **2. Erreur `reportType` validation**
**Cause** : L'enum `ReportType` dans le DTO ne correspondait pas correctement à celui de la base de données.

**Solution** : Vérification et correction des enums dans le DTO.

---

## 📋 **DTOs corrigés**

### **CreateReportDto** (JSON sans photo)
```typescript
export class CreateReportDto {
  @ApiProperty({ description: 'ID du bac signalé' })
  @IsUUID()
  @IsNotEmpty()
  bacId: string;

  @ApiProperty({ enum: ReportType, example: ReportType.PLEIN })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiPropertyOptional({ description: 'Description détaillée' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Emplacement utilisateur' })
  @IsString()
  @IsOptional()
  locationUser?: string;

  @ApiProperty({ enum: Priority, example: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
  // ✅ PAS de champ "photo" ici
}
```

### **CreateReportWithPhotoDto** (multipart/form-data avec photo)
```typescript
export class CreateReportWithPhotoDto {
  @ApiProperty({ description: 'ID du bac signalé' })
  @IsUUID()
  @IsNotEmpty()
  bacId: string;

  @ApiProperty({ enum: ReportType, example: ReportType.PLEIN })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiPropertyOptional({ description: 'Description détaillée' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Emplacement utilisateur' })
  @IsString()
  @IsOptional()
  locationUser?: string;

  @ApiProperty({ enum: Priority, example: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ 
    description: 'Photo du problème (fichier)',
    type: 'string',
    format: 'binary'
  })
  photo?: Express.Multer.File;  // ✅ Champ "photo" uniquement ici
}
```

---

## 🎯 **Contrôleur mis à jour**

```typescript
@Post()
@Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
@UseInterceptors(FileInterceptor('photo', multerOptions))
@ApiConsumes('multipart/form-data')
@ApiBody({ type: CreateReportWithPhotoDto })  // ✅ DTO correct pour Swagger
async create(
  @Body() createReportDto: CreateReportDto,  // ✅ DTO sans photo pour validation
  @Req() req: any,
  @UploadedFile(SharpPipe) photoUrl?: string,
) {
  // ...
}
```

---

## 📊 **ReportType valides**

L'enum `ReportType` dans la base de données :
```typescript
enum ReportType {
  NORMAL      // ✅
  PLEIN       // ✅
  ENDOMMAGE   // ✅
  MANQUANT    // ✅
  DEBORDENT   // ✅
}
```

---

## 🧪 **Tests créés**

`reports-corrected-test.http` avec 7 scénarios :

### **✅ Signalements valides**
1. **JSON sans photo** : `reportType: "PLEIN"`
2. **Multipart avec photo** : `reportType: "PLEIN"` + fichier
3. **NORMAL** : `reportType: "NORMAL"`
4. **ENDOMMAGE** : `reportType: "ENDOMMAGE"`
5. **MANQUANT** : `reportType: "MANQUANT"`
6. **DEBORDENT** : `reportType: "DEBORDENT"`

### **❌ Test d'erreur**
7. **Type invalide** : `reportType: "INVALID_TYPE"` → 400

---

## 🎯 **Utilisation correcte**

### **Sans photo (JSON)**
```http
POST /api/v1/reports
Content-Type: application/json

{
  "bacId": "uuid-bac",
  "reportType": "PLEIN",
  "description": "Le bac est plein",
  "priority": "HIGH"
}
```

### **Avec photo (multipart/form-data)**
```http
POST /api/v1/reports
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="bacId"
uuid-bac
------WebKitFormBoundary
Content-Disposition: form-data; name="reportType"
PLEIN
------WebKitFormBoundary
Content-Disposition: form-data; name="photo"; filename="photo.jpg"
Content-Type: image/jpeg
[données binaires]
------WebKitFormBoundary--
```

**Les erreurs sont maintenant corrigées !** 🎯
