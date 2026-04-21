import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class QrUtilsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Générer et sauvegarder tous les QR codes des bacs
   */
  async generateAllQrCodes(outputDir: string = './qr-codes'): Promise<void> {
    // Créer le répertoire de sortie
    const fs = require('fs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Récupérer tous les bacs
    const bins = await this.prisma.bin.findMany({
      select: {
        id: true,
        refCode: true,
        qrCode: true,
        neighborhood: {
          select: {
            name: true,
            city: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`Génération de ${bins.length} QR codes...`);

    // Générer un QR code pour chaque bac
    for (const bin of bins) {
      if (bin.qrCode) {
        // Extraire les données base64 du QR code
        const base64Data = bin.qrCode.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Nom du fichier: refCode du bac
        const fileName = `${bin.refCode.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filePath = join(outputDir, fileName);
        
        // Sauvegarder l'image
        writeFileSync(filePath, buffer);
        
        console.log(`✅ QR code généré: ${fileName}`);
        console.log(`   Bac: ${bin.refCode}`);
        console.log(`   Quartier: ${bin.neighborhood?.name}, ${bin.neighborhood?.city?.name}`);
        console.log(`   Fichier: ${filePath}`);
        console.log('');
      }
    }

    console.log(`\n🎉 Tous les QR codes ont été générés dans: ${outputDir}`);
  }

  /**
   * Générer un QR code pour un bac spécifique
   */
  async generateSingleQrCode(binId: string, outputDir: string = './qr-codes'): Promise<string> {
    const bin = await this.prisma.bin.findUnique({
      where: { id: binId },
      select: {
        id: true,
        refCode: true,
        qrCode: true,
        neighborhood: {
          select: {
            name: true,
            city: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!bin) {
      throw new Error('Bac non trouvé');
    }

    if (!bin.qrCode) {
      throw new Error('Ce bac n\'a pas de QR code');
    }

    // Créer le répertoire de sortie
    const fs = require('fs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Extraire et sauvegarder le QR code
    const base64Data = bin.qrCode.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${bin.refCode.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filePath = join(outputDir, fileName);
    
    writeFileSync(filePath, buffer);
    
    console.log(`✅ QR code généré: ${fileName}`);
    console.log(`   Bac: ${bin.refCode}`);
    console.log(`   Quartier: ${bin.neighborhood?.name}, ${bin.neighborhood?.city?.name}`);
    console.log(`   Fichier: ${filePath}`);
    
    return filePath;
  }

  /**
   * Obtenir les statistiques des QR codes
   */
  async getQrCodeStats(): Promise<any> {
    const totalBins = await this.prisma.bin.count();
    const binsWithQr = await this.prisma.bin.count({
      where: { qrCode: { not: null } }
    });
    const binsWithoutQr = totalBins - binsWithQr;

    return {
      total: totalBins,
      withQrCode: binsWithQr,
      withoutQrCode: binsWithoutQr,
      completionRate: totalBins > 0 ? (binsWithQr / totalBins * 100).toFixed(2) + '%' : '0%'
    };
  }
}
