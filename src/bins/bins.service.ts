import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBinDto, UpdateBinDto, FilterBinsDto } from './dto/bin.dto';
import { BacType, BacStatus, ReportStatus } from '@prisma/client';

@Injectable()
export class BinsService {
  constructor(private prisma: PrismaService) {}

  // Méthode pour construire la clause WHERE à partir des filtres
  private buildWhereClause(where: any): string {
    const conditions: string[] = [];
    
    if (where.binType) {
      conditions.push(`bin_type = '${where.binType}'`);
    }
    if (where.status) {
      conditions.push(`status = '${where.status}'`);
    }
    if (where.statusReport) {
      conditions.push(`status_report = '${where.statusReport}'`);
    }
    if (where.reportType) {
      conditions.push(`report_type = '${where.reportType}'`);
    }
    if (where.neighborhoodId) {
      conditions.push(`neighborhood_id = '${where.neighborhoodId}'`);
    }
    if (where.neighborhood) {
      conditions.push(`neighborhood_id = '${where.neighborhood.cityId}'`);
    }
    if (where.OR && where.OR.length > 0) {
      const orConditions = where.OR.map((condition: any) => {
        if (condition.refCode) {
          return `ref_code ILIKE '%${condition.refCode.contains}%'`;
        }
        return '';
      }).filter(c => c !== '');
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }
    
    return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  }

  // Méthode pour extraire les coordonnées du champ localisation (GEOGRAPHY)
  private extractCoordinates(localisation: any): { latitude: number; longitude: number } | null {
    console.log('DEBUG localisation:', localisation);
    console.log('DEBUG type:', typeof localisation);
    console.log('DEBUG JSON:', JSON.stringify(localisation));
    
    if (!localisation) return null;
    
    // Le champ localisation est stocké comme GEOGRAPHY(POINT,4326) en binaire PostGIS
    // Format binaire: Buffer hexadécimal comme "0101000020E6100000B81E85EB51782340F1F44A5986381040"
    if (typeof localisation === 'string' && localisation.startsWith('01')) {
      // C'est du WKB (Well-Known Binary) PostGIS
      console.log('DEBUG: Format WKB détecté');
      
      // Pour l'instant, retournons null car le décodage WKB est complexe
      // On pourrait utiliser une librairie comme 'wkx' pour décoder
      return null;
    }
    
    // Le champ localisation est stocké comme GEOGRAPHY(POINT,4326)
    // Format typique: "POINT(longitude latitude)" ou { x: longitude, y: latitude }
    if (typeof localisation === 'string') {
      // Format WKT: "POINT(longitude latitude)"
      const match = localisation.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
      console.log('DEBUG match:', match);
      if (match) {
        return {
          longitude: parseFloat(match[1]),
          latitude: parseFloat(match[2])
        };
      }
    } else if (typeof localisation === 'object' && localisation.x && localisation.y) {
      // Format objet: { x: longitude, y: latitude }
      return {
        longitude: localisation.x,
        latitude: localisation.y
      };
    }
    
    return null;
  }

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
      statusReport,
      reportType 
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

    // Créer le bac sans localisation d'abord
    const bin = await this.prisma.bin.create({
      data: {
        refCode: identifier,
        binType: type,
        neighborhoodId,
        capacityM3: capacity || 1.0,
        status: status || BacStatus.ACTIF,
        ...(statusReport && { statusReport }),
        ...(reportType && { reportType }),
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

    // Mettre à jour la localisation avec une requête SQL brute si latitude/longitude fournies
    if (latitude && longitude) {
      await this.prisma.$executeRaw`
        UPDATE bins 
        SET localisation = ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)
        WHERE id = ${bin.id}
      `;
      
      // Récupérer le bac avec la localisation mise à jour
      const updatedBin = await this.prisma.bin.findUnique({
        where: { id: bin.id },
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
      
      return updatedBin;
    }

    return bin;
  }

  async findAll(filters: FilterBinsDto) {
    const {
      type,
      status,
      statusReport,
      reportType,
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
    if (reportType) where.reportType = reportType;
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
      this.prisma.$queryRaw`
        SELECT 
          id,
          ref_code as "refCode",
          bin_type as "binType",
          status,
          status_report as "statusReport",
          report_type as "reportType",
          capacity_m3 as "capacityM3",
          ST_AsText(localisation) as "localisationText",
          neighborhood_id as "neighborhoodId",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM bins 
        WHERE ${Object.keys(where).length > 0 ? this.buildWhereClause(where) : 'TRUE'}
        ORDER BY ref_code ASC
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM bins 
        WHERE ${Object.keys(where).length > 0 ? this.buildWhereClause(where) : 'TRUE'}
      `
    ]);

    // Récupérer les relations séparément
    const binsWithRelations = await Promise.all(
      (bins as any[]).map(async (bin: any) => {
        const neighborhood = bin.neighborhoodId ? 
          await this.prisma.neighborhood.findUnique({
            where: { id: bin.neighborhoodId },
            include: { city: true }
          }) : null;

        const reports = await this.prisma.report.findMany({
          where: { bacId: bin.id },
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
          orderBy: { createdAt: 'desc' },
          take: 3
        });

        const reportsCount = await this.prisma.report.count({
          where: { bacId: bin.id }
        });

        // Extraire les coordonnées du texte WKT
        const coordinates = this.extractCoordinates(bin.localisationText);
        
        return {
          ...bin,
          neighborhood,
          reports,
          _count: { reports: reportsCount },
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null
        };
      })
    );

    return {
      data: binsWithRelations,
      meta: {
        total: Number((total as any)[0]?.count || 0),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(Number((total as any)[0]?.count || 0) / parseInt(limit))
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
      statusReport,
      reportType 
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

    // Mettre à jour le bac sans localisation d'abord
    const bin = await this.prisma.bin.update({
      where: { id },
      data: {
        refCode: identifier,
        binType: type,
        neighborhoodId,
        capacityM3: capacity,
        status: status as any,
        ...(statusReport && { statusReport }), // Cast pour éviter l'erreur de type
        ...(reportType && { reportType }), // Ajout du reportType
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

    // Mettre à jour la localisation avec une requête SQL brute si latitude/longitude fournies
    if (latitude && longitude) {
      await this.prisma.$executeRaw`
        UPDATE bins 
        SET localisation = ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)
        WHERE id = ${bin.id}
      `;
      
      // Récupérer le bac avec la localisation mise à jour
      const updatedBin = await this.prisma.bin.findUnique({
        where: { id: bin.id },
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
      
      return updatedBin;
    }

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

  async findByNeighborhoodName(neighborhoodName: string) {
    // Vérifier si le quartier existe par nom
    const neighborhood = await this.prisma.neighborhood.findFirst({
      where: {
        name: {
          equals: neighborhoodName,
          mode: 'insensitive'
        }
      },
      include: {
        city: true
      }
    });

    if (!neighborhood) {
      throw new NotFoundException('Quartier non trouvé');
    }

    const bins = await this.prisma.bin.findMany({
      where: { neighborhoodId: neighborhood.id },
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
      }
    });

    // Extraire les coordonnées (le champ localisation est Unsupported, on retourne null)
    const binsWithCoordinates = bins.map(bin => {
      return {
        ...bin,
        latitude: null,  // localisation Unsupported ne peut pas être extraite
        longitude: null
      };
    });

    return binsWithCoordinates;
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
