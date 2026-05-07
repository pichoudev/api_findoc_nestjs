import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { PrismaService } from '../prisma/prisma.service';
import { VercelBlobModule } from '../vercel-blob/vercel-blob.module';

@Module({
  imports: [VercelBlobModule],
  controllers: [MeController],
  providers: [MeService, PrismaService],
  exports: [MeService]
})
export class MeModule {}
