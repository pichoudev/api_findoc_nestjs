import { Module } from '@nestjs/common';
import { UtilisateursController } from './utilisateurs.controller';
import { UtilisateursService } from './utilisateurs.service';
import { RolesGuard } from './guards/role.guards';
import { VercelBlobModule } from '../vercel-blob/vercel-blob.module';
import {PrismaModule} from '../prisma/prisma.module';

@Module({
  imports: [VercelBlobModule ,PrismaModule],
  controllers: [UtilisateursController],
  providers: [UtilisateursService, RolesGuard],
  exports: [UtilisateursService, RolesGuard]
})
export class UtilisateursModule {}
