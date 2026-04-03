import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateUserPasswordDto, FilterUsersDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, neighborhoodId, neighborhood, ...userData } = createUserDto;

    // Vérifier si l'email ou le téléphone existe déjà
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { phone: userData.phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      if (existingUser.phone === userData.phone) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // Gérer le quartier : soit par ID, soit par nom
    let finalNeighborhoodId = neighborhoodId;
    
    if (neighborhood && !neighborhoodId) {
      // Rechercher le quartier par nom
      const foundNeighborhood = await this.prisma.neighborhood.findFirst({
        where: {
          name: {
            equals: neighborhood,
            mode: 'insensitive'
          }
        }
      });
      
      if (!foundNeighborhood) {
        throw new BadRequestException(`Aucun quartier trouvé avec le nom: ${neighborhood}`);
      }
      
      finalNeighborhoodId = foundNeighborhood.id;
    }

    // Vérifier si le quartier existe (si spécifié)
    if (finalNeighborhoodId) {
      const neighborhoodExists = await this.prisma.neighborhood.findUnique({
        where: { id: finalNeighborhoodId }
      });
      if (!neighborhoodExists) {
        throw new BadRequestException('Le quartier spécifié n\'existe pas');
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        neighborhoodId: finalNeighborhoodId,
      },
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(filters: FilterUsersDto) {
    const {
      role,
      isActive,
      isVerified,
      search,
      page = '1',
      limit = '10'
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (isVerified !== undefined) where.isVerified = isVerified;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          neighborhoodRelation: {
            select: {
              id: true,
              name: true,
              city: {
                select: {
                  id: true,
                  name: true,
                  region: true
                }
              }
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: users,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const { neighborhoodId, neighborhood, ...userData } = updateUserDto;

    // Vérifier si l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier les conflits d'email/téléphone
    if (userData.email || userData.phone) {
      const conflictUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                userData.email ? { email: userData.email } : {},
                userData.phone ? { phone: userData.phone } : {}
              ].filter(condition => Object.keys(condition).length > 0)
            }
          ]
        }
      });

      if (conflictUser) {
        if (conflictUser.email === userData.email) {
          throw new ConflictException('Cet email est déjà utilisé');
        }
        if (conflictUser.phone === userData.phone) {
          throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
        }
      }
    }

    // Gérer le quartier : soit par ID, soit par nom
    let finalNeighborhoodId = neighborhoodId;
    
    if (neighborhood && !neighborhoodId) {
      // Rechercher le quartier par nom
      const foundNeighborhood = await this.prisma.neighborhood.findFirst({
        where: {
          name: {
            equals: neighborhood,
            mode: 'insensitive'
          }
        }
      });
      
      if (!foundNeighborhood) {
        throw new BadRequestException(`Aucun quartier trouvé avec le nom: ${neighborhood}`);
      }
      
      finalNeighborhoodId = foundNeighborhood.id;
    }

    // Vérifier si le quartier existe (si spécifié)
    if (finalNeighborhoodId) {
      const neighborhoodExists = await this.prisma.neighborhood.findUnique({
        where: { id: finalNeighborhoodId }
      });
      if (!neighborhoodExists) {
        throw new BadRequestException('Le quartier spécifié n\'existe pas');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        neighborhoodId: finalNeighborhoodId,
      },
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updatePassword(id: string, updatePasswordDto: UpdateUserPasswordDto) {
    const { oldPassword, newPassword } = updatePasswordDto;

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash
      }
    });

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  async remove(id: string) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({
      where: { id }
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  async updateRole(id: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: role as any }, 
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async activateDeactivate(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        neighborhoodRelation: {
          include: {
            city: true
          }
        }
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      citizenUsers,
      agentUsers,
      supervisorUsers,
      adminUsers
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { role: 'CITIZEN' } }),
      this.prisma.user.count({ where: { role: 'AGENT' } }),
      this.prisma.user.count({ where: { role: 'SUPERVISOR' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } })
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      verified: verifiedUsers,
      inactive: totalUsers - activeUsers,
      unverified: totalUsers - verifiedUsers,
      byRole: {
        citizen: citizenUsers,
        agent: agentUsers,
        supervisor: supervisorUsers,
        admin: adminUsers
      }
    };
  }
}
