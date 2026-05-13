import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VillesService } from './villes.service';
import { QueryAnnonceDto } from 'src/annonces/dto/query.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateVilleDto } from './dto/update.dto';
import { CreateVilleDto } from './dto/create.dto';


@ApiTags("villes")
@Controller('villes')
export class VillesController {

    // constructor
    constructor(private readonly serviceVille :VillesService){}

 @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les villes avec filtres' })
  @ApiResponse({ status: 200, description: 'Liste des villes récupérée' })
  async findAll() {
    return this.serviceVille.getAllVille();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une annonce par son ID' })
  @ApiResponse({ status: 200, description: 'Annonce récupérée' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  async findOne(@Param('id') id: string) {
    return this.serviceVille.getByIdville(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une ville' })
  @ApiResponse({ status: 200, description: 'ville mise à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'ville non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateVilleDto: UpdateVilleDto
  ) {
    return this.serviceVille.updateVille(id, updateVilleDto);
  }  

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle ville' })
  @ApiResponse({ status: 201, description: 'ville créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(@Body() createVilleDto: CreateVilleDto) {
    return this.serviceVille.createVille(createVilleDto);
  }
}
