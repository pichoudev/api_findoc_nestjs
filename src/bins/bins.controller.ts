import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BinsService } from './bins.service';
import { CreateBinDto, UpdateBinDto, FilterBinsDto } from './dto/bin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole, BacStatus } from '@prisma/client';

@ApiTags('bins')
@Controller('bins')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BinsController {
  constructor(private readonly binsService: BinsService) {}

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
}
