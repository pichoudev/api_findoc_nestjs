import { Injectable } from '@nestjs/common';
import { put } from '@vercel/blob';

@Injectable()
export class VercelBlobService {
  async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    try {
      console.log('VercelBlobService - Uploading image:', filename);
      
      const blob = await put(filename, buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log('VercelBlobService - Upload successful:', blob.url);
      return blob.url;
    } catch (error) {
      console.error('VercelBlobService - Upload failed:', error);
      throw new Error('Erreur lors de l\'upload sur Vercel Blob: ' + error.message);
    }
  }

  isConfigured(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
  }
}
