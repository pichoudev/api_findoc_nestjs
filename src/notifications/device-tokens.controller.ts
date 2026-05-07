import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('device-tokens')
@Controller('device-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceTokensController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Post('onesignal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Mettre à jour le token OneSignal',
    description: 'Met à jour le token OneSignal de l\'utilisateur pour les notifications push'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        oneSignalId: { 
          type: 'string', 
          description: 'Token OneSignal de l\'appareil' 
        }
      },
      required: ['oneSignalId']
    }
  })
  async updateOneSignalToken(
    @Body() body: { oneSignalId: string },
    @CurrentUser() user: any
  ) {
    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { 
        one_signal_id: body.oneSignalId,
        est_actif: true // Activer l'utilisateur s'il a un token
      },
    });

    return {
      success: true,
      message: 'Token OneSignal mis à jour avec succès',
    };
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer le token OneSignal',
    description: 'Supprime le token OneSignal de l\'utilisateur (déconnexion des notifications)'
  })
  async clearOneSignalToken(@CurrentUser() user: any) {
    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { 
        one_signal_id: null,
      },
    });

    return {
      success: true,
      message: 'Token OneSignal supprimé avec succès',
    };
  }

  @Post('test-notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Tester les notifications',
    description: 'Envoie une notification de test à l\'utilisateur actuel'
  })
  async testNotification(@CurrentUser() user: any) {
    if (!user.one_signal_id) {
      return {
        success: false,
        message: 'Aucun token OneSignal trouvé pour cet utilisateur',
      };
    }

    // Ici vous pourriez intégrer avec votre service OneSignal
    // Pour l'instant, nous retournons juste les informations
    return {
      success: true,
      message: 'Notification de test préparée',
      userId: user.id,
      oneSignalId: user.one_signal_id,
      note: 'Intégrer avec OneSignalService pour envoyer réellement la notification',
    };
  }
}
