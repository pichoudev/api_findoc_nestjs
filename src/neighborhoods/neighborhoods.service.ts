import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNeighborhoodDto, UpdateNeighborhoodDto, FilterNeighborhoodsDto } from './dto/neighborhood.dto';

@Injectable()
export class NeighborhoodsService {
  constructor(private prisma: PrismaService) {}

  async create(createNeighborhoodDto: CreateNeighborhoodDto) {
    const { name, cityId, isActive } = createNeighborhoodDto;

    // Vérifier si la ville existe
    const city = await this.prisma.city.findUnique({
      where: { id: cityId }
    });

    if (!city) {
      throw new BadRequestException('La ville spécifiée n\'existe pas');
    }

    // Vérifier si le quartier existe déjà dans cette ville
    const existingNeighborhood = await this.prisma.neighborhood.findFirst({
      where: {
        name,
        cityId
      }
    });

    if (existingNeighborhood) {
      throw new ConflictException('Un quartier avec ce nom existe déjà dans cette ville');
    }

    const neighborhood = await this.prisma.neighborhood.create({
      data: {
        name,
        cityId,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        city: true,
        bins: {
          include: {
            _count: {
              select: {
                reports: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            bins: true,
            users: true
          }
        }
      }
    });

    return neighborhood;
  }

  async findAll(filters: FilterNeighborhoodsDto) {
    const {
      cityId,
      isActive,
      search,
      page = '1',
      limit = '10'
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (cityId) where.cityId = cityId;
    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [neighborhoods, total] = await Promise.all([
      this.prisma.neighborhood.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          city: {
            select: {
              id: true,
              name: true,
              region: true
            }
          },
          bins: {
            include: {
              _count: {
                select: {
                  reports: true
                }
              }
            }
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          _count: {
            select: {
              bins: true,
              users: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      this.prisma.neighborhood.count({ where })
    ]);

    return {
      data: neighborhoods,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async findOne(id: string) {
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        city: {
          select: {
            id: true,
            name: true,
            region: true
          }
        },
        bins: {
          include: {
            _count: {
              select: {
                reports: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            bins: true,
            users: true
          }
        }
      }
    });

    if (!neighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    return neighborhood;
  }

  async update(id: string, updateNeighborhoodDto: UpdateNeighborhoodDto) {
    const { name, cityId, isActive } = updateNeighborhoodDto;

    // Vérifier si le quartier existe
    const existingNeighborhood = await this.prisma.neighborhood.findUnique({
      where: { id }
    });

    if (!existingNeighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    // Vérifier si la ville existe (si cityId est fourni)
    if (cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: cityId }
      });

      if (!city) {
        throw new BadRequestException('La ville spécifiée n\'existe pas');
      }
    }

    // Vérifier les conflits de nom
    if (name) {
      const conflictNeighborhood = await this.prisma.neighborhood.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { name },
            { cityId: cityId || existingNeighborhood.cityId }
          ]
        }
      });

      if (conflictNeighborhood) {
        throw new ConflictException('Un quartier avec ce nom existe déjà dans cette ville');
      }
    }

    const neighborhood = await this.prisma.neighborhood.update({
      where: { id },
      data: {
        name,
        cityId,
        isActive,
      },
      include: {
        city: true,
        bins: {
          include: {
            _count: {
              select: {
                reports: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            bins: true,
            users: true
          }
        }
      }
    });

    return neighborhood;
  }

  async remove(id: string) {
    // Vérifier si le quartier existe
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            bins: true
          }
        }
      }
    });

    if (!neighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    // Vérifier si le quartier a des dépendances
    const hasDependencies = neighborhood._count.users > 0 || 
                          neighborhood._count.bins > 0;

    if (hasDependencies) {
      throw new ConflictException(
        'Impossible de supprimer ce quartier car il contient des utilisateurs ou des bacs'
      );
    }

    await this.prisma.neighborhood.delete({
      where: { id }
    });

    return { message: 'Quartier supprimé avec succès' };
  }

  async activateDeactivate(id: string, isActive: boolean) {
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id }
    });

    if (!neighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    const updatedNeighborhood = await this.prisma.neighborhood.update({
      where: { id },
      data: { isActive },
      include: {
        city: true,
        bins: {
          include: {
            _count: {
              select: {
                reports: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            bins: true,
            users: true
          }
        }
      }
    });

    return updatedNeighborhood;
  }

  async findByCity(cityId: string) {
    // Vérifier si la ville existe
    const city = await this.prisma.city.findUnique({
      where: { id: cityId }
    });

    if (!city) {
      throw new NotFoundException('Ville non trouvée');
    }

    const neighborhoods = await this.prisma.neighborhood.findMany({
      where: { cityId },
      include: {
        city: true,
        _count: {
          select: {
            bins: true,
            users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return neighborhoods;
  }

  async getStats() {
    const [
      totalNeighborhoods,
      activeNeighborhoods,
      inactiveNeighborhoods,
      neighborhoodsByCity
    ] = await Promise.all([
      this.prisma.neighborhood.count(),
      this.prisma.neighborhood.count({ where: { isActive: true } }),
      this.prisma.neighborhood.count({ where: { isActive: false } }),
      this.prisma.neighborhood.groupBy({
        by: ['cityId'],
        _count: {
          cityId: true
        }
      })
    ]);

    // Récupérer les noms des villes
    const cityNames = await this.prisma.city.findMany({
      where: {
        id: {
          in: neighborhoodsByCity.map(item => item.cityId)
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    const cityStats = neighborhoodsByCity.reduce((acc, item) => {
      const city = cityNames.find(c => c.id === item.cityId);
      acc[city?.name || item.cityId] = item._count.cityId;
      return acc;
    }, {});

    return {
      total: totalNeighborhoods,
      active: activeNeighborhoods,
      inactive: inactiveNeighborhoods,
      byCity: cityStats
    };
  }
}
