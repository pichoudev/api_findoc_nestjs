import { Module } from '@nestjs/common';
import { InterventionsController } from './interventions.controller';
import { InterventionUploadController } from './upload.controller';
import { InterventionsService } from './interventions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [InterventionsController, InterventionUploadController],
  providers: [InterventionsService],
  exports: [InterventionsService],
})
export class InterventionsModule {}

