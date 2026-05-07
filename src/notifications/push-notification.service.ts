import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';
import { Type_notification } from '@prisma/client';

export interface PushNotificationPayload {
  utilisateurId: string;
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
    private prisma: PrismaService,
    private oneSignalService: OneSignalService,
  ) {}

  async createAndSendNotification(
    payload: PushNotificationPayload,
    type: Type_notification,
    entityType?: string,
    entityId?: string,
  ): Promise<PushNotificationResult> {
    const result: PushNotificationResult = {
      success: false,
      pushResults: {},
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Créer la notification dans la base de données
      const notification = await this.prisma.notification.create({
        data: {
          utilisateur_id: payload.utilisateurId,
          type,
          message: payload.body,
          envoyee_le: new Date(),
        },
      });

      result.notificationId = notification.id;

      // Envoyer la notification push via OneSignal
      const oneSignalResult = await this.oneSignalService.sendNotification({
        title: payload.title,
        message: payload.body,
        data: payload.data,
        imageUrl: payload.imageUrl,
        url: payload.url,
        includePlayerIds: [payload.utilisateurId], // Utiliser includePlayerIds au lieu de userIds
      });

      result.pushResults.oneSignal = oneSignalResult;
      result.success = true;

      this.logger.log(`✅ Push notification envoyée avec succès à ${payload.utilisateurId}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de la push notification:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  async sendNotificationToMultipleUsers(
    utilisateurIds: string[],
    title: string,
    body: string,
    type: Type_notification,
    data?: Record<string, any>,
  ): Promise<PushNotificationResult> {
    const result: PushNotificationResult = {
      success: false,
      pushResults: {},
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Créer les notifications dans la base de données
      const notifications = utilisateurIds.map(utilisateurId => ({
        utilisateur_id: utilisateurId,
        type,
        message: body,
        envoyee_le: new Date(),
      }));

      await this.prisma.notification.createMany({
        data: notifications,
      });

      // Envoyer les notifications push via OneSignal
      const oneSignalResult = await this.oneSignalService.sendNotification({
        title,
        message: body,
        data,
        includePlayerIds: utilisateurIds, // Utiliser includePlayerIds au lieu de userIds
      });

      result.pushResults.oneSignal = oneSignalResult;
      result.success = true;

      this.logger.log(`✅ Push notifications envoyées à ${utilisateurIds.length} utilisateurs`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi des push notifications:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  async markNotificationAsRead(notificationId: string, utilisateurId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        utilisateur_id: utilisateurId,
      },
      data: {
        est_lue: true,
      },
    });
  }

  async getUnreadNotifications(utilisateurId: string): Promise<any[]> {
    return await this.prisma.notification.findMany({
      where: {
        utilisateur_id: utilisateurId,
        est_lue: false,
      },
      orderBy: {
        envoyee_le: 'desc',
      },
    });
  }

  async markAllNotificationsAsRead(utilisateurId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        utilisateur_id: utilisateurId,
        est_lue: false,
      },
      data: {
        est_lue: true,
      },
    });
  }
}
