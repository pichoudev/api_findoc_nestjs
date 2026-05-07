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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service';
import { CreationUtilisateurDto } from './dto/creationUtilisateurDto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/role.guards';
import { Type_utilisateur } from '@prisma/client';

@ApiTags('utilisateurs')
@Controller('utilisateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Get()
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Lister tous les utilisateurs',
    description: 'Retourne la liste paginée de tous les utilisateurs'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre par page (défaut: 100)' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.utilisateursService.findAll(page || 1, limit || 100);
  }

  @Get('search')
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Rechercher des utilisateurs',
    description: 'Recherche des utilisateurs par nom, prénom ou email'
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Terme de recherche' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre par page (défaut: 100)' })
  async search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.utilisateursService.search(query, page || 1, limit || 100);
  }

  @Get('stats')
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Statistiques des utilisateurs',
    description: 'Retourne des statistiques sur les utilisateurs par rôle'
  })
  async getStats() {
    return this.utilisateursService.countByRole();
  }

  @Get(':id')
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Obtenir un utilisateur',
    description: 'Retourne les détails d\'un utilisateur spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async findOne(@Param('id') id: string) {
    return this.utilisateursService.findOne(id);
  }

  @Post()
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Créer un utilisateur',
    description: 'Crée un nouvel utilisateur avec les informations fournies'
  })
  async create(@Body() createUtilisateurDto: CreationUtilisateurDto) {
    return this.utilisateursService.create(createUtilisateurDto);
  }

  @Patch(':id')
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour un utilisateur',
    description: 'Met à jour les informations d\'un utilisateur existant'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async update(
    @Param('id') id: string, 
    @Body() updateUtilisateurDto: Partial<CreationUtilisateurDto>
  ) {
    return this.utilisateursService.update(id, updateUtilisateurDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Type_utilisateur.ADMIN)
  @ApiOperation({ 
    summary: 'Activer/Désactiver un utilisateur',
    description: 'Change le statut actif/inactif d\'un utilisateur'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async toggleActive(@Param('id') id: string) {
    return this.utilisateursService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(Type_utilisateur.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur',
    description: 'Désactive un utilisateur (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async remove(@Param('id') id: string) {
    return this.utilisateursService.remove(id);
  }

  @Post(':id/photo')
  @Roles(Type_utilisateur.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Uploader la photo d\'un utilisateur',
    description: 'Upload une nouvelle photo de profil pour un utilisateur spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }
    return this.utilisateursService.uploadUserPhoto(id, file);
  }

  @Delete(':id/photo')
  @Roles(Type_utilisateur.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer la photo d\'un utilisateur',
    description: 'Supprime la photo de profil d\'un utilisateur spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  async removePhoto(@Param('id') id: string) {
    return this.utilisateursService.removeUserPhoto(id);
  }
}
