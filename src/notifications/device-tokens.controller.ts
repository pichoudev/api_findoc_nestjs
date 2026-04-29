import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationService } from './push-notification.service';

@ApiTags('device-tokens')
@Controller('device-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceTokensController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('fcm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enregistrer le token FCM d\'un utilisateur',
    description: 'Enregistre ou met à jour le token Firebase Cloud Messaging d\'un utilisateur'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token FCM de l\'appareil',
          example: 'fcm_token_here_1234567890'
        }
      },
      required: ['token']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token FCM enregistré avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token FCM enregistré avec succès' },
        token: { type: 'string', example: 'fcm_token_here_1234567890' }
      }
    }
  })
  async registerFcmToken(
    @Request() req,
    @Body(new ValidationPipe()) body: { token: string },
  ) {
    const userId = req.user.id;
    const { token } = body;

    try {
      // Vérifier si le token est valide (format FCM)
      if (!this.isValidFcmToken(token)) {
        return {
          success: false,
          message: 'Token FCM invalide',
        };
      }

      // Mettre à jour le token de l'utilisateur
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token },
      });

      // Envoyer une notification de test pour vérifier
      const testResult = await this.pushNotificationService.createAndSendPushNotification(
        {
          userId,
          title: '🔔 Notifications activées',
          body: 'Vos notifications push sont maintenant activées sur cet appareil',
          data: {
            type: 'TOKEN_REGISTERED',
            tokenType: 'FCM',
            timestamp: new Date().toISOString(),
          },
        },
        'REPORT_RECEIVED', // Type par défaut
        'user',
        userId,
      );

      return {
        success: true,
        message: 'Token FCM enregistré avec succès',
        token,
        testNotification: testResult.success,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement du token FCM',
        error: error.message,
      };
    }
  }

  @Post('onesignal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enregistrer le Player ID OneSignal d\'un utilisateur',
    description: 'Enregistre ou met à jour le Player ID OneSignal d\'un utilisateur'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        playerId: {
          type: 'string',
          description: 'Player ID OneSignal de l\'appareil',
          example: 'onesignal_player_id_here_1234567890'
        }
      },
      required: ['playerId']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Player ID OneSignal enregistré avec succès'
  })
  async registerOneSignalAppId(
    @Request() req,
    @Body(new ValidationPipe()) body: { appId: string },
  ) {
    const userId = req.user.id;
    const { appId } = body;

    try {
      // Vérifier si l'App ID est valide
      if (!this.isValidOneSignalAppId(appId)) {
        return {
          success: false,
          message: 'App ID OneSignal invalide',
        };
      }

      // Mettre à jour l'App ID de l'utilisateur
      await this.prisma.user.update({
        where: { id: userId },
        data: { oneSignalAppId: appId },
      });

      // Envoyer une notification de test pour vérifier
      const testResult = await this.pushNotificationService.createAndSendPushNotification(
        {
          userId,
          title: '📢 Notifications OneSignal activées',
          body: 'Vos notifications push OneSignal sont maintenant activées',
          data: {
            type: 'TOKEN_REGISTERED',
            tokenType: 'ONESIGNAL',
            timestamp: new Date().toISOString(),
          },
        },
        'REPORT_RECEIVED',
        'user',
        userId,
      );

      return {
        success: true,
        message: 'App ID OneSignal enregistré avec succès',
        testNotification: testResult.success,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement de l\'App ID OneSignal',
        error: error.message,
      };
    }
  }

  @Post('both')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enregistrer les tokens FCM et OneSignal App ID',
    description: 'Enregistre simultanément les tokens FCM et OneSignal App ID pour une meilleure fiabilité'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        fcmToken: {
          type: 'string',
          description: 'Token FCM de l\'appareil',
          example: 'fcm_token_here_1234567890'
        },
        oneSignalAppId: {
          type: 'string',
          description: 'App ID OneSignal de l\'appareil',
          example: 'onesignal_app_id_here_1234567890'
        }
      },
      required: ['fcmToken', 'oneSignalAppId']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tokens enregistrés avec succès'
  })
  async registerBothTokens(
    @Request() req,
    @Body(new ValidationPipe()) body: { 
      fcmToken: string; 
      oneSignalAppId: string; 
    },
  ) {
    const userId = req.user.id;
    const { fcmToken, oneSignalAppId } = body;

    try {
      // Valider les deux tokens
      const fcmValid = this.isValidFcmToken(fcmToken);
      const oneSignalValid = this.isValidOneSignalAppId(oneSignalAppId);

      if (!fcmValid && !oneSignalValid) {
        return {
          success: false,
          message: 'Aucun token valide fourni',
        };
      }

      // Mettre à jour les tokens
      const updateData: any = {};
      if (fcmValid) updateData.fcmToken = fcmToken;
      if (oneSignalValid) updateData.oneSignalAppId = oneSignalAppId;

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Envoyer une notification de test
      const testResult = await this.pushNotificationService.createAndSendPushNotification(
        {
          userId,
          title: '🎉 Notifications push configurées',
          body: 'Vos notifications push sont maintenant activées (Firebase + OneSignal)',
          data: {
            type: 'TOKENS_REGISTERED',
            hasFcm: fcmValid,
            hasOneSignal: oneSignalValid,
            timestamp: new Date().toISOString(),
          },
        },
        'REPORT_RECEIVED',
        'user',
        userId,
      );

      return {
        success: true,
        message: 'Tokens enregistrés avec succès',
        fcmToken: fcmValid ? fcmToken : null,
        oneSignalAppId: oneSignalValid ? oneSignalAppId : null,
        testNotification: testResult.success,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement des tokens',
        error: error.message,
      };
    }
  }

  @Get('status')
  @ApiOperation({ 
    summary: 'Vérifier le statut des tokens de l\'utilisateur',
    description: 'Retourne les tokens actuellement enregistrés pour l\'utilisateur'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statut des tokens récupéré avec succès'
  })
  async getTokensStatus(@Request() req) {
    const userId = req.user.id;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fcmToken: true,
          oneSignalAppId: true,
          isActive: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'Utilisateur non trouvé',
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
        },
        tokens: {
          fcmToken: user.fcmToken ? {
            registered: true,
            lastUpdated: new Date().toISOString(), // TODO: Ajouter timestamp dans la BDD
            valid: this.isValidFcmToken(user.fcmToken),
          } : {
            registered: false,
            message: 'Pas de token FCM enregistré',
          },
          oneSignalAppId: user.oneSignalAppId ? {
            registered: true,
            lastUpdated: new Date().toISOString(), // TODO: Ajouter timestamp dans la BDD
            valid: this.isValidOneSignalAppId(user.oneSignalAppId),
          } : {
            registered: false,
            message: 'Pas de App ID OneSignal enregistré',
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération du statut',
        error: error.message,
      };
    }
  }

  @Post('test')
  @ApiOperation({ 
    summary: 'Tester l\'envoi de notification',
    description: 'Envoie une notification de test pour vérifier la configuration'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titre de la notification de test',
          example: '🧪 Test de notification'
        },
        body: {
          type: 'string',
          description: 'Contenu de la notification de test',
          example: 'Ceci est un test de notification push'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification de test envoyée'
  })
  async sendTestNotification(
    @Request() req,
    @Body(new ValidationPipe()) requestBody: { 
      title?: string; 
      body?: string; 
    },
  ) {
    const userId = req.user.id;
    const { title = '🧪 Test de notification', body = 'Ceci est un test de notification push' } = requestBody;

    try {
      const result = await this.pushNotificationService.createAndSendPushNotification(
        {
          userId,
          title,
          body,
          data: {
            type: 'TEST_NOTIFICATION',
            userId,
            timestamp: new Date().toISOString(),
          },
        },
        'REPORT_RECEIVED',
        'test',
        'test',
      );

      return {
        success: result.success,
        message: result.success ? 'Notification de test envoyée' : 'Échec de l\'envoi',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de la notification de test',
        error: error.message,
      };
    }
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer les tokens de l\'utilisateur',
    description: 'Supprime tous les tokens de notification de l\'utilisateur (déconnexion)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tokens supprimés avec succès'
  })
  async clearTokens(@Request() req) {
    const userId = req.user.id;

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fcmToken: null,
          oneSignalAppId: null,
        },
      });

      return {
        success: true,
        message: 'Tokens supprimés avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la suppression des tokens',
        error: error.message,
      };
    }
  }

  // ─── VALIDATION METHODS ───────────────────────────────────────────────────────

  private isValidFcmToken(token: string): boolean {
    // Token FCM typiquement entre 100-200 caractères
    if (!token || token.length < 50 || token.length > 500) {
      return false;
    }

    // Pattern typique des tokens FCM
    const fcmPattern = /^[a-zA-Z0-9_-]{100,200}$/;
    return fcmPattern.test(token);
  }

  private isValidOneSignalAppId(appId: string): boolean {
    // App ID OneSignal typiquement UUID ou format similaire
    if (!appId || appId.length < 10 || appId.length > 100) {
      return false;
    }

    // Pattern typique des App IDs OneSignal
    const oneSignalPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    return oneSignalPattern.test(appId);
  }
}
