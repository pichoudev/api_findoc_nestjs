import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';
import { Type_notification } from '@prisma/client';

export interface SimpleNotificationPayload {
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

export interface SimpleNotificationResult {
  success: boolean;
  notificationId?: string;
  oneSignalResult?: any;
  errors: string[];
  timestamp: Date;
}

@Injectable()
export class SimpleNotificationService {
  private readonly logger = new Logger(SimpleNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private oneSignalService: OneSignalService,
  ) {}

  async createAndSendNotification(
    payload: SimpleNotificationPayload,
    type: Type_notification,
    entityType?: string,
    entityId?: string,
  ): Promise<SimpleNotificationResult> {
    const result: SimpleNotificationResult = {
      success: false,
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

      result.oneSignalResult = oneSignalResult;
      result.success = true;

      this.logger.log(`✅ Simple notification envoyée avec succès à ${payload.utilisateurId}`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de la simple notification:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  async sendToMultipleUsers(
    utilisateurIds: string[],
    title: string,
    body: string,
    type: Type_notification,
    data?: Record<string, any>,
  ): Promise<SimpleNotificationResult> {
    const result: SimpleNotificationResult = {
      success: false,
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

      result.oneSignalResult = oneSignalResult;
      result.success = true;

      this.logger.log(`✅ Simple notifications envoyées à ${utilisateurIds.length} utilisateurs`);
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi des simple notifications:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  async getUserNotifications(utilisateurId: string): Promise<any[]> {
    return await this.prisma.notification.findMany({
      where: {
        utilisateur_id: utilisateurId,
      },
      orderBy: {
        envoyee_le: 'desc',
      },
    });
  }

  async markAsRead(notificationId: string, utilisateurId: string): Promise<void> {
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

  async markAllAsRead(utilisateurId: string): Promise<void> {
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
