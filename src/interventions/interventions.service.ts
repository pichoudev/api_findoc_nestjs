import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterventionDto, UpdateInterventionDto, FilterInterventionsDto, AssignInterventionDto } from './dto/intervention.dto';
import { InterventionStatus, ReportStatus, BacStatus, ReportType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { NotificationEventType } from '../notifications/types/notification.types';

@Injectable()
export class InterventionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  private readonly interventionInclude = {
    report: {
      include: {
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
      },
    },
    agent: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    },
  } as const;

  // ─── CREATE INTERVENTION ─────────────────────────────────────────────────────────────
  async create(createInterventionDto: CreateInterventionDto) {
    const { reportId, agentId, comment } = createInterventionDto;

    // Vérifier que le signalement existe
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new BadRequestException("Le signalement spécifié n'existe pas");
    }

    // Vérifier que l'agent existe et a le bon rôle
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });
    if (!agent) {
      throw new BadRequestException("L'agent spécifié n'existe pas");
    }

    if (!['AGENT', 'SUPERVISOR', 'ADMIN'].includes(agent.role)) {
      throw new BadRequestException("L'utilisateur spécifié n'est pas un agent");
    }

    // Vérifier que le signalement n'a pas déjà une intervention
    const existingIntervention = await this.prisma.intervention.findUnique({
      where: { reportId },
    });
    if (existingIntervention) {
      throw new ConflictException('Ce signalement a déjà une intervention assignée');
    }

    try {
      const intervention = await this.prisma.intervention.create({
        data: {
          reportId,
          agentId,
          comment,
          status: InterventionStatus.EN_COURS,
        },
        include: this.interventionInclude,
      });

      // Mettre à jour le statut du signalement
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.EN_COURS },
      });

      // Émettre des événements de notification
      this.notificationService.emitEvent(NotificationEventType.INTERVENTION_ASSIGNED, {
        interventionId: intervention.id,
        agentId: agentId,
        reportId: reportId,
        referenceCode: intervention.report.referenceCode,
        priority: intervention.report.priority,
      });

      this.notificationService.emitEvent(NotificationEventType.REPORT_ASSIGNED, {
        reportId: reportId,
        agentId: agentId,
        referenceCode: intervention.report.referenceCode,
        priority: intervention.report.priority,
        reporterId: intervention.report.userId,
      });

      return intervention;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Une intervention avec ces informations existe déjà');
        }
      }
      throw error;
    }
  }

  // ─── FIND ALL ────────────────────────────────────────────────────────────────
  async findAll(filters: FilterInterventionsDto) {
    const {
      status,
      reportId,
      agentId,
      dateFrom,
      dateTo,
      search,
      page = '1',
      limit = '10',
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Prisma.InterventionWhereInput = {};
    if (status) where.status = status;
    if (reportId) where.reportId = reportId;
    if (agentId) where.agentId = agentId;
    if (dateFrom || dateTo) {
      where.assignedAt = {};
      if (dateFrom) {
        where.assignedAt = { ...where.assignedAt, gte: new Date(dateFrom) };
      }
      if (dateTo) {
        where.assignedAt = { ...where.assignedAt, lte: new Date(dateTo + 'T23:59:59.999Z') };
      }
    }
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [interventions, total] = await Promise.all([
      this.prisma.intervention.findMany({
        where,
        skip,
        take,
        orderBy: { assignedAt: 'desc' },
        include: this.interventionInclude,
      }),
      this.prisma.intervention.count({ where }),
    ]);

    return {
      data: interventions,
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
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
      include: this.interventionInclude,
    });

    if (!intervention) {
      throw new NotFoundException('Intervention non trouvée');
    }

    return intervention;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  async update(id: string, updateInterventionDto: UpdateInterventionDto) {
    const { status, comment, startedAt, completedAt } = updateInterventionDto;

    const existingIntervention = await this.prisma.intervention.findUnique({
      where: { id },
    });
    if (!existingIntervention) {
      throw new NotFoundException('Intervention non trouvée');
    }

    try {
      const intervention = await this.prisma.intervention.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(comment !== undefined && { comment }),
          ...(startedAt && { startedAt: new Date(startedAt) }),
          ...(completedAt && { completedAt: new Date(completedAt) }),
        },
        include: this.interventionInclude,
      });

      // Si l'intervention est terminée, mettre à jour le signalement et le bac
      if (status === InterventionStatus.RESOLU && completedAt) {
        const report = await this.prisma.report.findUnique({
          where: { id: existingIntervention.reportId },
          include: { bin: true }
        });

        if (report) {
          // Mettre à jour le statut du report à TERMINE
          await this.prisma.report.update({
            where: { id: existingIntervention.reportId },
            data: { status: ReportStatus.TERMINE },
          });

          // Mettre à jour le statut du bac à NORMAL
          if (report.bin) {
            await this.prisma.bin.update({
              where: { id: report.bin.id },
              data: { 
                status: BacStatus.ACTIF,
                statusReport: ReportStatus.RECU,
                reportType: ReportType.NORMAL
              },
            });
          }
        }
      }

      return intervention;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Une intervention avec ces informations existe déjà');
        }
      }
      throw error;
    }
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  async remove(id: string) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
    });

    if (!intervention) {
      throw new NotFoundException('Intervention non trouvée');
    }

    await this.prisma.intervention.delete({ where: { id } });
    return { message: 'Intervention supprimée avec succès' };
  }

  // ─── FIND BY REPORT ───────────────────────────────────────────────────────
  async findByReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    const intervention = await this.prisma.intervention.findMany({
      where: { reportId },
      include: this.interventionInclude,
      orderBy: { assignedAt: 'desc' },
    });

    return intervention;
  }

  // ─── FIND BY AGENT ───────────────────────────────────────────────────────
  async findByAgent(agentId: string, filters?: FilterInterventionsDto) {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent non trouvé');
    }

    const where: Prisma.InterventionWhereInput = { agentId };
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.assignedAt = {};
      if (filters.dateFrom) {
        where.assignedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.assignedAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
      }
    }

    const interventions = await this.prisma.intervention.findMany({
      where,
      include: this.interventionInclude,
      orderBy: { assignedAt: 'desc' },
    });

    return interventions;
  }

  // ─── ASSIGN INTERVENTION ───────────────────────────────────────────────────
  async assignIntervention(reportId: string, assignDto: AssignInterventionDto) {
    const { agentId, comment } = assignDto;

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Signalement non trouvé');
    }

    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent non trouvé');
    }

    if (!['AGENT', 'SUPERVISOR', 'ADMIN'].includes(agent.role)) {
      throw new BadRequestException("L'utilisateur spécifié n'est pas un agent");
    }

    const existingIntervention = await this.prisma.intervention.findUnique({
      where: { reportId },
    });

    if (existingIntervention) {
      throw new ConflictException('Ce signalement a déjà une intervention assignée');
    }

    const intervention = await this.prisma.intervention.create({
      data: {
        reportId,
        agentId,
        comment,
        status: InterventionStatus.EN_COURS,
      },
      include: this.interventionInclude,
    });

    // Mettre à jour le statut du signalement
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.EN_COURS },
    });

    return intervention;
  }

  // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: InterventionStatus, comment?: string) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
    });
    if (!intervention) {
      throw new NotFoundException('Intervention non trouvée');
    }

    const updateData: any = { status };
    if (comment !== undefined) {
      updateData.comment = comment;
    }

    // Mettre à jour les dates selon le statut
    if (status === InterventionStatus.EN_COURS && !intervention.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === InterventionStatus.RESOLU && !intervention.completedAt) {
      updateData.completedAt = new Date();
    }

    const updatedIntervention = await this.prisma.intervention.update({
      where: { id },
      data: updateData,
      include: this.interventionInclude,
    });

    // Émettre des événements de notification selon le statut
    if (status === InterventionStatus.EN_COURS) {
      this.notificationService.emitEvent(NotificationEventType.INTERVENTION_STARTED, {
        interventionId: updatedIntervention.id,
        agentId: updatedIntervention.agentId,
        reportId: updatedIntervention.reportId,
        referenceCode: updatedIntervention.report.referenceCode,
        reporterId: updatedIntervention.report.userId,
      });
    }

    if (status === InterventionStatus.RESOLU) {
      this.notificationService.emitEvent(NotificationEventType.INTERVENTION_COMPLETED, {
        interventionId: updatedIntervention.id,
        agentId: updatedIntervention.agentId,
        reportId: updatedIntervention.reportId,
        referenceCode: updatedIntervention.report.referenceCode,
        reporterId: updatedIntervention.report.userId,
      });
    }

    // Si l'intervention est terminée, mettre à jour le signalement et le bac
    if (status === InterventionStatus.RESOLU) {
      const report = await this.prisma.report.findUnique({
        where: { id: intervention.reportId },
        include: { bin: true }
      });

      if (report) {
        // Mettre à jour le statut du report à TERMINE
        await this.prisma.report.update({
          where: { id: intervention.reportId },
          data: { status: ReportStatus.TERMINE },
        });

        // Mettre à jour le statut du bac à NORMAL
        if (report.bin) {
          await this.prisma.bin.update({
            where: { id: report.bin.id },
            data: { 
              status: BacStatus.ACTIF,
              statusReport: ReportStatus.RECU,
              reportType: ReportType.NORMAL
            },
          });
        }
      }
    }

    return updatedIntervention;
  }

  // ─── GET STATS ─────────────────────────────────────────────────────────────
  async getStats() {
    const [
      totalInterventions,
      pendingInterventions,
      inProgressInterventions,
      resolvedInterventions,
      cancelledInterventions,
      interventionsByStatus,
      interventionsByAgent,
      recentInterventions,
    ] = await Promise.all([
      this.prisma.intervention.count(),
      this.prisma.intervention.count({ where: { status: InterventionStatus.EN_ATTENTE } }),
      this.prisma.intervention.count({ where: { status: InterventionStatus.EN_COURS } }),
      this.prisma.intervention.count({ where: { status: InterventionStatus.RESOLU } }),
      this.prisma.intervention.count({ where: { status: InterventionStatus.ANNULE } }),
      this.prisma.intervention.groupBy({ by: ['status'], _count: { status: true } }) as unknown as Array<{ status: string; _count: { status: number } }>,
      this.prisma.intervention.groupBy({ 
        by: ['agentId'], 
        _count: { agentId: true }, 
        take: 10,
        orderBy: { _count: { agentId: 'desc' } }
      }),
      this.prisma.intervention.findMany({
        take: 10,
        orderBy: { assignedAt: 'desc' },
        include: this.interventionInclude,
      }),
    ]);

    return {
      total: totalInterventions,
      pending: pendingInterventions,
      inProgress: inProgressInterventions,
      resolved: resolvedInterventions,
      cancelled: cancelledInterventions,
      resolutionRate: totalInterventions > 0 ? Math.round((resolvedInterventions / totalInterventions) * 100) : 0,
      byStatus: interventionsByStatus?.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}) || {},
      topAgents: interventionsByAgent.map((item: any) => ({
        agentId: item.agentId,
        count: item._count.agentId,
      })),
      recent: recentInterventions,
    };
  }
}
