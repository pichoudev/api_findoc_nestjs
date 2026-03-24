import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto, UpdateCityDto, FilterCitiesDto } from './dto/city.dto';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  // ─── Include réutilisable ────────────────────────────────────────────────────
  private readonly cityInclude = {
    neighborhoods: {
      include: {
        _count: {
          select: { bins: true },
        },
      },
    },
    _count: {
      select: { neighborhoods: true },
    },
  } as const;

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  async create(createCityDto: CreateCityDto) {
    const { name, region } = createCityDto; // ✅ country / postalCode / isActive supprimés (absents du schéma)

    const existingCity = await this.prisma.city.findFirst({
      where: { name, region: region ?? 'LITTORAL' },
    });

    if (existingCity) {
      throw new ConflictException(
        'Une ville avec ce nom existe déjà dans cette région',
      );
    }

    return this.prisma.city.create({
      data: { name, region: region ?? 'LITTORAL' },
      include: this.cityInclude, // ✅ _count dans include, pas au top-level
    });
  }

  // ─── FIND ALL ────────────────────────────────────────────────────────────────
  async findAll(filters: FilterCitiesDto) {
    const { region, search, page = '1', limit = '10' } = filters; // ✅ isActive supprimé

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (region) where.region = region;

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [cities, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' }, // ✅ orderBy au bon niveau (top-level de findMany)
        include: this.cityInclude, // ✅ _count dans include
      }),                          // ✅ parenthèse fermante correcte
      this.prisma.city.count({ where }),
    ]);

    return {
      data: cities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  // ─── FIND ONE ────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: this.cityInclude, // ✅ _count dans include
    });

    if (!city) throw new NotFoundException('Ville non trouvée');

    return city;
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  async update(id: string, updateCityDto: UpdateCityDto) {
    const { name, region } = updateCityDto; // ✅ country / postalCode / isActive supprimés

    const existingCity = await this.prisma.city.findUnique({ where: { id } });
    if (!existingCity) throw new NotFoundException('Ville non trouvée');

    if (name) {
      const conflictCity = await this.prisma.city.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { name },
            { region: region ?? existingCity.region },
          ],
        },
      });

      if (conflictCity) {
        throw new ConflictException(
          'Une ville avec ce nom existe déjà dans cette région',
        );
      }
    }

    return this.prisma.city.update({
      where: { id },
      data: { name, region: region ?? existingCity.region },
      include: this.cityInclude, // ✅ _count dans include
    });
  }

  // ─── REMOVE ──────────────────────────────────────────────────────────────────
  async remove(id: string) {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: this.cityInclude, // ✅ _count dans include
    });

    if (!city) throw new NotFoundException('Ville non trouvée');

    if (city._count.neighborhoods > 0) {
      throw new ConflictException(
        'Impossible de supprimer cette ville car elle contient des quartiers',
      );
    }

    await this.prisma.city.delete({ where: { id } });

    return { message: 'Ville supprimée avec succès' };
  }

  // ─── STATS ───────────────────────────────────────────────────────────────────
  async getStats() {
    const [totalCities, citiesByRegion] = await Promise.all([
      this.prisma.city.count(),
      this.prisma.city.groupBy({
        by: ['region'],
        _count: { region: true },
      }),
    ]);

    const byRegion = citiesByRegion.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.region] = item._count.region;
        return acc;
      },
      {},
    );

    return { total: totalCities, byRegion };
  }
}