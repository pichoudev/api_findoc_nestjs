import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductionLogger } from './logger';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'APP_LOGGER',
      useFactory: () => new ProductionLogger(),
    },
  ],
  exports: ['APP_LOGGER'],
})
export class LoggerModule {}
