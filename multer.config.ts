import { memoryStorage } from 'multer';
import { extname, parse } from 'path';

export const multerOptions = {
  storage: memoryStorage(), // Utiliser memoryStorage pour avoir le buffer disponible
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5 Mo
  fileFilter: (req, file, callback) => {
    console.log('Multer - File filter check:', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
      hasBuffer: !!file.buffer
    });

    if (file.mimetype.startsWith('image/')) {
      console.log('Multer - File accepted');
      callback(null, true);
    } else {
      console.log('Multer - File rejected - not an image');
      callback(new Error('Seules les images sont autorisées'), false);
    }
  },
};   