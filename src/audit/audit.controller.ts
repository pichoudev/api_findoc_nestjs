import { 
  Controller, 
  Get, 
  Query, 
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Lister tous les logs d\'audit',
    description: 'Retourne tous les logs d\'audit avec pagination et filtres optionnels'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Logs d\'audit récupérés avec succès' })
  async findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (status) {
      // Le champ status n'existe pas, on filtre par action contenant le statut
      where.action = { contains: status, mode: 'insensitive' };
    }
    if (resource) where.entityType = resource;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Statistiques des logs d\'audit',
    description: 'Retourne des statistiques sur les logs d\'audit'
  })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    const [
      totalLogs,
      logsByAction,
      logsByResource,
      logsByUser,
      recentLogs
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      })
    ]);

    return {
      total: totalLogs,
      topActions: logsByAction.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      topResources: logsByResource.map(item => ({
        resource: (item as any).entityType,
        count: (item as any)._count.entityType || 0
      })),
      topUsers: logsByUser.map(item => ({
        userId: (item as any).userId,
        count: (item as any)._count.userId || 0
      })),
      recent: recentLogs
    };
  }
}
