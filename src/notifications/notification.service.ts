import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEvent, NotificationEventType, NotificationPayload, NotificationTemplate } from './types/notification.types';
import { NotificationType } from '@prisma/client';
import { EventEmitter } from 'events';

@Injectable()
export class NotificationService extends EventEmitter {
  private readonly appLogger: Logger;
  private templates: Map<NotificationEventType, NotificationTemplate> = new Map();

  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
    this.appLogger = new Logger(NotificationService.name);
    this.initializeTemplates();
    this.setupEventListeners();
  }

  // ─── INITIALIZATION ─────────────────────────────────────────────────────────────
  private initializeTemplates() {
    // Report templates
    this.templates.set(NotificationEventType.REPORT_CREATED, {
      type: NotificationEventType.REPORT_CREATED,
      title: '🗑️ Signalement enregistré',
      body: 'Votre signalement {{referenceCode}} pour un bac {{reportType}} a été reçu. Priorité: {{priority}}. Nous traitons votre demande.',
      getRecipients: (data) => [data.reporterId],
      getEntityInfo: (data) => ({ entityType: 'report', entityId: data.reportId }),
    });

    this.templates.set(NotificationEventType.REPORT_ASSIGNED, {
      type: NotificationEventType.REPORT_ASSIGNED,
      title: 'Signalement assigné',
      body: 'Le signalement {{referenceCode}} vous a été assigné. Priorité: {{priority}}.',
      getRecipients: (data) => [data.agentId],
      getEntityInfo: (data) => ({ entityType: 'report', entityId: data.reportId }),
    });

    this.templates.set(NotificationEventType.REPORT_STATUS_CHANGED, {
      type: NotificationEventType.REPORT_STATUS_CHANGED,
      title: 'Statut du signalement mis à jour',
      body: 'Votre signalement {{referenceCode}} est maintenant {{status}}.',
      getRecipients: (data) => [data.reporterId],
      getEntityInfo: (data) => ({ entityType: 'report', entityId: data.reportId }),
    });

    this.templates.set(NotificationEventType.REPORT_COMPLETED, {
      type: NotificationEventType.REPORT_COMPLETED,
      title: 'Signalement résolu',
      body: 'Votre signalement {{referenceCode}} a été résolu avec succès. Merci de votre signalement !',
      getRecipients: (data) => [data.reporterId],
      getEntityInfo: (data) => ({ entityType: 'report', entityId: data.reportId }),
    });

    // Intervention templates
    this.templates.set(NotificationEventType.INTERVENTION_ASSIGNED, {
      type: NotificationEventType.INTERVENTION_ASSIGNED,
      title: 'Nouvelle intervention assignée',
      body: 'Une nouvelle intervention vous a été assignée pour le signalement {{referenceCode}}.',
      getRecipients: (data) => [data.agentId],
      getEntityInfo: (data) => ({ entityType: 'intervention', entityId: data.interventionId }),
    });

    this.templates.set(NotificationEventType.INTERVENTION_STARTED, {
      type: NotificationEventType.INTERVENTION_STARTED,
      title: 'Intervention démarrée',
      body: 'L\'agent a démarré l\'intervention pour votre signalement {{referenceCode}}.',
      getRecipients: (data) => [data.reporterId],
      getEntityInfo: (data) => ({ entityType: 'intervention', entityId: data.interventionId }),
    });

    this.templates.set(NotificationEventType.INTERVENTION_STATUS_CHANGED, {
      type: NotificationEventType.INTERVENTION_STATUS_CHANGED,
      title: 'Statut d\'intervention mis à jour',
      body: 'Le statut de votre intervention {{referenceCode}} est maintenant : {{status}}.',
      getRecipients: (data) => [data.reporterId, data.agentId],
      getEntityInfo: (data) => ({ entityType: 'intervention', entityId: data.interventionId }),
    });

    this.templates.set(NotificationEventType.INTERVENTION_COMPLETED, {
      type: NotificationEventType.INTERVENTION_COMPLETED,
      title: 'Intervention terminée',
      body: 'L\'intervention pour votre signalement {{referenceCode}} a été terminée avec succès.',
      getRecipients: (data) => [data.reporterId],
      getEntityInfo: (data) => ({ entityType: 'intervention', entityId: data.interventionId }),
    });

    // User templates
    this.templates.set(NotificationEventType.USER_PROFILE_UPDATED, {
      type: NotificationEventType.USER_PROFILE_UPDATED,
      title: 'Profil mis à jour',
      body: 'Votre profil a été mis à jour avec succès.',
      getRecipients: (data) => [data.userId],
      getEntityInfo: (data) => ({ entityType: 'user', entityId: data.userId }),
    });

    this.templates.set(NotificationEventType.USER_PASSWORD_CHANGED, {
      type: NotificationEventType.USER_PASSWORD_CHANGED,
      title: 'Mot de passe modifié',
      body: 'Votre mot de passe a été modifié avec succès. Si ce n\'était pas vous, contactez le support.',
      getRecipients: (data) => [data.userId],
      getEntityInfo: (data) => ({ entityType: 'user', entityId: data.userId }),
    });

    this.templates.set(NotificationEventType.USER_PASSWORD_RESET, {
      type: NotificationEventType.USER_PASSWORD_RESET,
      title: 'Réinitialisation du mot de passe',
      body: 'Votre mot de passe a été réinitialisé. Utilisez le lien envoyé par email pour définir un nouveau mot de passe.',
      getRecipients: (data) => [data.userId],
      getEntityInfo: (data) => ({ entityType: 'user', entityId: data.userId }),
    });

    this.templates.set(NotificationEventType.USER_EMAIL_VERIFIED, {
      type: NotificationEventType.USER_EMAIL_VERIFIED,
      title: 'Email vérifié',
      body: 'Votre adresse email a été vérifiée avec succès. Bienvenue dans CleanConnect !',
      getRecipients: (data) => [data.userId],
      getEntityInfo: (data) => ({ entityType: 'user', entityId: data.userId }),
    });

    // System templates
    this.templates.set(NotificationEventType.CRITICAL_ZONE_ALERT, {
      type: NotificationEventType.CRITICAL_ZONE_ALERT,
      title: 'Alerte zone critique',
      body: 'Attention : La zone {{zoneName}} présente un niveau critique de signalements non traités.',
      getRecipients: (data) => data.agentIds || [],
      getEntityInfo: (data) => ({ entityType: 'zone', entityId: data.zoneId }),
    });

    this.templates.set(NotificationEventType.WELCOME_MESSAGE, {
      type: NotificationEventType.WELCOME_MESSAGE,
      title: 'Bienvenue sur CleanConnect !',
      body: 'Bienvenue {{firstName}} ! Merci de rejoindre notre plateforme de gestion des déchets.',
      getRecipients: (data) => [data.userId],
      getEntityInfo: (data) => ({ entityType: 'user', entityId: data.userId }),
    });
  }

  private setupEventListeners() {
    this.on(NotificationEventType.REPORT_CREATED, this.handleReportCreated.bind(this));
    this.on(NotificationEventType.REPORT_ASSIGNED, this.handleReportAssigned.bind(this));
    this.on(NotificationEventType.REPORT_STATUS_CHANGED, this.handleReportStatusChanged.bind(this));
    this.on(NotificationEventType.REPORT_COMPLETED, this.handleReportCompleted.bind(this));
    this.on(NotificationEventType.INTERVENTION_ASSIGNED, this.handleInterventionAssigned.bind(this));
    this.on(NotificationEventType.INTERVENTION_STARTED, this.handleInterventionStarted.bind(this));
    this.on(NotificationEventType.INTERVENTION_STATUS_CHANGED, this.handleInterventionStatusChanged.bind(this));
    this.on(NotificationEventType.INTERVENTION_COMPLETED, this.handleInterventionCompleted.bind(this));
    this.on(NotificationEventType.USER_PROFILE_UPDATED, this.handleUserProfileUpdated.bind(this));
    this.on(NotificationEventType.USER_PASSWORD_CHANGED, this.handleUserPasswordChanged.bind(this));
    this.on(NotificationEventType.USER_PASSWORD_RESET, this.handleUserPasswordReset.bind(this));
    this.on(NotificationEventType.USER_EMAIL_VERIFIED, this.handleUserEmailVerified.bind(this));
  }

  // ─── EVENT EMITTER ───────────────────────────────────────────────────────────────
  emitEvent(type: NotificationEventType, data: any) {
    const event: NotificationEvent = {
      type,
      data,
      timestamp: new Date(),
    };
    
    this.appLogger.log(`Emitting event: ${type}`, data);
    this.emit(type, event);
  }

  // ─── EVENT HANDLERS ─────────────────────────────────────────────────────────────
  private async handleReportCreated(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleReportAssigned(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleReportStatusChanged(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleReportCompleted(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleInterventionAssigned(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleInterventionStarted(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleInterventionStatusChanged(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleInterventionCompleted(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleUserProfileUpdated(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleUserPasswordChanged(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleUserPasswordReset(event: NotificationEvent) {
    await this.processNotification(event);
  }

  private async handleUserEmailVerified(event: NotificationEvent) {
    await this.processNotification(event);
  }

  // ─── NOTIFICATION PROCESSING ─────────────────────────────────────────────────────
  private async processNotification(event: NotificationEvent) {
    try {
      const template = this.templates.get(event.type);
      if (!template) {
        this.appLogger.warn(`No template found for event type: ${event.type}`);
        return;
      }

      const recipients = template.getRecipients(event.data);
      const entityInfo = template.getEntityInfo(event.data);

      // Process each recipient
      for (const userId of recipients) {
        const payload = this.buildNotificationPayload(template, event.data, userId, entityInfo);
        await this.createNotification(payload);
      }

      this.appLogger.log(`Processed ${recipients.length} notifications for event: ${event.type}`);
    } catch (error) {
      this.appLogger.error(`Error processing notification for event ${event.type}:`, error);
    }
  }

  private buildNotificationPayload(
    template: NotificationTemplate,
    data: any,
    userId: string,
    entityInfo: { entityType?: string; entityId?: string }
  ): NotificationPayload {
    const title = this.interpolate(template.title, data);
    const body = this.interpolate(template.body, data);

    return {
      userId,
      type: template.type as NotificationEventType,
      title,
      body,
      entityType: entityInfo.entityType,
      entityId: entityInfo.entityId,
      metadata: data,
    };
  }

  private interpolate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // ─── DATABASE OPERATIONS ───────────────────────────────────────────────────────
  async createNotification(payload: NotificationPayload) {
    try {
      // Mapping simple des types de notification
      let notificationType: NotificationType;
      
      switch (payload.type as NotificationEventType) {
        case NotificationEventType.REPORT_CREATED:
          notificationType = NotificationType.REPORT_RECEIVED;
          break;
        case NotificationEventType.REPORT_ASSIGNED:
          notificationType = NotificationType.REPORT_ASSIGNED;
          break;
        case NotificationEventType.REPORT_STATUS_CHANGED:
        case NotificationEventType.REPORT_COMPLETED:
        case NotificationEventType.INTERVENTION_STARTED:
        case NotificationEventType.INTERVENTION_COMPLETED:
          notificationType = NotificationType.REPORT_IN_PROGRESS;
          break;
        case NotificationEventType.REPORT_CANCELLED:
        case NotificationEventType.SYSTEM_MAINTENANCE:
          notificationType = NotificationType.REPORT_INACTIVE;
          break;
        case NotificationEventType.CRITICAL_ZONE_ALERT:
          notificationType = NotificationType.CRITICAL_ZONE;
          break;
        default:
          notificationType = NotificationType.REPORT_RECEIVED;
      }
      
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: notificationType,
          title: payload.title,
          body: payload.body,
          entityType: payload.entityType,
          entityId: payload.entityId,
        },
      });

      this.appLogger.log(`Created notification for user ${payload.userId}: ${payload.title}`);

      // Émettre un événement pour l'envoi automatique de la notification push
      this.emit('notification.created', {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        type: notificationType,
        entityType: payload.entityType,
        entityId: payload.entityId,
      });

      return notification;
    } catch (error) {
      this.appLogger.error(`Failed to create notification:`, error);
      throw error;
    }
  }

  async findUserNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return notifications;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });

    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result;
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  async deleteNotification(notificationId: string, userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    return result;
  }

  // ─── UTILITY METHODS ─────────────────────────────────────────────────────────────
  private getNotificationTypeFromEvent(eventType: NotificationEventType): NotificationType {
    const mapping: Record<string, NotificationType> = {
      [NotificationEventType.REPORT_CREATED]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.REPORT_ASSIGNED]: NotificationType.REPORT_ASSIGNED,
      [NotificationEventType.REPORT_STATUS_CHANGED]: NotificationType.REPORT_IN_PROGRESS,
      [NotificationEventType.REPORT_COMPLETED]: NotificationType.REPORT_IN_PROGRESS,
      [NotificationEventType.REPORT_CANCELLED]: NotificationType.REPORT_INACTIVE,
      [NotificationEventType.INTERVENTION_ASSIGNED]: NotificationType.REPORT_ASSIGNED,
      [NotificationEventType.INTERVENTION_STARTED]: NotificationType.REPORT_IN_PROGRESS,
      [NotificationEventType.INTERVENTION_COMPLETED]: NotificationType.REPORT_IN_PROGRESS,
      [NotificationEventType.USER_PROFILE_UPDATED]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.USER_PASSWORD_CHANGED]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.USER_PASSWORD_RESET]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.USER_EMAIL_VERIFIED]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.CRITICAL_ZONE_ALERT]: NotificationType.CRITICAL_ZONE,
      [NotificationEventType.WELCOME_MESSAGE]: NotificationType.REPORT_RECEIVED,
      [NotificationEventType.SYSTEM_MAINTENANCE]: NotificationType.REPORT_INACTIVE,
    };

    return mapping[eventType] || NotificationType.REPORT_RECEIVED;
  }
}
