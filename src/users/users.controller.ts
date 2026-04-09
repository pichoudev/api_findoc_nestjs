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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: 'Créer un nouvel utilisateur',
    description: 'Crée un nouvel utilisateur avec les informations fournies. Le mot de passe est automatiquement hashé.'
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Utilisateur créé avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: true,
        isVerified: false,
        neighborhoodId: "uuid-quartier",
        neighborhoodRelation: {
          id: "uuid-quartier",
          name: "Bonaberi",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:27:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides',
    schema: {
      example: {
        message: "Le quartier spécifié n'existe pas",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email ou téléphone déjà utilisé',
    schema: {
      example: {
        message: "Cet email est déjà utilisé",
        error: "Conflict",
        statusCode: 409
      }
    }
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Récupérer tous les utilisateurs avec pagination et filtres',
    description: 'Retourne une liste paginée d\'utilisateurs avec possibilité de filtrer par rôle, statut, quartier, etc.'
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, example: '10', description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, example: 'CITIZEN', description: 'Filtrer par rôle' })
  @ApiQuery({ name: 'isActive', required: false, example: 'true', description: 'Filtrer par statut actif' })
  @ApiQuery({ name: 'isVerified', required: false, example: 'true', description: 'Filtrer par statut vérifié' })
  @ApiQuery({ name: 'neighborhoodId', required: false, example: 'uuid-quartier', description: 'Filtrer par quartier' })
  @ApiQuery({ name: 'search', required: false, example: 'john', description: 'Rechercher par nom ou email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs récupérée avec succès',
    schema: {
      example: {
        data: [
          {
            id: "uuid-utilisateur-1",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+237612345678",
            role: "CITIZEN",
            isActive: true,
            isVerified: true,
            neighborhoodId: "uuid-quartier",
            neighborhoodRelation: {
              id: "uuid-quartier",
              name: "Bonaberi",
              city: {
                id: "uuid-ville",
                name: "Douala",
                region: "LITTORAL"
              }
            },
            createdAt: "2026-04-03T05:27:00.000Z",
            updatedAt: "2026-04-03T05:27:00.000Z"
          }
        ],
        meta: {
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3
        }
      }
    }
  })
  async findAll(@Query() filters: FilterUsersDto) {
    return this.usersService.findAll(filters);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Récupérer les statistiques des utilisateurs',
    description: 'Retourne des statistiques sur les utilisateurs par rôle, statut, etc.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        totalUsers: 150,
        activeUsers: 120,
        verifiedUsers: 95,
        usersByRole: {
          ADMIN: 5,
          SUPERVISOR: 15,
          AGENT: 30,
          CITIZEN: 100
        },
        recentRegistrations: 12,
        inactiveUsers: 30
      }
    }
  })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get('search')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Rechercher des utilisateurs par nom',
    description: 'Recherche des utilisateurs par nom ou email avec filtres optionnels'
  })
  @ApiQuery({ name: 'name', required: true, example: 'john', description: 'Terme de recherche (nom ou email)' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, example: '10', description: 'Nombre d\'éléments par page' })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateurs trouvés avec succès',
    schema: {
      example: {
        data: [
          {
            id: "uuid-utilisateur-1",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+237612345678",
            role: "CITIZEN",
            isActive: true,
            isVerified: true,
            neighborhoodRelation: {
              id: "uuid-quartier",
              name: "Bonaberi",
              city: {
                id: "uuid-ville",
                name: "Douala",
                region: "LITTORAL"
              }
            },
            createdAt: "2026-04-03T05:27:00.000Z",
            updatedAt: "2026-04-03T05:27:00.000Z"
          }
        ],
        meta: {
          total: 3,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètre name manquant',
    schema: {
      example: {
        message: "Le paramètre name est requis pour la recherche",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Récupérer le profil de l\'utilisateur connecté',
    description: 'Retourne les informations complètes de l\'utilisateur actuellement authentifié'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil récupéré avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        neighborhoodId: "uuid-quartier",
        neighborhoodRelation: {
          id: "uuid-quartier",
          name: "Bonaberi",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:27:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Utilisateur non authentifié',
    schema: {
      example: {
        message: "Utilisateur non authentifié",
        error: "Unauthorized",
        statusCode: 401
      }
    }
  })
  async getProfile(@Req() req: Request & { user: AuthenticatedUser }) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.usersService.findOne(req.user.userId);
  }

  @Patch('profile')
  @ApiOperation({ 
    summary: 'Mettre à jour le profil de l\'utilisateur connecté',
    description: 'Met à jour les informations de l\'utilisateur actuellement authentifié. Accepte soit l\'ID du quartier, soit le nom du quartier.'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil mis à jour avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "+237698765432",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        neighborhoodId: "uuid-nouveau-quartier",
        neighborhoodRelation: {
          id: "uuid-nouveau-quartier",
          name: "Akwa",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides',
    schema: {
      example: {
        message: "Aucun quartier trouvé avec le nom: quartier-inexistant",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email ou téléphone déjà utilisé',
    schema: {
      example: {
        message: "Cet email est déjà utilisé",
        error: "Conflict",
        statusCode: 409
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Utilisateur non authentifié',
    schema: {
      example: {
        message: "Utilisateur non authentifié",
        error: "Unauthorized",
        statusCode: 401
      }
    }
  })
  async updateProfile(@Req() req: Request & { user: AuthenticatedUser }, @Body() updateUserDto: UpdateUserDto) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Récupérer un utilisateur par son ID',
    description: 'Retourne les informations complètes d\'un utilisateur spécifique'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur récupéré avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        neighborhoodId: "uuid-quartier",
        neighborhoodRelation: {
          id: "uuid-quartier",
          name: "Bonaberi",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:27:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR', "CITIZEN")
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Mettre à jour un utilisateur',
    description: 'Met à jour les informations d\'un utilisateur spécifique. Les utilisateurs peuvent mettre à jour leur propre profil.'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur mis à jour avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "+237698765432",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        neighborhoodId: "uuid-nouveau-quartier",
        neighborhoodRelation: {
          id: "uuid-nouveau-quartier",
          name: "Akwa",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email ou téléphone déjà utilisé',
    schema: {
      example: {
        message: "Cet email est déjà utilisé",
        error: "Conflict",
        statusCode: 409
      }
    }
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Mettre à jour le mot de passe de l\'utilisateur',
    description: 'Met à jour le mot de passe d\'un utilisateur après vérification de l\'ancien mot de passe'
  })
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe mis à jour avec succès',
    schema: {
      example: {
        message: "Mot de passe mis à jour avec succès"
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Ancien mot de passe incorrect',
    schema: {
      example: {
        message: "Ancien mot de passe incorrect",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdateUserPasswordDto) {
    return this.usersService.updatePassword(id, updatePasswordDto);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Mettre à jour le rôle d\'un utilisateur',
    description: 'Met à jour le rôle d\'un utilisateur spécifique. Réservé aux administrateurs.'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN'],
          example: 'AGENT',
          description: 'Nouveau rôle de l\'utilisateur'
        }
      },
      required: ['role']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôle mis à jour avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "AGENT",
        isActive: true,
        isVerified: true,
        updatedAt: "2026-04-03T05:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Activer un utilisateur',
    description: 'Active le compte d\'un utilisateur spécifique. Réservé aux administrateurs et superviseurs.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur activé avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        updatedAt: "2026-04-03T05:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async activate(@Param('id') id: string) {
    return this.usersService.activateDeactivate(id, true);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Désactiver un utilisateur',
    description: 'Désactive le compte d\'un utilisateur spécifique. Réservé aux administrateurs et superviseurs.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur désactivé avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: false,
        isVerified: true,
        updatedAt: "2026-04-03T05:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async deactivate(@Param('id') id: string) {
    return this.usersService.activateDeactivate(id, false);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur', example: 'uuid-utilisateur' })
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur',
    description: 'Supprime définitivement un utilisateur spécifique. Réservé aux administrateurs.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé avec succès',
    schema: {
      example: {
        id: "uuid-utilisateur",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+237612345678",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        createdAt: "2026-04-03T05:27:00.000Z",
        updatedAt: "2026-04-03T05:27:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        message: "Utilisateur non trouvé",
        error: "Not Found",
        statusCode: 404
      }
    }
  })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
