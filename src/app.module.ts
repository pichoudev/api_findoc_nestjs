import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { LoggerModule } from './common/logger.module';
import { VercelBlobModule } from './vercel-blob/vercel-blob.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { MeModule } from './me/me.module';

import { SentryModule } from '@sentry/nestjs/setup';
import { AnnoncesModule } from './annonces/annonces.module';
import { PaiementsModule } from './paiements/paiements.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    NotificationsModule,
    VercelBlobModule,
    UtilisateursModule,
    MeModule,
    AnnoncesModule,
    PaiementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AppModule {}
