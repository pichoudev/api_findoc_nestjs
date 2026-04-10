import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

@Controller('uploads')
export class UploadsController {
  
  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      console.log('UploadsController - Requested file:', filename);
      
      // Vérifier si c'est une image WebP
      if (!filename.endsWith('.webp')) {
        console.log('UploadsController - Invalid file format:', filename);
        throw new NotFoundException('Format de fichier non supporté');
      }

      // Essayer d'abord Vercel Blob avec le bon domaine
      const blobUrl = `https://api-backend-cleaner-nestjs-blob.vercel.app/${filename}`;
      
      console.log('UploadsController - Trying Vercel Blob:', blobUrl);
      
      // Pour l'instant, on redirige vers Vercel Blob
      // Si ça ne fonctionne pas, l'utilisateur verra l'erreur Vercel Blob
      return res.redirect(302, blobUrl);
      
    } catch (error) {
      console.error('UploadsController - Error:', error);
      throw new NotFoundException('Fichier non trouvé');
    }
  }

  @Get(':filename/info')
  async getFileInfo(@Param('filename') filename: string) {
    console.log('UploadsController - File info requested:', filename);
    
    // Informations de debugging
    return {
      filename,
      expectedBlobUrl: `https://api-backend-cleaner-nestjs-blob.vercel.app/${filename}`,
      message: 'Vérifiez que BLOB_READ_WRITE_TOKEN est configuré dans Vercel',
      troubleshooting: {
        step1: 'Allez dans Vercel Dashboard > Project > Settings > Environment Variables',
        step2: 'Ajoutez BLOB_READ_WRITE_TOKEN avec la valeur générée par Vercel',
        step3: 'Redéployez l\'application',
        step4: 'Testez à nouveau l\'upload d\'image'
      }
    };
  }
}
