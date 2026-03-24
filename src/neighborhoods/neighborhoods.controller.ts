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
import { NeighborhoodsService } from './neighborhoods.service';
import { CreateNeighborhoodDto, UpdateNeighborhoodDto, FilterNeighborhoodsDto } from './dto/neighborhood.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('neighborhoods')
@Controller('neighborhoods')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NeighborhoodsController {
  constructor(private readonly neighborhoodsService: NeighborhoodsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Créer un nouveau quartier' })
  @ApiResponse({ status: 201, description: 'Quartier créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Quartier déjà existant' })
  async create(@Body() createNeighborhoodDto: CreateNeighborhoodDto) {
    return this.neighborhoodsService.create(createNeighborhoodDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Récupérer tous les quartiers avec pagination et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des quartiers récupérée avec succès' })
  async findAll(@Query() filters: FilterNeighborhoodsDto) {
    return this.neighborhoodsService.findAll(filters);
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Rechercher des quartiers par nom' })
  @ApiResponse({ status: 200, description: 'Quartiers trouvés avec succès' })
  async searchByName(@Query('name') name: string, @Query() filters: FilterNeighborhoodsDto) {
    if (!name) {
      throw new BadRequestException('Le paramètre name est requis pour la recherche');
    }
    
    return this.neighborhoodsService.findAll({
      ...filters,
      search: name
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Récupérer les statistiques des quartiers' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.neighborhoodsService.getStats();
  }

  @Get('city/:cityId')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'cityId', description: 'ID de la ville' })
  @ApiOperation({ summary: 'Récupérer les quartiers d\'une ville spécifique' })
  @ApiResponse({ status: 200, description: 'Quartiers de la ville récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Ville non trouvée' })
  async findByCity(@Param('cityId') cityId: string) {
    return this.neighborhoodsService.findByCity(cityId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'id', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Récupérer un quartier par son ID' })
  @ApiResponse({ status: 200, description: 'Quartier récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.neighborhoodsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Mettre à jour un quartier' })
  @ApiResponse({ status: 200, description: 'Quartier mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  @ApiResponse({ status: 409, description: 'Quartier déjà existant' })
  async update(@Param('id') id: string, @Body() updateNeighborhoodDto: UpdateNeighborhoodDto) {
    return this.neighborhoodsService.update(id, updateNeighborhoodDto);
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Activer un quartier' })
  @ApiResponse({ status: 200, description: 'Quartier activé avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  async activate(@Param('id') id: string) {
    return this.neighborhoodsService.activateDeactivate(id, true);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Désactiver un quartier' })
  @ApiResponse({ status: 200, description: 'Quartier désactivé avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  async deactivate(@Param('id') id: string) {
    return this.neighborhoodsService.activateDeactivate(id, false);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID du quartier' })
  @ApiOperation({ summary: 'Supprimer un quartier' })
  @ApiResponse({ status: 200, description: 'Quartier supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Quartier non trouvé' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer (dépendances existantes)' })
  async remove(@Param('id') id: string) {
    return this.neighborhoodsService.remove(id);
  }
}
