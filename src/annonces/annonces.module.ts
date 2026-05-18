import { Module } from '@nestjs/common';
import { AnnoncesController } from './annonces.controller';
import { AnnoncesService } from './annonces.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VercelBlobModule } from '../vercel-blob/vercel-blob.module';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [PrismaModule, VercelBlobModule],
  controllers: [AnnoncesController],
  providers: [AnnoncesService ,NotificationService],
  exports: [AnnoncesService],
})
export class AnnoncesModule {}
