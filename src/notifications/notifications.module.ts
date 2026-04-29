import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseService } from './firebase.service';
import { OneSignalService } from './onesignal.service';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationsController } from './notifications.controller';
import { DeviceTokensController } from './device-tokens.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
  ],
  controllers: [
    NotificationsController,
    DeviceTokensController,
  ],
  providers: [
    FirebaseService,
    OneSignalService,
    NotificationService,
    PushNotificationService,
  ],
  exports: [
    FirebaseService,
    OneSignalService,
    NotificationService,
    PushNotificationService,
  ],
})
export class NotificationsModule {}
