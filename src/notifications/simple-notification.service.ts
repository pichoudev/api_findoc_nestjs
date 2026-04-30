import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';
import { NotificationType } from '@prisma/client';

export interface SimpleNotificationPayload {
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

export interface SimpleNotificationResult {
  success: boolean;
  notificationId?: string;
  oneSignalResult?: any;
  errors?: string[];
  timestamp: Date;
}

/**
 * Service simplifié utilisant UNIQUEMENT OneSignal
 * Plus simple, plus rapide, pas de confusion avec Firebase
 */
@Injectable()
export class SimpleNotificationService {
  private readonly logger = new Logger(SimpleNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oneSignalService: OneSignalService,
  ) {}

  /**
   * Crée une notification en base et l'envoie via OneSignal
   * Flux simple : Base → OneSignal
   */
  async createAndSendNotification(
    payload: SimpleNotificationPayload,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<SimpleNotificationResult> {
    const startTime = Date.now();
    const result: SimpleNotificationResult = {
      success: true,
      timestamp: new Date(),
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

      // ÉTAPE 2: Récupérer l'utilisateur et son Player ID
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
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

      // ÉTAPE 3: Envoyer via OneSignal
      if (user.oneSignalAppId) {
        this.logger.log(`📢 Envoi via OneSignal pour l'utilisateur ${payload.userId}`);
        
        const oneSignalResult = await this.oneSignalService.sendNotificationToUser(
          user.oneSignalAppId,
          payload.title,
          payload.body,
          payload.data,
          payload.imageUrl,
          payload.url,
        );

        result.oneSignalResult = oneSignalResult;

        if (oneSignalResult.success) {
          this.logger.log(`✅ OneSignal: Notification envoyée avec succès`);
        } else {
          this.logger.warn(`⚠️ OneSignal: Échec d'envoi - ${oneSignalResult.error}`);
          if (result.errors) {
            result.errors.push(`OneSignal: ${oneSignalResult.error}`);
          }
        }
      } else {
        this.logger.warn(`⚠️ OneSignal: Pas de App ID pour l'utilisateur ${payload.userId}`);
        if (result.errors) {
          result.errors.push('OneSignal: Pas de App ID');
        }
      }

      // ÉTAPE 4: Évaluer le succès
      if (!result.oneSignalResult?.success) {
        result.success = false;
        this.logger.error(`❌ Échec de l'envoi pour l'utilisateur ${payload.userId}`);
      } else {
        this.logger.log(`🎉 Notification envoyée avec succès pour l'utilisateur ${payload.userId}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`⏱️ Traitement terminé en ${duration}ms`);

      return result;

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de la notification:`, error);
      result.success = false;
      if (result.errors) {
        result.errors.push(error.message);
      }
      return result;
    }
  }

  /**
   * Envoie une notification à plusieurs utilisateurs
   */
  async sendBulkNotification(
    userIds: string[],
    payload: Omit<SimpleNotificationPayload, 'userId'>,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<SimpleNotificationResult[]> {
    this.logger.log(`📤 Envoi bulk de notifications à ${userIds.length} utilisateurs`);

    const results: SimpleNotificationResult[] = [];

    // Traiter en parallèle avec une limite
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(userId =>
        this.createAndSendNotification(
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
            errors: [result.reason.message],
            timestamp: new Date(),
          });
        }
      });

      // Pause entre les batches
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
    payload: Omit<SimpleNotificationPayload, 'userId'>,
    notificationType: NotificationType = NotificationType.REPORT_RECEIVED,
    entityType?: string,
    entityId?: string,
  ): Promise<SimpleNotificationResult> {
    this.logger.log(`🎯 Envoi au segment: ${segment}`);

    try {
      // Envoyer via OneSignal
      const oneSignalResult = await this.oneSignalService.sendNotificationToSegment(
        segment,
        payload.title,
        payload.body,
        payload.data,
        payload.imageUrl,
        payload.url,
      );

      // Enregistrer les notifications en base pour les utilisateurs du segment
      const userIds = await this.getUsersBySegment(segment);
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
        oneSignalResult,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi au segment ${segment}:`, error);
      return {
        success: false,
        errors: [error.message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Récupère les utilisateurs par segment
   */
  private async getUsersBySegment(segment: string) {
    try {
      let whereClause: any = { isActive: true };

      switch (segment) {
        case 'All':
          // Tous les utilisateurs actifs avec App ID
          whereClause.oneSignalAppId = { not: null };
          break;
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
          // Segment personnalisé
          if (segment.startsWith('agents_')) {
            whereClause.role = 'AGENT';
          }
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          oneSignalAppId: true,
        },
      });

      return users.map(u => u.id);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la récupération du segment ${segment}:`, error);
      return [];
    }
  }

  /**
   * Crée des notifications en base pour plusieurs utilisateurs
   */
  private async createBulkNotifications(
    userIds: string[],
    payload: Omit<SimpleNotificationPayload, 'userId'>,
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
   * Vérifie si un utilisateur a un Player ID OneSignal et retourne l'App ID
   */
  async hasOneSignalPlayerId(userId: string): Promise<{ hasAppId: boolean; appId: string | null }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { oneSignalAppId: true },
      });

      return {
        hasAppId: !!user?.oneSignalAppId,
        appId: user?.oneSignalAppId || null,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la vérification du Player ID:`, error);
      return { hasAppId: false, appId: null };
    }
  }

  /**
   * Nettoie le Player ID OneSignal d'un utilisateur
   */
  async clearOneSignalPlayerId(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { oneSignalAppId: null },
      });

      this.logger.log(`🧹 Player ID OneSignal nettoyé pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors du nettoyage du Player ID:`, error);
    }
  }
}
