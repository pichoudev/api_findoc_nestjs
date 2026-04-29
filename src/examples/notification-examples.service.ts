import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationType } from '@prisma/client';

/**
 * Service d'exemple montrant comment intégrer les notifications push
 * dans les services existants de l'application
 */
@Injectable()
export class NotificationExamplesService {
  private readonly logger = new Logger(NotificationExamplesService.name);

  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Exemple 1: Notification lors de la création d'un signalement
   */
  async notifyReportCreated(reportData: {
    id: string;
    reporterId: string;
    referenceCode: string;
    type: string;
    neighborhood: string;
    priority: string;
  }) {
    this.logger.log(`📝 Notification pour nouveau signalement: ${reportData.referenceCode}`);

    // Notifier le citoyen qui a créé le signalement
    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: reportData.reporterId,
        title: '🗑️ Signalement créé',
        body: `Votre signalement ${reportData.referenceCode} a été créé et est en cours de traitement`,
        data: {
          type: 'REPORT_CREATED',
          reportId: reportData.id,
          referenceCode: reportData.referenceCode,
          reportType: reportData.type,
        },
        url: `/reports/${reportData.id}`,
      },
      NotificationType.REPORT_RECEIVED,
      'report',
      reportData.id,
    );

    // Notifier les agents du quartier
    await this.pushNotificationService.sendNotificationToSegment(
      `agents_${reportData.neighborhood.toLowerCase().replace(/\s+/g, '_')}`,
      {
        title: '🚨 Nouveau signalement',
        body: `${reportData.type} signalé dans ${reportData.neighborhood} - Priorité: ${reportData.priority}`,
        data: {
          type: 'NEW_REPORT',
          reportId: reportData.id,
          referenceCode: reportData.referenceCode,
          reportType: reportData.type,
          neighborhood: reportData.neighborhood,
          priority: reportData.priority,
        },
        url: `/reports/${reportData.id}`,
      },
      NotificationType.REPORT_RECEIVED,
      'report',
      reportData.id,
    );
  }

  /**
   * Exemple 2: Notification lors de l'assignation d'une intervention
   */
  async notifyInterventionAssigned(interventionData: {
    id: string;
    agentId: string;
    reportId: string;
    binRefCode: string;
    reportType: string;
    reporterId: string;
  }) {
    this.logger.log(`🔧 Notification pour intervention assignée: ${interventionData.id}`);

    // Notifier l'agent assigné
    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: interventionData.agentId,
        title: '🔧 Nouvelle intervention',
        body: `Intervention assignée pour le bac ${interventionData.binRefCode} - ${interventionData.reportType}`,
        data: {
          type: 'INTERVENTION_ASSIGNED',
          interventionId: interventionData.id,
          reportId: interventionData.reportId,
          binRefCode: interventionData.binRefCode,
          reportType: interventionData.reportType,
        },
        url: `/interventions/${interventionData.id}`,
        priority: 'high',
        sound: 'alert',
      },
      NotificationType.REPORT_ASSIGNED,
      'intervention',
      interventionData.id,
    );

    // Notifier le citoyen que son signalement est pris en charge
    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: interventionData.reporterId,
        title: '✅ Intervention en cours',
        body: `Un agent a été assigné à votre signalement pour le bac ${interventionData.binRefCode}`,
        data: {
          type: 'INTERVENTION_STARTED',
          interventionId: interventionData.id,
          reportId: interventionData.reportId,
          binRefCode: interventionData.binRefCode,
        },
        url: `/reports/${interventionData.reportId}`,
      },
      NotificationType.REPORT_IN_PROGRESS,
      'intervention',
      interventionData.id,
    );
  }

  /**
   * Exemple 3: Notification lors du changement de statut d'un bac
   */
  async notifyBinStatusChanged(statusData: {
    binId: string;
    refCode: string;
    oldStatus: string;
    newStatus: string;
    neighborhood: string;
    reporterId?: string;
  }) {
    this.logger.log(`📊 Notification pour changement de statut du bac: ${statusData.refCode}`);

    const title = '🗑️ Mise à jour du bac';
    let body = `Le bac ${statusData.refCode} est maintenant ${statusData.newStatus.toLowerCase()}`;
    
    if (statusData.oldStatus && statusData.oldStatus !== statusData.newStatus) {
      body = `Le bac ${statusData.refCode} est passé de ${statusData.oldStatus.toLowerCase()} à ${statusData.newStatus.toLowerCase()}`;
    }

    // Notifier tous les citoyens du quartier
    await this.pushNotificationService.sendNotificationToSegment(
      `citizens_${statusData.neighborhood.toLowerCase().replace(/\s+/g, '_')}`,
      {
        title,
        body,
        data: {
          type: 'BIN_STATUS_CHANGED',
          binId: statusData.binId,
          refCode: statusData.refCode,
          oldStatus: statusData.oldStatus,
          newStatus: statusData.newStatus,
          neighborhood: statusData.neighborhood,
        },
        url: `/bins/${statusData.binId}`,
      },
      NotificationType.REPORT_IN_PROGRESS,
      'bin',
      statusData.binId,
    );

    // Notifier le reporter spécifique s'il existe
    if (statusData.reporterId) {
      await this.pushNotificationService.createAndSendPushNotification(
        {
          userId: statusData.reporterId,
          title,
          body,
          data: {
            type: 'BIN_STATUS_CHANGED',
            binId: statusData.binId,
            refCode: statusData.refCode,
            oldStatus: statusData.oldStatus,
            newStatus: statusData.newStatus,
          },
          url: `/bins/${statusData.binId}`,
        },
        NotificationType.REPORT_IN_PROGRESS,
        'bin',
        statusData.binId,
      );
    }
  }

  /**
   * Exemple 4: Notification de maintenance système
   */
  async notifySystemMaintenance(maintenanceData: {
    startTime: Date;
    endTime: Date;
    description: string;
    affectedServices: string[];
  }) {
    this.logger.log('🔧 Notification de maintenance système');

    // Notifier tous les utilisateurs actifs
    await this.pushNotificationService.sendNotificationToSegment(
      'all',
      {
        title: '🔧 Maintenance prévue',
        body: `Maintenance système le ${maintenanceData.startTime.toLocaleDateString()} de ${maintenanceData.startTime.toLocaleTimeString()} à ${maintenanceData.endTime.toLocaleTimeString()}`,
        data: {
          type: 'SYSTEM_MAINTENANCE',
          startTime: maintenanceData.startTime.toISOString(),
          endTime: maintenanceData.endTime.toISOString(),
          description: maintenanceData.description,
          affectedServices: maintenanceData.affectedServices,
        },
        url: '/maintenance',
        priority: 'normal',
      },
      NotificationType.REPORT_INACTIVE,
      'system',
      'maintenance',
    );
  }

  /**
   * Exemple 5: Notification d'urgence (zone critique)
   */
  async notifyCriticalZone(zoneData: {
    zoneId: string;
    zoneName: string;
    reportCount: number;
    averageResponseTime: number;
    priority: string;
  }) {
    this.logger.log(`🚨 Notification d'urgence pour la zone: ${zoneData.zoneName}`);

    // Notifier tous les agents et superviseurs
    const segments = ['agents', 'supervisors'];
    
    for (const segment of segments) {
      await this.pushNotificationService.sendNotificationToSegment(
        segment,
        {
          title: '🚨 Zone critique détectée',
          body: `La zone ${zoneData.zoneName} a ${zoneData.reportCount} signalements non traités. Temps de réponse moyen: ${zoneData.averageResponseTime}min`,
          data: {
            type: 'CRITICAL_ZONE',
            zoneId: zoneData.zoneId,
            zoneName: zoneData.zoneName,
            reportCount: zoneData.reportCount,
            averageResponseTime: zoneData.averageResponseTime,
            priority: zoneData.priority,
          },
          url: `/zones/${zoneData.zoneId}`,
          priority: 'high',
          sound: 'emergency',
          badge: 1,
        },
        NotificationType.CRITICAL_ZONE,
        'zone',
        zoneData.zoneId,
      );
    }
  }

  /**
   * Exemple 6: Notification de bienvenue pour nouvel utilisateur
   */
  async notifyWelcomeUser(userData: {
    id: string;
    firstName: string;
    email: string;
    role: string;
  }) {
    this.logger.log(`👋 Notification de bienvenue pour: ${userData.firstName}`);

    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: userData.id,
        title: '🎉 Bienvenue sur Cleaner !',
        body: `Bonjour ${userData.firstName} ! Merci de rejoindre notre plateforme de gestion des déchets.`,
        data: {
          type: 'WELCOME',
          userId: userData.id,
          role: userData.role,
        },
        url: '/dashboard',
        imageUrl: 'https://example.com/welcome-image.png',
      },
      NotificationType.REPORT_RECEIVED,
      'user',
      userData.id,
    );
  }

  /**
   * Exemple 7: Notification de rappel pour intervention non démarrée
   */
  async remindPendingIntervention(interventionData: {
    id: string;
    agentId: string;
    binRefCode: string;
    reportType: string;
    assignedAt: Date;
  }) {
    this.logger.log(`⏰ Rappel intervention: ${interventionData.id}`);

    const hoursSinceAssignment = Math.floor(
      (Date.now() - interventionData.assignedAt.getTime()) / (1000 * 60 * 60)
    );

    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: interventionData.agentId,
        title: '⏰ Intervention en attente',
        body: `L'intervention pour le bac ${interventionData.binRefCode} (${interventionData.reportType}) est en attente depuis ${hoursSinceAssignment}h`,
        data: {
          type: 'INTERVENTION_REMINDER',
          interventionId: interventionData.id,
          binRefCode: interventionData.binRefCode,
          reportType: interventionData.reportType,
          assignedAt: interventionData.assignedAt.toISOString(),
          hoursSinceAssignment,
        },
        url: `/interventions/${interventionData.id}`,
        priority: 'normal',
        sound: 'reminder',
      },
      NotificationType.REPORT_IN_PROGRESS,
      'intervention',
      interventionData.id,
    );
  }

  /**
   * Exemple 8: Notification de statistiques hebdomadaires
   */
  async notifyWeeklyStats(statsData: {
    userId: string;
    reportsCreated: number;
    interventionsCompleted: number;
    averageResponseTime: number;
    topNeighborhood: string;
  }) {
    this.logger.log(`📊 Notification statistiques pour utilisateur: ${statsData.userId}`);

    await this.pushNotificationService.createAndSendPushNotification(
      {
        userId: statsData.userId,
        title: '📊 Vos statistiques de la semaine',
        body: `${statsData.reportsCreated} signalements créés, ${statsData.interventionsCompleted} interventions complétées. Temps moyen: ${statsData.averageResponseTime}min`,
        data: {
          type: 'WEEKLY_STATS',
          reportsCreated: statsData.reportsCreated,
          interventionsCompleted: statsData.interventionsCompleted,
          averageResponseTime: statsData.averageResponseTime,
          topNeighborhood: statsData.topNeighborhood,
        },
        url: '/stats',
      },
      NotificationType.REPORT_RECEIVED,
      'stats',
      'weekly',
    );
  }
}
