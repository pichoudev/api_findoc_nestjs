import { Module } from '@nestjs/common';
import { AnnoncesController } from './annonces.controller';
import { AnnoncesService } from './annonces.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VercelBlobModule } from '../vercel-blob/vercel-blob.module';

@Module({
  imports: [PrismaModule, VercelBlobModule],
  controllers: [AnnoncesController],
  providers: [AnnoncesService],
  exports: [AnnoncesService],
})
export class AnnoncesModule {}
