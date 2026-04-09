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
      
      // Déterminer le chemin de sortie selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const outputPath = isProduction 
        ? path.join(process.cwd(), 'uploads', 'compressed', filename)  // En production: /app/uploads/compressed
        : path.join(__dirname, '..', 'uploads', 'compressed', filename); // En développement: projet/uploads/compressed
      const outputDir = path.dirname(outputPath);

      console.log('SharpPipe - Processing:', {
        originalName,
        filename,
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
      const metadata = await sharp(image.buffer).metadata();
      console.log('SharpPipe - Image metadata:', metadata);
      
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('L\'image n\'a pas de dimensions valides');
      }

      // Traitement de l'image
      await sharp(image.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: 75,
          effort: 6
        })
        .toFile(outputPath);

      console.log('SharpPipe - Image processed successfully:', filename);
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