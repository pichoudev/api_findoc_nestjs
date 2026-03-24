import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, FilterReportsDto } from './dto/report.dto';
import { ReportType, ReportStatus, Priority } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { NotificationEventType } from '../notifications/types/notification.types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  private readonly reportInclude = {
    bin: {
      include: {
        neighborhood: {
          include: {
            city: true,
          },
        },
      },
    },
    reporter: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    },
    intervention: {
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  } as const;

  // ─── CREATE REPORT ─────────────────────────────────────────────────────────────
  async create(createReportDto: CreateReportDto, userId: string, photoUrl?: string) {
    const { bacId, reportType, description, priority = Priority.MEDIUM } = createReportDto;

    // Vérifier que le bac existe
    const bin = await this.prisma.bin.findUnique({
      where: { id: bacId },
    });
    if (!bin) {
      throw new BadRequestException("Le bac spécifié n'existe pas");
    }

    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException("L'utilisateur spécifié n'existe pas");
    }

    // Générer un code de référence unique
    const referenceCode = await this.generateReferenceCode();

    try {
      const report = await this.prisma.report.create({
        data: {
          bacId,
          userId,
          reportType,
          description,
          referenceCode,
          photoUrl,
          status: ReportStatus.ASSIGNED,
          priority,
        },
        include: this.reportInclude,
      });

      // Émettre un événement de notification
      this.notificationService.emitEvent(NotificationEventType.REPORT_CREATED, {
        reportId: report.id,
        reporterId: userId,
        referenceCode: report.referenceCode,
        reportType: report.reportType,
        priority: report.priority,
        bacId: report.bacId,
      });

      return report;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Un signalement avec ces informations existe déjà');
        }
      }
      throw error;
    }
  }

  // ─── FIND ALL ────────────────────────────────────────────────────────────────
  async findAll(filters: FilterReportsDto) {
    const {
      reportType,
      status,
      priority,
      bacId,
      userId,
      search,
      page = '1',
      limit = '10',
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Prisma.ReportWhereInput = {};
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (bacId) where.bacId = bacId;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.reportInclude,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports,
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
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: this.reportInclude,
    });

    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    return report;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  async update(id: string, updateReportDto: UpdateReportDto, photoUrl?: string) {
    const { reportType, description, status, priority } = updateReportDto;

    const existingReport = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!existingReport) {
      throw new NotFoundException('Signalement non trouvé');
    }

    try {
      const report = await this.prisma.report.update({
        where: { id },
        data: {
          ...(reportType && { reportType }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(photoUrl && { photoUrl }),
        },
        include: this.reportInclude,
      });

      return report;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Un signalement avec ces informations existe déjà');
        }
      }
      throw error;
    }
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  async remove(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { intervention: true },
    });

    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    if (report.intervention) {
      throw new ConflictException(
        'Impossible de supprimer ce signalement car il a déjà une intervention assignée',
      );
    }

    await this.prisma.report.delete({ where: { id } });
    return { message: 'Signalement supprimé avec succès' };
  }

  // ─── FIND BY BIN ───────────────────────────────────────────────────────────
  async findByBin(bacId: string) {
    const bin = await this.prisma.bin.findUnique({
      where: { id: bacId },
    });
    if (!bin) {
      throw new NotFoundException('Bac non trouvé');
    }

    const reports = await this.prisma.report.findMany({
      where: { bacId },
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  // ─── FIND BY USER ───────────────────────────────────────────────────────────
  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const reports = await this.prisma.report.findMany({
      where: { userId },
      include: this.reportInclude,
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: ReportStatus) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: { status },
      include: this.reportInclude,
    });

    // Émettre un événement de notification pour le changement de statut
    this.notificationService.emitEvent(NotificationEventType.REPORT_STATUS_CHANGED, {
      reportId: updatedReport.id,
      reporterId: updatedReport.userId,
      referenceCode: updatedReport.referenceCode,
      status: updatedReport.status,
      reportType: updatedReport.reportType,
    });

    // Si le statut est COMPLETED, émettre un événement spécifique
    if (status === ReportStatus.COMPLETED) {
      this.notificationService.emitEvent(NotificationEventType.REPORT_COMPLETED, {
        reportId: updatedReport.id,
        reporterId: updatedReport.userId,
        referenceCode: updatedReport.referenceCode,
        reportType: updatedReport.reportType,
      });
    }

    return updatedReport;
  }

  // ─── GET USER STATS ───────────────────────────────────────────────────────────────
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const [
      totalReports,
      assignedReports,
      inProgressReports,
      completedReports,
      cancelledReports,
      reportsByType,
      reportsByStatus,
      reportsByPriority,
      recentReports,
    ] = await Promise.all([
      this.prisma.report.count({ where: { userId } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.ASSIGNED } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.IN_PROGRESS } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.COMPLETED } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.CANCELLED } }),
      this.prisma.report.groupBy({ 
        by: ['reportType'], 
        _count: { reportType: true },
        where: { userId }
      }),
      this.prisma.report.groupBy({ 
        by: ['status'], 
        _count: { status: true },
        where: { userId }
      }),
      this.prisma.report.groupBy({ 
        by: ['priority'], 
        _count: { priority: true },
        where: { userId }
      }),
      this.prisma.report.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: this.reportInclude,
      }),
    ]);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      stats: {
        total: totalReports,
        assigned: assignedReports,
        inProgress: inProgressReports,
        completed: completedReports,
        cancelled: cancelledReports,
        completionRate: totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0,
        byType: reportsByType.reduce<Record<string, number>>((acc, item) => {
          acc[item.reportType] = item._count.reportType;
          return acc;
        }, {}),
        byStatus: reportsByStatus.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {}),
        byPriority: reportsByPriority.reduce<Record<string, number>>((acc, item) => {
          acc[item.priority] = item._count.priority;
          return acc;
        }, {}),
      },
      recent: recentReports,
    };
  }

  // ─── GET STATS ─────────────────────────────────────────────────────────────
  async getStats() {
    const [
      totalReports,
      assignedReports,
      inProgressReports,
      completedReports,
      cancelledReports,
      reportsByType,
      reportsByStatus,
      reportsByPriority,
      recentReports,
    ] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: ReportStatus.ASSIGNED } }),
      this.prisma.report.count({ where: { status: ReportStatus.IN_PROGRESS } }),
      this.prisma.report.count({ where: { status: ReportStatus.COMPLETED } }),
      this.prisma.report.count({ where: { status: ReportStatus.CANCELLED } }),
      this.prisma.report.groupBy({ by: ['reportType'], _count: { reportType: true } }),
      this.prisma.report.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.report.groupBy({ by: ['priority'], _count: { priority: true } }),
      this.prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: this.reportInclude,
      }),
    ]);

    return {
      total: totalReports,
      assigned: assignedReports,
      inProgress: inProgressReports,
      completed: completedReports,
      cancelled: cancelledReports,
      byType: reportsByType.reduce<Record<string, number>>((acc, item) => {
        acc[item.reportType] = item._count.reportType;
        return acc;
      }, {}),
      byStatus: reportsByStatus.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      byPriority: reportsByPriority.reduce<Record<string, number>>((acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, {}),
      recent: recentReports,
    };
  }

  // ─── PRIVATE METHODS ─────────────────────────────────────────────────────────
  private async generateReferenceCode(): Promise<string> {
    const prefix = 'REP';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Compter le nombre de rapports cette année
    const count = await this.prisma.report.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    return `${prefix}-${year}-${sequence}`;
  }
}
