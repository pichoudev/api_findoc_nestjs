import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, FilterReportsDto } from './dto/report.dto';
import { ReportType, ReportStatus, Priority } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { NotificationEventType } from '../notifications/types/notification.types';
import { Request } from 'express';

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
  async create(createReportDto: CreateReportDto, userId: string, photoUrl?: string, req?: Request) {
    const { bacId, reportType, description, priority = Priority.MEDIUM, locationUser } = createReportDto;

    // Récupérer l'IP depuis la requête
    let clientIp: string | null = null;
    if (req) {
      // Essayer différents en-têtes pour l'IP (proxies, load balancers, etc.)
      const forwardedFor = req.headers['x-forwarded-for'] as string;
      const realIp = req.headers['x-real-ip'] as string;
      const connectionIp = req.connection?.remoteAddress;
      const socketIp = req.socket?.remoteAddress;
      const reqIp = req.ip;
      
      clientIp = forwardedFor || realIp || connectionIp || socketIp || reqIp || null;
      
      // Si c'est une liste d'IPs (x-forwarded-for), prendre la première
      if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
      }
      
      // Nettoyer l'IP (enlever ::ffff: pour IPv6)
      if (clientIp && clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }
    }

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
      const result = await this.prisma.$transaction(async (tx) => {
        // Créer le signalement
        const report = await tx.report.create({
          data: {
            bacId,
            userId,
            reportType,
            description,
            referenceCode,
            photoUrl,
            status: ReportStatus.RECU,
            priority,
            adresseIp: clientIp || undefined,
            locationUser: locationUser || undefined,
          },
          include: this.reportInclude,
        });

        // Mettre à jour le reportType du bac avec la valeur du signalement
        await tx.bin.update({
          where: { id: bacId },
          data: { reportType: reportType as ReportType },
        });

        return report;
      });

      // Émettre un événement de notification
      this.notificationService.emitEvent(NotificationEventType.REPORT_CREATED, {
        reportId: result.id,
        reporterId: userId,
        referenceCode: result.referenceCode,
        reportType: result.reportType,
        priority: result.priority,
        bacId: result.bacId,
      });

      return result;
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
    const { reportType, description, status, priority, locationUser } = updateReportDto;

    const existingReport = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!existingReport) {
      throw new NotFoundException('Signalement non trouvé');
    }

    try {
      const report = await this.prisma.$transaction(async (tx) => {
        // Mettre à jour le signalement
        const updatedReport = await tx.report.update({
          where: { id },
          data: {
            ...(reportType && { reportType }),
            ...(description !== undefined && { description }),
            ...(status && { status }),
            ...(priority && { priority }),
            ...(locationUser !== undefined && { locationUser }),
            ...(photoUrl && { photoUrl }),
          },
          include: this.reportInclude,
        });

        // Si le statut a changé, synchroniser le statusReport du bac
        if (status) {
          await tx.bin.update({
            where: { id: updatedReport.bacId },
            data: { statusReport: status },
          });
        }

        return updatedReport;
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

    const updatedReport = await this.prisma.$transaction(async (tx) => {
      // Mettre à jour le statut du signalement
      const report = await tx.report.update({
        where: { id },
        data: { status },
        include: this.reportInclude,
      });

      // Synchroniser le statusReport du bac
      await tx.bin.update({
        where: { id: report.bacId },
        data: { statusReport: status },
      });

      return report;
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
    if (status === ReportStatus.TERMINE) {
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
      this.prisma.report.count({ where: { userId, status: ReportStatus.ASSIGNE } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.EN_COURS } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.TERMINE } }),
      this.prisma.report.count({ where: { userId, status: ReportStatus.ANNULE } }),
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
      this.prisma.report.count({ where: { status: ReportStatus.ASSIGNE } }),
      this.prisma.report.count({ where: { status: ReportStatus.EN_COURS } }),
      this.prisma.report.count({ where: { status: ReportStatus.TERMINE } }),
      this.prisma.report.count({ where: { status: ReportStatus.ANNULE } }),
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

  // ─── SYNC BIN STATUS REPORT ─────────────────────────────────────────────────────
  /**
   * Synchronise le statusReport d'un bac avec le statut le plus récent de ses signalements
   */
  async syncBinStatusReport(bacId: string): Promise<void> {
    // Récupérer le signalement le plus récent pour ce bac
    const latestReport = await this.prisma.report.findFirst({
      where: { bacId },
      orderBy: { createdAt: 'desc' },
      select: { status: true }
    });

    if (latestReport) {
      await this.prisma.bin.update({
        where: { id: bacId },
        data: { statusReport: latestReport.status }
      });
    }
  }

  /**
   * Synchronise tous les statusReport des bacs avec leurs signalements les plus récents
   */
  async syncAllBinStatusReports(): Promise<void> {
    const bins = await this.prisma.bin.findMany({
      select: { id: true }
    });

    await Promise.all(
      bins.map(bin => this.syncBinStatusReport(bin.id))
    );
  }

  // ─── CANCEL REPORT ───────────────────────────────────────────────────────────────
  /**
   * Annule un signalement et remet le reportType du bac à NORMAL
   */
  async cancelReport(reportId: string, userId: string): Promise<any> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        bin: true
      }
    });

    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    console.log('DEBUG - Report details:', {
      reportId: report.id,
      reportUserId: report.userId,
      reportStatus: report.status,
      reportType: report.reportType,
      bacId: report.bacId
    });

    // Vérifier que l'utilisateur est bien l'auteur du signalement ou un admin/agent
    console.log('DEBUG - Comparaison userId:', {
      reportUserId: report.userId,
      requestUserId: userId,
      areEqual: report.userId === userId
    });
    
    // if (report.userId !== userId) {
    //   throw new ForbiddenException('Vous ne pouvez annuler que vos propres signalements');
    // }

    // Vérifier que le signalement n'est pas déjà terminé ou annulé
    if (report.status === 'TERMINE' || report.status === 'ANNULE') {
      throw new BadRequestException('Ce signalement ne peut plus être annulé');
    }

    // Utiliser une transaction pour annuler le signalement et mettre à jour le bac
    const result = await this.prisma.$transaction(async (tx) => {
      // Mettre à jour le statut du signalement
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'ANNULE',
          updatedAt: new Date()
        },
        include: this.reportInclude
      });

      // Remettre le reportType du bac à NORMAL
      await tx.bin.update({
        where: { id: report.bacId },
        data: { reportType: 'NORMAL' }
      });

      return updatedReport;
    });

    // Émettre un événement de notification pour l'annulation
    this.notificationService.emitEvent(NotificationEventType.REPORT_CANCELLED, {
      reportId: result.id,
      reporterId: userId,
      referenceCode: result.referenceCode,
      reportType: result.reportType,
      priority: result.priority,
      bacId: result.bacId,
    });

    return result;
  }
}
