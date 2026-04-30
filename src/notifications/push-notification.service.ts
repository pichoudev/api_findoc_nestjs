import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';
import { NotificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  url?: string;
  priority?: 'normal' | 'high';
  sound?: string;
  badge?: number;
}

export interface PushNotificationResult {
  success: boolean;
  notificationId?: string;
  pushResults: {
    oneSignal?: any;
  };
  errors: string[];
  timestamp: Date;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly oneSignalService: OneSignalService,
  ) {}

  /**
   * Crée une notification en base et l'envoie via OneSignal
   * Flux : Base de données → OneSignal
   */
  async createAndSendPushNotification(
    payload: PushNotificationPayload,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<PushNotificationResult> {
    const startTime = Date.now();
    const result: PushNotificationResult = {
      success: true,
      timestamp: new Date(),
      pushResults: {},
      errors: [],
    };

    try {
      // ÉTAPE 1: Enregistrer la notification en base
      this.logger.log(`📝 Enregistrement de la notification pour l'utilisateur ${payload.userId}`);
      
      const dbNotification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: notificationType,
          title: payload.title,
          body: payload.body,
          entityType,
          entityId,
        },
      });

      result.notificationId = dbNotification.id;
      this.logger.log(`✅ Notification enregistrée en base: ${dbNotification.id}`);

      // ÉTAPE 2: Récupérer les tokens de l'utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          fcmToken: true,
          oneSignalAppId: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error(`Utilisateur ${payload.userId} non trouvé`);
      }

      if (!user.isActive) {
        throw new Error(`Utilisateur ${payload.userId} n'est pas actif`);
      }

      // ÉTAPE 3 : Envoyer via OneSignal uniquement
      if (user.oneSignalAppId) {
        this.logger.log(`📢 Envoi OneSignal pour ${payload.userId}`);

        const oneSignalResult = await this.oneSignalService.sendNotificationToUser(
          user.oneSignalAppId,
          payload.title,
          payload.body,
          payload.data,
          payload.imageUrl,
          payload.url,
        );

        result.pushResults.oneSignal = oneSignalResult;

        if (oneSignalResult.success) {
          this.logger.log(`✅ OneSignal: envoi réussi`);
        } else {
          this.logger.warn(`⚠️ OneSignal: échec - ${oneSignalResult.error}`);
          result.errors.push(`OneSignal: ${oneSignalResult.error}`);

          // Nettoyer l'App ID invalide
          await this.cleanupInvalidToken(payload.userId, 'onesignal');
        }
      } else {
        this.logger.warn(`⚠️ OneSignal: pas d'App ID pour ${payload.userId}`);
        result.errors.push('OneSignal: Pas d\'App ID');
      }

      // ÉTAPE 4 : Évaluer le succès global
      const oneSignalOk = result.pushResults?.oneSignal?.success || false;

      if (!oneSignalOk) {
        result.success = false;
        this.logger.error(`❌ Échec OneSignal pour ${payload.userId}`);
      } else {
        this.logger.log(`🎉 Notification OneSignal envoyée avec succès pour ${payload.userId}`);
      }

      // ÉTAPE 5 : Mettre à jour les métadonnées de la notification
      await this.updateNotificationMetadata(dbNotification.id, result);

      const duration = Date.now() - startTime;
      this.logger.log(`⏱️ Traitement terminé en ${duration}ms`);

      return result;

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de la notification:`, error);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Envoie une notification à plusieurs utilisateurs
   */
  async createAndSendBulkPushNotification(
    userIds: string[],
    payload: Omit<PushNotificationPayload, 'userId'>,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<PushNotificationResult[]> {
    this.logger.log(`📤 Envoi bulk de notifications à ${userIds.length} utilisateurs`);

    const results: PushNotificationResult[] = [];

    // Traiter en parallèle avec une limite pour éviter la surcharge
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(userId =>
        this.createAndSendPushNotification(
          { ...payload, userId },
          notificationType,
          entityType,
          entityId,
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            pushResults: {},
            errors: [result.reason.message],
            timestamp: new Date(),
          });
        }
      });

      // Pause entre les batches pour éviter la limitation
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`📊 Résultat bulk: ${successCount}/${userIds.length} succès`);

    return results;
  }

  /**
   * Envoie une notification à un segment d'utilisateurs
   */
  async sendNotificationToSegment(
    segment: string,
    payload: Omit<PushNotificationPayload, 'userId'>,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<PushNotificationResult> {
    this.logger.log(`🎯 Envoi au segment: ${segment}`);

    try {
      // Récupérer les utilisateurs du segment
      const users = await this.getUsersBySegment(segment);
      
      if (users.length === 0) {
        return {
          success: false,
          pushResults: {},
          errors: [`Aucun utilisateur trouvé dans le segment ${segment}`],
          timestamp: new Date(),
        };
      }

      // Envoyer via OneSignal (plus efficace pour les segments)
      const oneSignalResult = await this.oneSignalService.sendNotificationToSegment(
        segment,
        payload.title,
        payload.body,
        payload.data,
        payload.imageUrl,
        payload.url,
      );

      // Enregistrer les notifications en base pour chaque utilisateur
      const userIds = users.map(u => u.id);
      await this.createBulkNotifications(
        userIds,
        payload,
        notificationType,
        entityType,
        entityId,
      );

      return {
        success: oneSignalResult.success,
        notificationId: `segment_${segment}_${Date.now()}`,
        pushResults: { oneSignal: oneSignalResult },
        errors: oneSignalResult.success ? [] : [oneSignalResult.error || 'Erreur OneSignal'],
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi au segment ${segment}:`, error);
      return {
        success: false,
        pushResults: {},
        errors: [error.message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Nettoie les tokens invalides
   */
  private async cleanupInvalidToken(userId: string, tokenType: 'onesignal') {
    const updateData = { oneSignalAppId: null };

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    this.logger.log(`🧹 Token ${tokenType} invalide nettoyé pour l'utilisateur ${userId}`);
  }

  /**
   * Met à jour les métadonnées de la notification
   */
  private async updateNotificationMetadata(notificationId: string, result: PushNotificationResult) {
    try {
      // Pour l'instant, on utilise le modèle existant
      // Plus tard, on pourrait ajouter une table notification_metadata
      this.logger.log(`📝 Métadonnées mises à jour pour la notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la mise à jour des métadonnées:`, error);
    }
  }

  /**
   * Crée des notifications en base pour plusieurs utilisateurs
   */
  private async createBulkNotifications(
    userIds: string[],
    payload: Omit<PushNotificationPayload, 'userId'>,
    notificationType: NotificationType,
    entityType?: string,
    entityId?: string,
  ) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        type: notificationType,
        title: payload.title,
        body: payload.body,
        entityType,
        entityId,
      }));

      await this.prisma.notification.createMany({
        data: notifications,
      });

      this.logger.log(`📝 ${notifications.length} notifications créées en base`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la création bulk des notifications:`, error);
    }
  }

  /**
   * Récupère les utilisateurs par segment
   */
  private async getUsersBySegment(segment: string) {
    try {
      // Logique de segmentation basée sur les rôles et autres critères
      let whereClause: any = { isActive: true };

      switch (segment) {
        case 'agents':
          whereClause.role = 'AGENT';
          break;
        case 'supervisors':
          whereClause.role = 'SUPERVISOR';
          break;
        case 'admins':
          whereClause.role = 'ADMIN';
          break;
        case 'citizens':
          whereClause.role = 'CITIZEN';
          break;
        default:
          // Segment personnalisé (ex: agents_douala)
          if (segment.startsWith('agents_')) {
            whereClause.role = 'AGENT';
            // Ajouter des filtres géographiques si nécessaire
          }
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          oneSignalAppId: true,
          role: true,
        },
      });

      return users;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la récupération du segment ${segment}:`, error);
      return [];
    }
  }

  /**
   * Récupère les statistiques d'envoi
   */
  async getNotificationStats(userId?: string, startDate?: Date, endDate?: Date) {
    try {
      const whereClause: any = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (startDate || endDate) {
        whereClause.sentAt = {};
        if (startDate) whereClause.sentAt.gte = startDate;
        if (endDate) whereClause.sentAt.lte = endDate;
      }

      const stats = await this.prisma.notification.groupBy({
        by: ['type', 'isRead'],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      return stats;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la récupération des statistiques:`, error);
      return [];
    }
  }
}