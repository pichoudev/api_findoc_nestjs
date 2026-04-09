# Configuration Vercel Blob pour le stockage d'images

## 1. Variables d'environnement Vercel

Ajoutez ces variables dans votre dashboard Vercel :

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## 2. Comment obtenir le token

1. Allez dans le dashboard Vercel
2. Votre projet > Settings > Environment Variables
3. Cliquez sur "Add New"
4. Nom : `BLOB_READ_WRITE_TOKEN`
5. Valeur : Générée automatiquement par Vercel

## 3. Format des URLs après upload

```
https://blob.vercel-storage.com/filename.webp
```

## 4. Utilisation

Après configuration, les uploads utiliseront automatiquement Vercel Blob :

- **URL publique** : `https://blob.vercel-storage.com/xxx.webp`
- **Stockage permanent** : Persistant entre déploiements
- **Accès public** : Directement accessible
- **Optimisation** : Images converties en WebP

## 5. Fallback

Si Vercel Blob n'est pas configuré, le système utilisera :
- **Base64** sur Vercel (temporaire)
- **Local** sur Render/Dev
