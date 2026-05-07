import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { OneSignalService } from './onesignal.service';
import { PushNotificationService } from './push-notification.service';
import { SimpleNotificationService } from './simple-notification.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsController } from './notifications.controller';
import { DeviceTokensController } from './device-tokens.controller';

@Module({
  imports: [
    HttpModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
  controllers: [
    NotificationsController,
    DeviceTokensController,
  ],
  providers: [
    OneSignalService,
    SimpleNotificationService,
    NotificationEventsService,
    PushNotificationService,
  ],
  exports: [
    OneSignalService,
    PushNotificationService,
    SimpleNotificationService,
  ],
})
export class NotificationsModule {}
