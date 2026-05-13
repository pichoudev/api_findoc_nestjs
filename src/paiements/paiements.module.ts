import { Module } from '@nestjs/common';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PaiementsController],
  providers: [PaiementsService, PrismaService]
})
export class PaiementsModule {}
