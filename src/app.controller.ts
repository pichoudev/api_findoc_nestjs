import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health-check')
  getHealthCheck() {
    return {
      status: 'OK',
      message: 'Serveur fonctionne correctement',
      timestamp: new Date(),
      modules: {
        annonces: 'Chargé',
        auth: 'Chargé',
        me: 'Chargé',
        utilisateurs: 'Chargé'
      }
    };
  }
}
