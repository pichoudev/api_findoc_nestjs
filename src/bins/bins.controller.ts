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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Créer un nouveau bac' })
  @ApiResponse({ status: 201, description: 'Bac créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Bac déjà existant' })
  async create(@Body() createBinDto: CreateBinDto) {
    return this.binsService.create(createBinDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Récupérer tous les bacs avec pagination et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des bacs récupérée avec succès' })
  async findAll(@Query() filters: FilterBinsDto) {
    return this.binsService.findAll(filters);
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Rechercher des bacs par nom ou code' })
  @ApiResponse({ status: 200, description: 'Bacs trouvés avec succès' })
  async searchByName(@Query('name') name: string, @Query() filters: FilterBinsDto) {
    if (!name) {
      throw new BadRequestException('Le paramètre name est requis pour la recherche');
    }
    
    return this.binsService.findAll({
      ...filters,
      search: name
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ summary: 'Récupérer les statistiques des bacs' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.binsService.getStats();
  }

  @Get('full')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ summary: 'Récupérer les bacs pleins' })
  @ApiResponse({ status: 200, description: 'Bacs pleins récupérés avec succès' })
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
