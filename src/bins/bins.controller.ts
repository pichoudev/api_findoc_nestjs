import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  Patch, 
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Res
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BinsService } from './bins.service';
import { CreateBinDto, UpdateBinDto, FilterBinsDto } from './dto/bin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole, BacStatus } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('bins')
@Controller('bins')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BinsController {
  constructor(
    private readonly binsService: BinsService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Créer un nouveau bac',
    description: 'Crée un nouveau bac de collecte avec ses informations de localisation et de capacité'
  })
  @ApiBody({ type: CreateBinDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Bac créé avec succès',
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        refCode: "BAC-001",
        binType: "MENAGER",
        status: "ACTIVE",
        statusReport: "NORMAL",
        capacityM3: 2.5,
        localisation: "POINT(9.7043 4.0483)",
        latitude: 4.0483,
        longitude: 9.7043,
        neighborhoodId: "uuid-quartier-bonaberi",
        isActive: true,
        createdAt: "2026-04-03T06:30:00.000Z",
        updatedAt: "2026-04-03T06:30:00.000Z",
        neighborhoodRelation: {
          id: "uuid-quartier-bonaberi",
          name: "Bonaberi",
          city: {
            id: "uuid-ville-douala",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        reports: []
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides',
    schema: {
      example: {
        message: "Les données fournies sont invalides",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Bac déjà existant',
    schema: {
      example: {
        message: "Un bac avec ce code de référence existe déjà",
        error: "Conflict",
        statusCode: 409
      }
    }
  })
  async create(@Body() createBinDto: CreateBinDto) {
    return this.binsService.create(createBinDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ 
    summary: 'Récupérer tous les bacs avec pagination et filtres',
    description: 'Retourne la liste des bacs avec pagination, filtres optionnels et coordonnées GPS'
  })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'binType', required: false, enum: ['MENAGER', 'RECYCLAGE', 'VERRE'], description: 'Filtrer par type de bac' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], description: 'Filtrer par statut' })
  @ApiQuery({ name: 'statusReport', required: false, enum: ['NORMAL', 'PLEIN', 'DEGRADE'], description: 'Filtrer par statut de rapport' })
  @ApiQuery({ name: 'neighborhoodId', required: false, type: 'string', description: 'Filtrer par quartier' })
  @ApiQuery({ name: 'search', required: false, type: 'string', description: 'Rechercher par code de référence' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des bacs récupérée avec succès',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: "550e8400-e29b-41d4-a716-446655440000" },
              refCode: { type: 'string', example: "BAC-001" },
              binType: { type: 'string', enum: ['MENAGER', 'RECYCLAGE', 'VERRE'], example: "MENAGER" },
              status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], example: "ACTIVE" },
              statusReport: { type: 'string', enum: ['NORMAL', 'PLEIN', 'DEGRADE'], example: "NORMAL" },
              capacityM3: { type: 'number', example: 2.5 },
              localisation: { type: 'string', example: "POINT(9.7043 4.0483)" },
              latitude: { type: 'number', example: 4.0483 },
              longitude: { type: 'number', example: 9.7043 },
              neighborhoodId: { type: 'string', example: "uuid-quartier-bonaberi" },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', example: "2026-04-03T06:30:00.000Z" },
              updatedAt: { type: 'string', example: "2026-04-03T06:30:00.000Z" },
              neighborhoodRelation: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: "uuid-quartier-bonaberi" },
                  name: { type: 'string', example: "Bonaberi" },
                  city: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: "uuid-ville-douala" },
                      name: { type: 'string', example: "Douala" },
                      region: { type: 'string', example: "LITTORAL" }
                    }
                  }
                }
              }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 }
          }
        }
      }
    }
  })
  async findAll(@Query() filters: FilterBinsDto) {
    return this.binsService.findAll(filters);
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ 
    summary: 'Rechercher des bacs par nom ou code',
    description: 'Recherche des bacs par code de référence avec pagination et filtres'
  })
  @ApiQuery({ name: 'name', required: true, type: 'string', example: 'BAC-001', description: 'Code de référence ou nom du bac' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bacs trouvés avec succès',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: "550e8400-e29b-41d4-a716-446655440000" },
              refCode: { type: 'string', example: "BAC-001" },
              binType: { type: 'string', enum: ['MENAGER', 'RECYCLAGE', 'VERRE'], example: "MENAGER" },
              status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], example: "ACTIVE" },
              statusReport: { type: 'string', enum: ['NORMAL', 'PLEIN', 'DEGRADE'], example: "NORMAL" },
              capacityM3: { type: 'number', example: 2.5 },
              latitude: { type: 'number', example: 4.0483 },
              longitude: { type: 'number', example: 9.7043 },
              neighborhoodId: { type: 'string', example: "uuid-quartier-bonaberi" },
              isActive: { type: 'boolean', example: true }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètre name requis',
    schema: {
      example: {
        message: "Le paramètre name est requis pour la recherche",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  async searchByName(@Query('name') name: string, @Query() filters: FilterBinsDto) {
    if (!name) {
      throw new BadRequestException('Le paramètre name est requis pour la recherche');
    }
    // Utiliser findAll avec le filtre search
    return this.binsService.findAll({ ...filters, search: name });
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Récupérer les statistiques des bacs',
    description: 'Retourne des statistiques détaillées sur les bacs par type, statut et quartier'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        totalBins: 150,
        activeBins: 120,
        inactiveBins: 25,
        maintenanceBins: 5,
        binsByType: {
          MENAGER: 80,
          RECYCLAGE: 50,
          VERRE: 20
        },
        binsByStatusReport: {
          NORMAL: 100,
          PLEIN: 35,
          DEGRADE: 15
        },
        binsByNeighborhood: {
          "Bonaberi": 25,
          "Akwa": 30,
          "Makepe": 20
        },
        averageFillLevel: 0.75,
        criticalBins: 8
      }
    }
  })
  async getStats() {
    return this.binsService.getStats();
  }

  @Get('full')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Récupérer les bacs pleins',
    description: 'Retourne uniquement les bacs dont le statut de rapport est PLEIN'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bacs pleins récupérés avec succès',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: "550e8400-e29b-41d4-a716-446655440000" },
          refCode: { type: 'string', example: "BAC-001" },
          binType: { type: 'string', enum: ['MENAGER', 'RECYCLAGE', 'VERRE'], example: "MENAGER" },
          statusReport: { type: 'string', example: "PLEIN" },
          latitude: { type: 'number', example: 4.0483 },
          longitude: { type: 'number', example: 9.7043 },
          neighborhoodId: { type: 'string', example: "uuid-quartier-bonaberi" },
          neighborhoodRelation: {
            type: 'object',
            properties: {
              name: { type: 'string', example: "Bonaberi" }
            }
          }
        }
      }
    }
  })
  async getFullBins() {
    return this.binsService.getFullBins();
  }

  @Get('neighborhood/:neighborhoodId')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'neighborhoodId', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Récupérer les bacs d\'un quartier spécifique' })
  @ApiResponse({ status: 200, description: 'Bacs du quartier récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  async findByNeighborhood(@Param('neighborhoodId') neighborhoodId: string) {
    return this.binsService.findByNeighborhood(neighborhoodId);
  }

  @Get('neighborhood-name/:neighborhoodName')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'neighborhoodName', description: 'Nom du quartier' })
  @ApiOperation({ summary: 'Récupérer les bacs d\'un quartier par son nom' })
  @ApiResponse({ status: 200, description: 'Bacs du quartier récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  async findByNeighborhoodName(@Param('neighborhoodName') neighborhoodName: string) {
    return this.binsService.findByNeighborhoodName(neighborhoodName);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiOperation({ summary: 'Récupérer un bac par son ID' })
  @ApiResponse({ status: 200, description: 'Bac récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.binsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiOperation({ summary: 'Mettre à jour un bac' })
  @ApiResponse({ status: 200, description: 'Bac mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  @ApiResponse({ status: 409, description: 'Bac déjà existant' })
  async update(@Param('id') id: string, @Body() updateBinDto: UpdateBinDto) {
    return this.binsService.update(id, updateBinDto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un bac' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  async updateStatus(@Param('id') id: string, @Body('status') status: BacStatus) {
    return this.binsService.updateStatus(id, status);
  }

  @Patch(':id/fill-level')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiOperation({ summary: 'Mettre à jour le niveau de remplissage d\'un bac (non implémenté)' })
  @ApiResponse({ status: 501, description: 'Fonctionnalité non implémentée' })
  async updateFillLevel(@Param('id') id: string, @Body('fillLevel') fillLevel: number) {
    throw new Error('Fonctionnalité non implémentée - fillLevel n\'existe pas dans le schéma');
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiOperation({ summary: 'Supprimer un bac' })
  @ApiResponse({ status: 200, description: 'Bac supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer (dépendances existantes)' })
  async remove(@Param('id') id: string) {
    return this.binsService.remove(id);
  }

  @Get(':id/scan')
  @Public()
  @ApiOperation({ 
    summary: 'Scanner un bac pour obtenir ses informations',
    description: 'Endpoint public pour scanner un QR code de bac et obtenir ses informations sans authentification'
  })
  @ApiParam({ name: 'id', description: 'ID du bac' })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations du bac récupérées avec succès',
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        refCode: "BAC-001",
        binType: "MENAGER",
        status: "ACTIF",
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        neighborhood: {
          id: "uuid-quartier-bonaberi",
          name: "Bonaberi",
          city: {
            id: "uuid-ville-douala",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        reports: [],
        _count: { reports: 0 }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Bac non trouvé',
    schema: {
      example: {
        message: "Bac introuvable",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async scanBin(@Param('id') id: string) {
    return this.binsService.getBinForScan(id);
  }

  @Get('scan')
  @Public()
  @ApiOperation({ 
    summary: 'Scanner un bac',
    description: 'Endpoint public pour scanner un QR code de bac et obtenir ses informations sans authentification'
  })
  @ApiQuery({ name: 'code', description: 'Code référence du bac', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations du bac récupérées avec succès',
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        refCode: "BAC-001",
        binType: "MENAGER",
        status: "ACTIF",
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        neighborhood: {
          id: "uuid-quartier-bonaberi",
          name: "Bonaberi",
          city: {
            id: "uuid-ville-douala",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        reports: [],
        _count: { reports: 0 }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Bac non trouvé',
    schema: {
      example: {
        message: "Bac introuvable",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async scanBinByRefCode(@Query('code') refCode: string) {
    return this.binsService.getBinForScanByRefCode(refCode);
  }

  @Get('qr-display/image/:binId')
  @Public()
  @ApiOperation({ 
    summary: 'Afficher le QR code d\'un bac dans le navigateur',
    description: 'Retourne le QR code du bac comme image PNG pour affichage direct dans le navigateur'
  })
  @ApiParam({ name: 'binId', description: 'ID du bac' })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code affiché avec succès',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Bac non trouvé ou sans QR code'
  })
  async displayQrCode(@Param('binId') binId: string, @Res() res: Response) {
    try {
      const bin = await this.prisma.bin.findUnique({
        where: { id: binId },
        select: {
          id: true,
          refCode: true,
          qrCode: true
        }
      });

      if (!bin) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Bac non trouvé',
          binId
        });
      }

      if (!bin.qrCode) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Ce bac n\'a pas de QR code',
          binId,
          refCode: bin.refCode
        });
      }

      // Extraire les données base64 du QR code
      const base64Data = bin.qrCode.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Configurer les headers pour l'affichage dans le navigateur
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1h
      res.setHeader('Content-Disposition', `inline; filename="${bin.refCode.replace(/[^a-zA-Z0-9]/g, '_')}.png"`);
      
      // Envoyer l'image
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de l\'affichage du QR code',
        error: error.message
      });
    }
  }

  @Get('qr-display/html/:binId')
  @Public()
  @ApiOperation({ 
    summary: 'Afficher une page HTML avec le QR code',
    description: 'Retourne une page HTML contenant le QR code et les informations du bac'
  })
  @ApiParam({ name: 'binId', description: 'ID du bac' })
  @ApiResponse({ 
    status: 200, 
    description: 'Page HTML avec QR code affichée'
  })
  async displayQrCodeHtml(@Param('binId') binId: string, @Res() res: Response) {
    try {
      const bin = await this.prisma.bin.findUnique({
        where: { id: binId },
        include: {
          neighborhood: {
            include: {
              city: true
            }
          },
          _count: {
            select: {
              reports: true
            }
          }
        }
      });

      if (!bin) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Bac non trouvé',
          binId
        });
      }

      if (!bin.qrCode) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Ce bac n\'a pas de QR code',
          binId,
          refCode: bin.refCode
        });
      }

      // Générer la page HTML
      const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code - ${bin.refCode}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .qr-code {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 10px;
            display: inline-block;
        }
        .qr-code img {
            max-width: 300px;
            height: auto;
        }
        .info {
            text-align: left;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .info h3 {
            margin-top: 0;
            color: #333;
        }
        .info p {
            margin: 5px 0;
            color: #666;
        }
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            color: white;
        }
        .status.ACTIF {
            background-color: #28a745;
        }
        .status.INACTIF {
            background-color: #dc3545;
        }
        .actions {
            margin-top: 20px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            text-decoration: none;
            border-radius: 5px;
            color: white;
            font-weight: bold;
        }
        .btn-primary {
            background-color: #007bff;
        }
        .btn-success {
            background-color: #28a745;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>QR Code du Bac</h1>
        
        <div class="qr-code">
            <img src="${bin.qrCode}" alt="QR Code du bac ${bin.refCode}" />
        </div>
        
        <div class="info">
            <h3>Informations du Bac</h3>
            <p><strong>Référence:</strong> ${bin.refCode}</p>
            <p><strong>Type:</strong> ${bin.binType}</p>
            <p><strong>Capacité:</strong> ${bin.capacityM3} m³</p>
            <p><strong>Statut:</strong> <span class="status ${bin.status}">${bin.status}</span></p>
            <p><strong>Quartier:</strong> ${bin.neighborhood?.name}</p>
            <p><strong>Ville:</strong> ${bin.neighborhood?.city?.name}</p>
            <p><strong>Signalements:</strong> ${bin._count.reports}</p>
        </div>
        
        <div class="actions">
            <a href="/api/v1/bins/qr-display/image/${bin.id}" class="btn btn-primary" download="${bin.refCode.replace(/[^a-zA-Z0-9]/g, '_')}.png">
                Télécharger le QR Code
            </a>
            <a href="javascript:window.print()" class="btn btn-success">
                Imprimer
            </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            <strong>Instructions:</strong> Imprimez ce QR code et collez-le sur le bac physique.<br>
            Les citoyens pourront le scanner pour obtenir les informations du bac.
        </p>
    </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de l\'affichage de la page',
        error: error.message
      });
    }
  }

  @Get('qr-display/all')
  @Public()
  @ApiOperation({ 
    summary: 'Afficher tous les QR codes de tous les bacs',
    description: 'Retourne une page HTML contenant tous les QR codes des bacs avec QR code'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Page HTML avec tous les QR codes affichée'
  })
  async displayAllQrCodes(@Res() res: Response) {
    try {
      const bins = await this.prisma.bin.findMany({
        where: {
          qrCode: {
            not: null
          }
        },
        include: {
          neighborhood: {
            include: {
              city: true
            }
          },
          _count: {
            select: {
              reports: true
            }
          }
        },
        orderBy: {
          refCode: 'asc'
        }
      });

      if (bins.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Aucun bac avec QR code trouvé'
        });
      }

      // Générer la grille de QR codes
      const qrCodesHtml = bins.map(bin => `
        <div class="qr-item">
          <div class="qr-code">
            <img src="${bin.qrCode}" alt="QR Code du bac ${bin.refCode}" />
          </div>
          <div class="info">
            <h3>${bin.refCode}</h3>
            <p><strong>Type:</strong> ${bin.binType}</p>
            <p><strong>Statut:</strong> <span class="status ${bin.status}">${bin.status}</span></p>
            <p><strong>Quartier:</strong> ${bin.neighborhood?.name || 'N/A'}</p>
            <p><strong>Ville:</strong> ${bin.neighborhood?.city?.name || 'N/A'}</p>
            <p><strong>Signalements:</strong> ${bin._count.reports}</p>
          </div>
          <div class="actions">
            <a href="/api/v1/bins/qr-display/image/${bin.id}" class="btn btn-primary" target="_blank">
              Voir l'image
            </a>
            <a href="/api/v1/bins/qr-display/html/${bin.id}" class="btn btn-info" target="_blank">
              Voir la page
            </a>
          </div>
        </div>
      `).join('');

      const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tous les QR Codes des Bacs</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .stats {
            background: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .qr-item {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 20px;
            background: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .qr-code {
            text-align: center;
            margin-bottom: 15px;
        }
        .qr-code img {
            max-width: 200px;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            background: white;
        }
        .info {
            text-align: left;
            margin-bottom: 15px;
        }
        .info h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 18px;
        }
        .info p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
        .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: bold;
            color: white;
            font-size: 12px;
        }
        .status.ACTIF {
            background-color: #28a745;
        }
        .status.INACTIF {
            background-color: #dc3545;
        }
        .actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-block;
            padding: 8px 12px;
            text-decoration: none;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            flex: 1;
            min-width: 80px;
        }
        .btn-primary {
            background-color: #007bff;
        }
        .btn-info {
            background-color: #17a2b8;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .actions { display: none; }
            .qr-grid { grid-template-columns: repeat(3, 1fr); }
            .qr-item { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗑️ Tous les QR Codes des Bacs</h1>
            <div class="stats">
                <strong>Total des bacs avec QR code:</strong> ${bins.length}
            </div>
        </div>
        
        <div class="qr-grid">
            ${qrCodesHtml}
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
            <p><strong>Instructions:</strong> Imprimez cette page pour obtenir tous les QR codes.</p>
            <p>Cliquez sur "Voir l'image" ou "Voir la page" pour afficher un QR code individuel.</p>
        </div>
    </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Erreur lors de l\'affichage des QR codes',
        error: error.message
      });
    }
  }
}
