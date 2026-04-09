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
        throw new NotFoundException('Fichier non trouvé');
      }

      // Construire l'URL Vercel Blob
      const blobUrl = `https://blob.vercel-storage.com/${filename}`;
      
      console.log('UploadsController - Redirecting to:', blobUrl);
      
      // Rediriger vers Vercel Blob
      return res.redirect(302, blobUrl);
      
    } catch (error) {
      console.error('UploadsController - Error:', error);
      throw new NotFoundException('Fichier non trouvé');
    }
  }
}
