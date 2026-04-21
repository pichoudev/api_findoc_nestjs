import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { QrUtilsService } from './qr-utils.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('qr-codes')
@Controller('qr-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrController {
  constructor(private readonly qrUtilsService: QrUtilsService) {}

  @Post('generate-all')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Générer tous les QR codes des bacs',
    description: 'Génère et sauvegarde tous les QR codes des bacs dans un répertoire'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        outputDir: {
          type: 'string',
          description: 'Répertoire de sortie (optionnel)',
          default: './qr-codes'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'QR codes générés avec succès',
    schema: {
      example: {
        message: "QR codes générés avec succès",
        outputDir: "./qr-codes",
        count: 25
      }
    }
  })
  async generateAllQrCodes(@Body() body: { outputDir?: string }, @Res() res: Response) {
    try {
      const outputDir = body.outputDir || './qr-codes';
      await this.qrUtilsService.generateAllQrCodes(outputDir);
      
      res.status(HttpStatus.OK).json({
        message: 'QR codes générés avec succès',
        outputDir,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de la génération des QR codes',
        error: error.message
      });
    }
  }

  @Post('generate/:binId')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Générer le QR code d\'un bac spécifique',
    description: 'Génère et sauvegarde le QR code d\'un bac spécifique'
  })
  @ApiParam({ name: 'binId', description: 'ID du bac' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        outputDir: {
          type: 'string',
          description: 'Répertoire de sortie (optionnel)',
          default: './qr-codes'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code généré avec succès',
    schema: {
      example: {
        message: "QR code généré avec succès",
        binId: "550e8400-e29b-41d4-a716-446655440000",
        refCode: "BAC-001",
        filePath: "./qr-codes/BAC_001.png"
      }
    }
  })
  async generateSingleQrCode(
    @Param('binId') binId: string, 
    @Body() body: { outputDir?: string },
    @Res() res: Response
  ) {
    try {
      const outputDir = body.outputDir || './qr-codes';
      const filePath = await this.qrUtilsService.generateSingleQrCode(binId, outputDir);
      
      res.status(HttpStatus.OK).json({
        message: 'QR code généré avec succès',
        binId,
        filePath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de la génération du QR code',
        error: error.message
      });
    }
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Statistiques des QR codes',
    description: 'Retourne les statistiques sur les QR codes des bacs'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        total: 100,
        withQrCode: 85,
        withoutQrCode: 15,
        completionRate: "85.00%"
      }
    }
  })
  async getQrStats(@Res() res: Response) {
    try {
      const stats = await this.qrUtilsService.getQrCodeStats();
      
      res.status(HttpStatus.OK).json({
        message: 'Statistiques récupérées avec succès',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }

  @Get('download/:filename')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Télécharger un QR code',
    description: 'Permet de télécharger un fichier QR code spécifique'
  })
  @ApiParam({ name: 'filename', description: 'Nom du fichier QR code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Fichier QR code téléchargé'
  })
  async downloadQrCode(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join('./qr-codes', filename);
      
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        res.status(HttpStatus.NOT_FOUND).json({
          message: 'Fichier QR code non trouvé',
          filename
        });
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors du téléchargement',
        error: error.message
      });
    }
  }
}
