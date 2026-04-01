import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBinDto, UpdateBinDto, FilterBinsDto } from './dto/bin.dto';
import { BacType, BacStatus, ReportStatus } from '@prisma/client';

@Injectable()
export class BinsService {
  constructor(private prisma: PrismaService) {}

  async create(createBinDto: CreateBinDto) {
    const { 
      identifier, 
      type, 
      neighborhoodId, 
      latitude, 
      longitude, 
      locationDescription, 
      status, 
      capacity, 
      fillLevel, 
      statusReport 
    } = createBinDto;

    // Vérifier si le quartier existe
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id: neighborhoodId },
      include: {
        city: true
      }
    });

    if (!neighborhood) {
      throw new BadRequestException('Le quartier spécifié n\'existe pas');
    }

    // Vérifier si le refCode du bac existe déjà
    const existingBin = await this.prisma.bin.findUnique({
      where: { refCode: identifier }
    });

    if (existingBin) {
      throw new ConflictException('Un bac avec cet identifiant existe déjà');
    }

    const bin = await this.prisma.bin.create({
      data: {
        refCode: identifier,
        binType: type,
        neighborhoodId,
        capacityM3: capacity || 1.0,
        status: status || BacStatus.ACTIF,
        ...(statusReport && { statusReport }),
      },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        reports: {
          include: {
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    return bin;
  }

  async findAll(filters: FilterBinsDto) {
    const {
      type,
      status,
      statusReport,
      neighborhoodId,
      cityId,
      fillLevelAbove,
      search,
      page = '1',
      limit = '10'
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (type) where.binType = type;
    if (status) where.status = status;
    if (statusReport) where.statusReport = statusReport;
    if (neighborhoodId) where.neighborhoodId = neighborhoodId;
    
    if (cityId) {
      where.neighborhood = {
        cityId
      };
    }

    // Note: fillLevel n'existe pas dans le schéma, on l'ignore pour l'instant

    if (search) {
      where.OR = [
        { refCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [bins, total] = await Promise.all([
      this.prisma.bin.findMany({
        where,
        skip,
        take,
        include: {
          neighborhood: {
            include: {
              city: true
            }
          },
          reports: {
            include: {
              reporter: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 3
          },
          _count: {
            select: {
              reports: true
          }
        }
      },
      orderBy: {
        refCode: 'asc'
      }
    }),
      this.prisma.bin.count({ where })
    ]);

    return {
      data: bins,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async findOne(id: string) {
    const bin = await this.prisma.bin.findUnique({
      where: { id },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        reports: {
          include: {
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    if (!bin) {
      throw new NotFoundException('Bac non trouvé');
    }

    return bin;
  }

  async update(id: string, updateBinDto: UpdateBinDto) {
    const { 
      identifier, 
      type, 
      neighborhoodId, 
      latitude, 
      longitude, 
      locationDescription, 
      status, 
      capacity, 
      fillLevel, 
      statusReport 
    } = updateBinDto;

    // Vérifier si le bac existe
    const existingBin = await this.prisma.bin.findUnique({
      where: { id }
    });

    if (!existingBin) {
      throw new NotFoundException('Bac non trouvé');
    }

    // Vérifier si le quartier existe (si neighborhoodId est fourni)
    if (neighborhoodId) {
      const neighborhood = await this.prisma.neighborhood.findUnique({
        where: { id: neighborhoodId },
        include: {
          city: true
        }
      });

      if (!neighborhood) {
        throw new BadRequestException('Le quartier spécifié n\'existe pas');
      }
    }

    // Vérifier les conflits d'identifiant
    if (identifier && identifier !== existingBin.refCode) {
      const conflictBin = await this.prisma.bin.findUnique({
        where: { refCode: identifier }
      });

      if (conflictBin) {
        throw new ConflictException('Un bac avec cet identifiant existe déjà');
      }
    }

    const bin = await this.prisma.bin.update({
      where: { id },
      data: {
        refCode: identifier,
        binType: type,
        neighborhoodId,
        capacityM3: capacity,
        status: status as any,
        ...(statusReport && { statusReport }), // Cast pour éviter l'erreur de type
      },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        reports: {
          include: {
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    return bin;
  }

  async remove(id: string) {
    // Vérifier si le bac existe
    const bin = await this.prisma.bin.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    if (!bin) {
      throw new NotFoundException('Bac non trouvé');
    }

    // Vérifier si le bac a des rapports
    if (bin._count.reports > 0) {
      throw new ConflictException(
        'Impossible de supprimer ce bac car il contient des rapports'
      );
    }

    await this.prisma.bin.delete({
      where: { id }
    });

    return { message: 'Bac supprimé avec succès' };
  }

  async updateStatus(id: string, status: string) {
    const bin = await this.prisma.bin.findUnique({
      where: { id }
    });

    if (!bin) {
      throw new NotFoundException('Bac non trouvé');
    }

    const updatedBin = await this.prisma.bin.update({
      where: { id },
      data: { status: status as any }, // Cast pour éviter l'erreur de type
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    return updatedBin;
  }

  async findByNeighborhood(neighborhoodId: string) {
    // Vérifier si le quartier existe
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id: neighborhoodId },
      include: {
        city: true
      }
    });

    if (!neighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    const bins = await this.prisma.bin.findMany({
      where: { neighborhoodId },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        _count: {
          select: {
            reports: true
          }
        }
      },
      orderBy: {
        refCode: 'asc'
      }
    });

    return bins;
  }

  async getFullBins() {
    const bins = await this.prisma.bin.findMany({
      where: { 
        status: BacStatus.ACTIF 
      },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        _count: {
          select: {
            reports: true
          }
        }
      },
      orderBy: {
        refCode: 'asc'
      }
    });

    return bins;
  }

  async getStats() {
    const [
      totalBins,
      activeBins,
      fullBins,
      damagedBins,
      binsByType,
      binsByStatus
    ] = await Promise.all([
      this.prisma.bin.count(),
      this.prisma.bin.count({ where: { status: BacStatus.ACTIF } }),
      this.prisma.bin.count({ where: { status: BacStatus.DEBORDANT } }),
      this.prisma.bin.count({ where: { status: BacStatus.ENDOMMAGE } }),
      this.prisma.bin.groupBy({
        by: ['binType'],
        _count: {
          binType: true
        }
      }),
      this.prisma.bin.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })
    ]);

    const typeStats = binsByType.reduce((acc, item) => {
      acc[item.binType] = item._count.binType;
      return acc;
    }, {});

    const statusStats = binsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    return {
      total: totalBins,
      active: activeBins,
      full: fullBins,
      damaged: damagedBins,
      inactive: totalBins - activeBins,
      byType: typeStats,
      byStatus: statusStats
    };
  }
}
