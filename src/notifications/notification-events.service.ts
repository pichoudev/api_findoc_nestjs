import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SimpleNotificationService } from './simple-notification.service';
import { NotificationType } from '@prisma/client';

export interface NotificationCreatedEvent {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly simpleNotificationService: SimpleNotificationService,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreated(event: NotificationCreatedEvent) {
    try {
      this.logger.log(`🎯 NotificationEventsService: Événement notification.created reçu pour ${event.userId}: ${event.title}`);
      
      const result = await this.simpleNotificationService.createAndSendNotification(
        {
          userId: event.userId,
          title: event.title,
          body: event.body,
          data: {
            type: 'notification_created',
            entityType: event.entityType,
            entityId: event.entityId,
            timestamp: new Date().toISOString(),
          },
        },
        event.type,
        event.entityType,
        event.entityId,
      );
      
      if (result.success) {
        this.logger.log(`✅ NotificationEventsService: Push notification envoyée avec succès à ${event.userId}`);
        this.logger.log(`📊 NotificationEventsService: Résultat OneSignal:`, result.oneSignalResult);
      } else {
        this.logger.warn(`⚠️ NotificationEventsService: Échec envoi push notification pour ${event.userId}:`, result.errors);
      }
    } catch (error) {
      this.logger.error(`❌ NotificationEventsService: Erreur critique envoi push notification pour ${event.userId}:`, error);
      // Ne pas bloquer le flux principal
    }
  }
}
