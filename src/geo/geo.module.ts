import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { BinsModule } from '../bins/bins.module';
import { NeighborhoodsModule } from '../neighborhoods/neighborhoods.module';

@Module({
  imports: [BinsModule, NeighborhoodsModule],
  controllers: [GeoController],
})
export class GeoModule {}
