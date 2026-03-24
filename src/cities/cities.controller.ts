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
import { CitiesService } from './cities.service';
import { CreateCityDto, UpdateCityDto, FilterCitiesDto } from './dto/city.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('cities')
@Controller('cities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Créer une nouvelle ville' })
  @ApiResponse({ status: 201, description: 'Ville créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Ville déjà existante' })
  async create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Récupérer toutes les villes avec pagination et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des villes récupérée avec succès' })
  async findAll(@Query() filters: FilterCitiesDto) {
    return this.citiesService.findAll(filters);
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ summary: 'Rechercher des villes par nom' })
  @ApiResponse({ status: 200, description: 'Villes trouvées avec succès' })
  async searchByName(@Query('name') name: string, @Query() filters: FilterCitiesDto) {
    if (!name) {
      throw new BadRequestException('Le paramètre name est requis pour la recherche');
    }
    
    return this.citiesService.findAll({
      ...filters,
      search: name
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Récupérer les statistiques des villes' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.citiesService.getStats();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiParam({ name: 'id', description: 'ID de la ville' })
  @ApiOperation({ summary: 'Récupérer une ville par son ID' })
  @ApiResponse({ status: 200, description: 'Ville récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Ville non trouvée' })
  async findOne(@Param('id') id: string) {
    return this.citiesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de la ville' })
  @ApiOperation({ summary: 'Mettre à jour une ville' })
  @ApiResponse({ status: 200, description: 'Ville mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Ville non trouvée' })
  @ApiResponse({ status: 409, description: 'Ville déjà existante' })
  async update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return this.citiesService.update(id, updateCityDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID de la ville' })
  @ApiOperation({ summary: 'Supprimer une ville' })
  @ApiResponse({ status: 200, description: 'Ville supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Ville non trouvée' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer (dépendances existantes)' })
  async remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
