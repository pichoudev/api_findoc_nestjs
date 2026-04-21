import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrUtilsService } from './qr-utils.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [QrController],
  providers: [QrUtilsService, PrismaService],
  exports: [QrUtilsService],
})
export class QrModule {}
