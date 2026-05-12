import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param,
  UseGuards,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OneSignalService } from './onesignal.service';
import { SimpleNotificationService } from './simple-notification.service';
import { Type_notification } from '@prisma/client';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly oneSignalService: OneSignalService,
    private readonly simpleNotificationService: SimpleNotificationService,
  ) {}

  @Post('send')
  @ApiOperation({ 
    summary: 'Envoyer une notification',
    description: 'Envoie une notification push à un utilisateur spécifique'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        utilisateurId: { type: 'string', description: 'ID de l\'utilisateur' },
        title: { type: 'string', description: 'Titre de la notification' },
        body: { type: 'string', description: 'Contenu de la notification' },
        type: { 
          type: 'string', 
          enum: ['CORRESPONDANCE', 'CONTACT_REVELE', 'SIGNALEMENT', 'SYSTEME'], 
          description: 'Type de notification' 
        },
        data: { type: 'object', description: 'Données additionnelles' }
      },
      required: ['utilisateurId', 'title', 'body', 'type']
    }
  })
  async sendNotification(@Body() body: {
    utilisateurId: string;
    title: string;
    body: string;
    type: Type_notification;
    data?: Record<string, any>;
  }) {
    const result = await this.simpleNotificationService.createAndSendNotification(
      {
        utilisateurId: body.utilisateurId,
        title: body.title,
        body: body.body,
        data: body.data,
      },
      body.type
    );

    return {
      success: result.success,
      notificationId: result.notificationId,
      message: result.success ? 'Notification envoyée avec succès' : 'Échec de l\'envoi',
      errors: result.errors,
    };
  }

  @Post('send/broadcast')
  @ApiOperation({ 
    summary: 'Envoyer une notification broadcast',
    description: 'Envoie une notification push à plusieurs utilisateurs'
  })
  async sendBroadcast(@Body() body: {
    utilisateurIds: string[];
    title: string;
    body: string;
    type: Type_notification;
    data?: Record<string, any>;
  }) {
    const result = await this.simpleNotificationService.sendToMultipleUsers(
      body.utilisateurIds,
      body.title,
      body.body,
      body.type,
      body.data
    );

    return {
      success: result.success,
      message: result.success ? 'Notifications envoyées avec succès' : 'Échec de l\'envoi',
      errors: result.errors,
    };
  }

  @Get('my')
  @ApiOperation({ 
    summary: 'Mes notifications',
    description: 'Récupère toutes les notifications de l\'utilisateur connecté'
  })
  async getMyNotifications(@CurrentUser() user: any) {
    return await this.simpleNotificationService.getUserNotifications(user.id);
  }

  @Post('mark-read/:notificationId')
  @ApiOperation({ 
    summary: 'Marquer comme lue',
    description: 'Marque une notification comme lue'
  })
  @ApiParam({ name: 'notificationId', description: 'ID de la notification' })
  async markAsRead(@Param('notificationId') notificationId: string, @CurrentUser() user: any) {
    await this.simpleNotificationService.markAsRead(notificationId, user.id);
    return { message: 'Notification marquée comme lue' };
  }

  @Post('mark-all-read')
  @ApiOperation({ 
    summary: 'Marquer toutes comme lues',
    description: 'Marque toutes les notifications de l\'utilisateur comme lues'
  })
  async markAllAsRead(@CurrentUser() user: any) {
    // Cette méthode n'existe pas encore dans SimpleNotificationService, je vais l'ajouter
    await this.simpleNotificationService.markAllAsRead(user.id);
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  @Get('unread-count')
  @ApiOperation({ 
    summary: 'Nombre de notifications non lues',
    description: 'Retourne le nombre de notifications non lues pour l\'utilisateur'
  })
  async getUnreadCount(@CurrentUser() user: any) {
    const notifications = await this.simpleNotificationService.getUserNotifications(user.id);
    const unreadCount = notifications.filter(n => !n.est_lue).length;
    return { unreadCount };
  }

  @Post('test')
  @ApiOperation({ 
    summary: 'Tester les notifications',
    description: 'Teste l\'envoi d\'une notification via OneSignal'
  })
  async testNotification(@CurrentUser() user: any) {
    if (!user.one_signal_id) {
      return {
        success: false,
        message: 'Aucun token OneSignal trouvé pour cet utilisateur',
      };
    }

    const result = await this.oneSignalService.sendNotification({
      title: 'Test de notification',
      message: 'Ceci est une notification de test depuis le backend',
      includePlayerIds: [user.one_signal_id],
      data: { 
        type: 'test', 
        timestamp: new Date().toISOString(),
        source: 'backend_test'
      },
    });

    return {
      success: true,
      message: 'Test OneSignal effectué',
      result,
    };
  }

  }
