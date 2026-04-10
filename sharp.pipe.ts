import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class SharpPipe implements PipeTransform<Express.Multer.File, Promise<string>> {
  async transform(image: Express.Multer.File): Promise<string> {
    console.log('SharpPipe - Input received:', {
      hasImage: !!image,
      hasBuffer: !!image?.buffer,
      bufferLength: image?.buffer?.length,
      mimetype: image?.mimetype,
      originalname: image?.originalname,
      size: image?.size
    });

    // Validation de l'input
    if (!image) {
      console.log('SharpPipe - No image provided');
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!image.buffer) {
      console.log('SharpPipe - No buffer in image');
      throw new BadRequestException('Fichier vide ou corrompu');
    }

    if (!image.mimetype || !image.mimetype.startsWith('image/')) {
      console.log('SharpPipe - Invalid mimetype:', image.mimetype);
      throw new BadRequestException('Le fichier doit être une image');
    }

    if (image.buffer.length === 0) {
      console.log('SharpPipe - Empty buffer');
      throw new BadRequestException('Le buffer de l\'image est vide');
    }

    // Vérification minimale de la taille du buffer
    if (image.buffer.length < 100) {
      console.log('SharpPipe - Buffer too small:', image.buffer.length);
      throw new BadRequestException('L\'image semble trop petite pour être valide');
    }

    console.log('SharpPipe - Validations passed, processing image...');

    try {
      const originalName = path.parse(image.originalname).name.replace(/\s+/g, '-'); // Remplace les espaces
      const filename = `${Date.now()}-${originalName}.webp`;
      
      // Détection de l'environnement
      const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
      const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
      
      console.log('SharpPipe - Environment detection:', {
        isVercel,
        hasBlobToken,
        blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'missing',
        filename
      });

      // Traitement de l'image en mémoire
      const processedBuffer = await sharp(image.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: 75,
          effort: 6
        })
        .toBuffer();

      console.log('SharpPipe - Image processed, size:', processedBuffer.length);

      // Vercel avec Blob configuré
      if (isVercel && hasBlobToken) {
        console.log('SharpPipe - Using Vercel Blob storage');
        
        try {
          // Import dynamique pour éviter les erreurs en local
          const { put } = await import('@vercel/blob');
          
          console.log('SharpPipe - Uploading to Vercel Blob:', {
            filename,
            bufferSize: processedBuffer.length,
            token: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...'
          });
          
          const blob = await put(filename, processedBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });

          console.log('SharpPipe - Vercel Blob upload successful:', {
            url: blob.url,
            uploadedAt: blob.uploadedAt,
            contentType: blob.contentType,
            size: blob.size
          });
          
          return blob.url;
        } catch (blobError) {
          console.error('SharpPipe - Vercel Blob failed, falling back to base64:', {
            error: blobError.message,
            stack: blobError.stack
          });
          
          // Fallback: base64 si Vercel Blob échoue
          const base64Image = processedBuffer.toString('base64');
          const dataUrl = `data:image/webp;base64,${base64Image}`;
          return dataUrl;
        }
      }
      
      // Vercel sans Blob ou autres environnements: stockage local
      const isProduction = process.env.NODE_ENV === 'production';
      const outputPath = isProduction 
        ? path.join('/tmp', 'uploads', 'compressed', filename)  // En production: /tmp/uploads/compressed
        : path.join(__dirname, '..', 'uploads', 'compressed', filename); // En développement: projet/uploads/compressed
      const outputDir = path.dirname(outputPath);

      console.log('SharpPipe - Using local storage:', {
        outputPath,
        outputDir,
        isProduction,
        cwd: process.cwd()
      });

      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(outputDir)) {
        console.log('SharpPipe - Creating directory:', outputDir);
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Validation avec Sharp avant traitement
      const metadata = await sharp(processedBuffer).metadata();
      console.log('SharpPipe - Processed image metadata:', metadata);
      
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('L\'image n\'a pas de dimensions valides');
      }

      // Sauvegarder le fichier traité
      await sharp(processedBuffer).toFile(outputPath);

      console.log('SharpPipe - Local storage successful:', filename);
      return filename;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Log de l'erreur pour debugging
      console.error('Sharp processing error:', error);
      throw new BadRequestException('Erreur lors du traitement de l\'image: ' + error.message);
    }
  }
}   