import { Module } from '@nestjs/common';
import { VillesController } from './villes.controller';
import { VillesService } from './villes.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [VillesController],
  providers: [VillesService ,PrismaService]
})
export class VillesModule {}
