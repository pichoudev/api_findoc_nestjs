import { Module } from '@nestjs/common';
import { BinsService } from './bins.service';
import { BinsController } from './bins.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BinsController],
  providers: [BinsService],
  exports: [BinsService],
})
export class BinsModule {}

