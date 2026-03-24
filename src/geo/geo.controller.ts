import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BinsService } from '../bins/bins.service';
import { NeighborhoodsService } from '../neighborhoods/neighborhoods.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('geo')
@Controller('geo')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GeoController {
  constructor(
    private readonly binsService: BinsService,
    private readonly neighborhoodsService: NeighborhoodsService,
  ) {}

  @Get('bins')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ 
    summary: 'Générer un GeoJSON de tous les bacs pour geojson.io',
    description: 'Retourne tous les bacs avec leurs coordonnées au format GeoJSON. Copiez-collez le résultat sur geojson.io pour visualiser.'
  })
  @ApiResponse({ status: 200, description: 'GeoJSON des bacs généré avec succès' })
  async getBinsGeoJson() {
    const bins = await this.binsService.findAll({ page: '1', limit: '1000' });
    
    const features = bins.data.map(bin => ({
      type: 'Feature',
      properties: {
        id: bin.id,
        refCode: bin.refCode,
        binType: bin.binType,
        status: bin.status,
        capacityM3: bin.capacityM3,
        neighborhood: bin.neighborhood?.name,
        city: bin.neighborhood?.city?.name,
        reportsCount: bin._count?.reports || 0
      },
      geometry: {
        type: 'Point',
        coordinates: [(bin as any).longitude || 0, (bin as any).latitude || 0]
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  @Get('neighborhoods')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ 
    summary: 'Générer un GeoJSON de tous les quartiers pour geojson.io',
    description: 'Retourne tous les quartiers au format GeoJSON. Copiez-collez le résultat sur geojson.io pour visualiser.'
  })
  @ApiResponse({ status: 200, description: 'GeoJSON des quartiers généré avec succès' })
  async getNeighborhoodsGeoJson() {
    const neighborhoods = await this.neighborhoodsService.findAll({ page: '1', limit: '1000' });
    
    const features = neighborhoods.data.map(neighborhood => ({
      type: 'Feature',
      properties: {
        id: neighborhood.id,
        name: neighborhood.name,
        city: neighborhood.city?.name,
        region: neighborhood.city?.region,
        binsCount: neighborhood._count?.bins || 0,
        usersCount: neighborhood._count?.users || 0
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] // Placeholder - nécessite données réelles
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  @Get('all')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN')
  @ApiOperation({ 
    summary: 'Générer un GeoJSON complet (bacs + quartiers) pour geojson.io',
    description: 'Retourne tous les bacs et quartiers au format GeoJSON. Copiez-collez le résultat sur geojson.io pour visualiser tout sur une seule carte.'
  })
  @ApiResponse({ status: 200, description: 'GeoJSON complet généré avec succès' })
  async getAllGeoJson() {
    const [bins, neighborhoods] = await Promise.all([
      this.binsService.findAll({ page: '1', limit: '1000' }),
      this.neighborhoodsService.findAll({ page: '1', limit: '1000' })
    ]);

    const binFeatures = bins.data.map(bin => ({
      type: 'Feature',
      properties: {
        type: 'bin',
        id: bin.id,
        refCode: bin.refCode,
        binType: bin.binType,
        status: bin.status,
        capacityM3: bin.capacityM3,
        neighborhood: bin.neighborhood?.name,
        city: bin.neighborhood?.city?.name,
        reportsCount: bin._count?.reports || 0
      },
      geometry: {
        type: 'Point',
        coordinates: [(bin as any).longitude || 0, (bin as any).latitude || 0]
      }
    }));

    const neighborhoodFeatures = neighborhoods.data.map(neighborhood => ({
      type: 'Feature',
      properties: {
        type: 'neighborhood',
        id: neighborhood.id,
        name: neighborhood.name,
        city: neighborhood.city?.name,
        region: neighborhood.city?.region,
        binsCount: neighborhood._count?.bins || 0,
        usersCount: neighborhood._count?.users || 0
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] // Placeholder - nécessite données réelles
      }
    }));

    return {
      type: 'FeatureCollection',
      features: [...binFeatures, ...neighborhoodFeatures]
    };
  }
}
