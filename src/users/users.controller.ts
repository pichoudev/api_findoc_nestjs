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
  Req,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserPasswordDto, FilterUsersDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs avec pagination et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs récupérée avec succès' })
  async findAll(@Query() filters: FilterUsersDto) {
    return this.usersService.findAll(filters);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Récupérer les statistiques des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ summary: 'Rechercher des utilisateurs par nom' })
  @ApiResponse({ status: 200, description: 'Utilisateurs trouvés avec succès' })
  async searchByName(@Query('name') name: string, @Query() filters: FilterUsersDto) {
    if (!name) {
      throw new BadRequestException('Le paramètre name est requis pour la recherche');
    }
    
    return this.usersService.findAll({
      ...filters,
      search: name
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Récupérer le profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil récupéré avec succès' })
  async getProfile(@Req() req: Request & { user: AuthenticatedUser }) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.usersService.findOne(req.user.userId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Récupérer un utilisateur par son ID' })
  @ApiResponse({ status: 200, description: 'Utilisateur récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Mettre à jour le mot de passe de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Mot de passe mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdateUserPasswordDto) {
    return this.usersService.updatePassword(id, updatePasswordDto);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Mettre à jour le rôle d\'un utilisateur' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Activer un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur activé avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async activate(@Param('id') id: string) {
    return this.usersService.activateDeactivate(id, true);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Désactiver un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.activateDeactivate(id, false);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
