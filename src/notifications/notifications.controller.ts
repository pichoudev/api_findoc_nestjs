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
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { FirebaseService } from './firebase.service';
import { OneSignalService } from './onesignal.service';
import { SimpleNotificationService } from './simple-notification.service';
import { UserRole, NotificationType } from '@prisma/client';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly oneSignalService: OneSignalService,
    private readonly simpleNotificationService: SimpleNotificationService,
  ) {}

  @Post('send/firebase')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Envoyer une notification via Firebase',
    description: 'Envoie une notification push à un ou plusieurs utilisateurs via Firebase FCM'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tokens FCM des destinataires'
        },
        title: {
          type: 'string',
          description: 'Titre de la notification'
        },
        body: {
          type: 'string',
          description: 'Contenu de la notification'
        },
        data: {
          type: 'object',
          description: 'Données additionnelles'
        },
        imageUrl: {
          type: 'string',
          description: 'URL de l\'image à afficher'
        }
      },
      required: ['tokens', 'title', 'body']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification envoyée avec succès'
  })
  async sendFirebaseNotification(@Body() body: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }) {
    if (body.tokens.length === 1) {
      return this.firebaseService.sendNotificationToUser(
        body.tokens[0],
        body.title,
        body.body,
        body.data,
        body.imageUrl
      );
    } else {
      return this.firebaseService.sendNotificationToMultipleUsers(
        body.tokens,
        body.title,
        body.body,
        body.data,
        body.imageUrl
      );
    }
  }

  @Post('send/onesignal')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Envoyer une notification via OneSignal',
    description: 'Envoie une notification push via OneSignal'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        playerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Player IDs OneSignal des destinataires'
        },
        segments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Segments OneSignal ciblés'
        },
        title: {
          type: 'string',
          description: 'Titre de la notification'
        },
        message: {
          type: 'string',
          description: 'Contenu de la notification'
        },
        data: {
          type: 'object',
          description: 'Données additionnelles'
        },
        imageUrl: {
          type: 'string',
          description: 'URL de l\'image à afficher'
        },
        url: {
          type: 'string',
          description: 'URL de redirection au clic'
        },
        sendToAll: {
          type: 'boolean',
          description: 'Envoyer à tous les utilisateurs'
        }
      },
      required: ['title', 'message']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification envoyée avec succès'
  })
  async sendOneSignalNotification(@Body() body: {
    playerIds?: string[];
    segments?: string[];
    title: string;
    message: string;
    data?: Record<string, any>;
    imageUrl?: string;
    url?: string;
    sendToAll?: boolean;
  }) {
    if (body.sendToAll) {
      return this.oneSignalService.sendNotificationToAll(
        body.title,
        body.message,
        body.data,
        body.imageUrl,
        body.url
      );
    } else if (body.segments && body.segments.length > 0) {
      if (body.segments.length === 1) {
        return this.oneSignalService.sendNotificationToSegment(
          body.segments[0],
          body.title,
          body.message,
          body.data,
          body.imageUrl,
          body.url
        );
      } else {
        return this.oneSignalService.sendNotification({
          title: body.title,
          message: body.message,
          data: body.data,
          segments: body.segments,
          imageUrl: body.imageUrl,
          url: body.url
        });
      }
    } else if (body.playerIds && body.playerIds.length > 0) {
      if (body.playerIds.length === 1) {
        return this.oneSignalService.sendNotificationToUser(
          body.playerIds[0],
          body.title,
          body.message,
          body.data,
          body.imageUrl,
          body.url
        );
      } else {
        return this.oneSignalService.sendNotificationToMultipleUsers(
          body.playerIds,
          body.title,
          body.message,
          body.data,
          body.imageUrl,
          body.url
        );
      }
    } else {
      return {
        success: false,
        error: 'Vous devez spécifier playerIds, segments ou sendToAll'
      };
    }
  }

  @Post('send/bin-report')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Notifier pour un signalement de bac',
    description: 'Envoie une notification automatique lors d\'un nouveau signalement de bac'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        binId: {
          type: 'string',
          description: 'ID du bac concerné'
        },
        reportType: {
          type: 'string',
          enum: ['DEBORDEMENT', 'DEGRADATION', 'VIDE', 'AUTRE'],
          description: 'Type de signalement'
        },
        neighborhood: {
          type: 'string',
          description: 'Nom du quartier'
        },
        urgency: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Niveau d\'urgence'
        }
      },
      required: ['binId', 'reportType', 'neighborhood']
    }
  })
  async notifyBinReport(@Body() body: {
    binId: string;
    reportType: string;
    neighborhood: string;
    urgency?: string;
  }) {
    const title = '🗑️ Nouveau signalement de bac';
    const message = `Un ${body.reportType.toLowerCase()} a été signalé dans le quartier ${body.neighborhood}`;
    
    const data = {
      type: 'BIN_REPORT',
      binId: body.binId,
      reportType: body.reportType,
      neighborhood: body.neighborhood,
      urgency: body.urgency || 'MEDIUM',
      timestamp: new Date().toISOString(),
    };

    // Notifier les agents du quartier
    const segment = `agents_${body.neighborhood.toLowerCase().replace(/\s+/g, '_')}`;
    
    return this.oneSignalService.sendNotificationToSegment(
      segment,
      title,
      message,
      data,
      undefined,
      `/reports/bin/${body.binId}`
    );
  }

  @Post('send/intervention-assigned')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Notifier assignation d\'intervention',
    description: 'Notifie un agent qu\'une intervention lui a été assignée'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID de l\'agent'
        },
        interventionId: {
          type: 'string',
          description: 'ID de l\'intervention'
        },
        binRefCode: {
          type: 'string',
          description: 'Code référence du bac'
        },
        reportType: {
          type: 'string',
          description: 'Type de problème'
        }
      },
      required: ['agentId', 'interventionId', 'binRefCode']
    }
  })
  async notifyInterventionAssigned(@Body() body: {
    agentId: string;
    interventionId: string;
    binRefCode: string;
    reportType?: string;
  }) {
    const title = '🔧 Nouvelle intervention assignée';
    const message = `Intervention #${body.interventionId} assignée pour le bac ${body.binRefCode}`;
    
    const data = {
      type: 'INTERVENTION_ASSIGNED',
      interventionId: body.interventionId,
      binRefCode: body.binRefCode,
      reportType: body.reportType,
      timestamp: new Date().toISOString(),
    };

    return this.oneSignalService.sendNotificationToUser(
      body.agentId,
      title,
      message,
      data,
      undefined,
      `/interventions/${body.interventionId}`
    );
  }

  @Post('send/bin-status-change')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Notifier changement de statut de bac',
    description: 'Notifie les citoyens d\'un changement de statut important'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        binId: {
          type: 'string',
          description: 'ID du bac'
        },
        refCode: {
          type: 'string',
          description: 'Code référence du bac'
        },
        oldStatus: {
          type: 'string',
          description: 'Ancien statut'
        },
        newStatus: {
          type: 'string',
          description: 'Nouveau statut'
        },
        neighborhood: {
          type: 'string',
          description: 'Nom du quartier'
        }
      },
      required: ['binId', 'refCode', 'newStatus', 'neighborhood']
    }
  })
  async notifyBinStatusChange(@Body() body: {
    binId: string;
    refCode: string;
    oldStatus?: string;
    newStatus: string;
    neighborhood: string;
  }) {
    const title = '🗑️ Mise à jour du bac';
    let message = `Le bac ${body.refCode} est maintenant ${body.newStatus.toLowerCase()}`;
    
    if (body.oldStatus && body.oldStatus !== body.newStatus) {
      message = `Le bac ${body.refCode} est passé de ${body.oldStatus.toLowerCase()} à ${body.newStatus.toLowerCase()}`;
    }
    
    const data = {
      type: 'BIN_STATUS_CHANGE',
      binId: body.binId,
      refCode: body.refCode,
      oldStatus: body.oldStatus,
      newStatus: body.newStatus,
      neighborhood: body.neighborhood,
      timestamp: new Date().toISOString(),
    };

    // Notifier tous les citoyens du quartier
    const segment = `citizens_${body.neighborhood.toLowerCase().replace(/\s+/g, '_')}`;
    
    return this.oneSignalService.sendNotificationToSegment(
      segment,
      title,
      message,
      data,
      undefined,
      `/bins/${body.binId}`
    );
  }

  @Get('test')
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Tester les notifications',
    description: 'Endpoint de test pour vérifier la configuration des notifications'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Test de notification envoyé'
  })
  async testNotifications() {
    const testResults: any = {
      firebase: null,
      oneSignal: null,
    };

    // Test Firebase
    try {
      testResults.firebase = await this.firebaseService.sendNotificationToUser(
        'test_token_firebase',
        '🧪 Test Firebase',
        'Ceci est un test de notification Firebase',
        { type: 'TEST', timestamp: new Date().toISOString() }
      );
    } catch (error) {
      testResults.firebase = { success: false, error: error.message };
    }

    // Test OneSignal
    try {
      testResults.oneSignal = await this.oneSignalService.sendNotificationToAll(
        '🧪 Test OneSignal',
        'Ceci est un test de notification OneSignal',
        { type: 'TEST', timestamp: new Date().toISOString() }
      );
    } catch (error) {
      testResults.oneSignal = { success: false, error: error.message };
    }

    return {
      message: 'Tests de notifications terminés',
      results: testResults,
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================
  // 📱 NOUVEAUX ENDPOINTS SIMPLE NOTIFICATION
  // ========================================

  @Post('send')
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @ApiOperation({ 
    summary: 'Envoyer une notification (OneSignal)',
    description: 'Envoie une notification push à un utilisateur spécifique via OneSignal'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID de l\'utilisateur destinataire',
          example: '123e4567-e89b-12d3-a456-426614174000'
        },
        title: {
          type: 'string',
          description: 'Titre de la notification',
          example: '🗑️ Nouveau signalement'
        },
        body: {
          type: 'string',
          description: 'Contenu de la notification',
          example: 'Un nouveau signalement a été créé'
        },
        data: {
          type: 'object',
          description: 'Données supplémentaires',
          example: {
            type: 'REPORT_CREATED',
            reportId: 'report_123'
          }
        },
        imageUrl: {
          type: 'string',
          description: 'URL de l\'image (optionnel)',
          example: 'https://example.com/image.jpg'
        },
        url: {
          type: 'string',
          description: 'URL à ouvrir au clic (optionnel)',
          example: '/reports/report_123'
        },
        priority: {
          type: 'string',
          enum: ['normal', 'high'],
          description: 'Priorité de la notification',
          example: 'normal'
        },
        sound: {
          type: 'string',
          description: 'Son personnalisé (optionnel)',
          example: 'default'
        },
        badge: {
          type: 'number',
          description: 'Numéro de badge (optionnel)',
          example: 1
        }
      },
      required: ['userId', 'title', 'body']
    }
  })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async sendNotification(@Body() body: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
    url?: string;
    priority?: 'normal' | 'high';
    sound?: string;
    badge?: number;
  }) {
    try {
      const result = await this.simpleNotificationService.createAndSendNotification(
        {
          userId: body.userId,
          title: body.title,
          body: body.body,
          data: body.data,
          imageUrl: body.imageUrl,
          url: body.url,
          priority: body.priority,
          sound: body.sound,
          badge: body.badge,
        },
        NotificationType.REPORT_RECEIVED,
        'notification',
        body.userId,
      );

      return {
        success: result.success,
        notificationId: result.notificationId,
        oneSignalResult: result.oneSignalResult,
        errors: result.errors,
        timestamp: result.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'envoi de la notification',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('send-bulk')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Envoyer des notifications en masse',
    description: 'Envoie une notification push à plusieurs utilisateurs simultanément'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste des IDs utilisateurs',
          example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001']
        },
        title: {
          type: 'string',
          description: 'Titre de la notification',
          example: '📢 Maintenance système'
        },
        body: {
          type: 'string',
          description: 'Contenu de la notification',
          example: 'Le système sera en maintenance ce soir'
        },
        data: {
          type: 'object',
          description: 'Données supplémentaires',
          example: {
            type: 'SYSTEM_MAINTENANCE',
            startTime: '2026-04-29T23:00:00Z'
          }
        },
        priority: {
          type: 'string',
          enum: ['normal', 'high'],
          description: 'Priorité de la notification',
          example: 'normal'
        }
      },
      required: ['userIds', 'title', 'body']
    }
  })
  async sendBulkNotifications(@Body() body: {
    userIds: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    priority?: 'normal' | 'high';
  }) {
    try {
      const results = await this.simpleNotificationService.sendBulkNotification(
        body.userIds,
        {
          title: body.title,
          body: body.body,
          data: body.data,
          priority: body.priority,
        },
        NotificationType.REPORT_RECEIVED,
        'bulk_notification',
      );

      return {
        success: true,
        message: 'Notifications envoyées en masse',
        results: results,
        totalSent: results.length,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'envoi des notifications',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('send-segment')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Envoyer à un segment d\'utilisateurs',
    description: 'Envoie une notification à un segment spécifique (agents, citoyens, etc.)'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          description: 'Nom du segment (agents, citizens, supervisors, agents_quartierX)',
          example: 'agents'
        },
        title: {
          type: 'string',
          description: 'Titre de la notification',
          example: '📋 Nouvelle directive'
        },
        body: {
          type: 'string',
          description: 'Contenu de la notification',
          example: 'Une nouvelle directive HYSACAM est disponible'
        },
        data: {
          type: 'object',
          description: 'Données supplémentaires',
          example: {
            type: 'NEW_DIRECTIVE',
            directiveId: 'directive_2026_04'
          }
        },
        url: {
          type: 'string',
          description: 'URL à ouvrir au clic (optionnel)',
          example: '/directives/directive_2026_04'
        },
        priority: {
          type: 'string',
          enum: ['normal', 'high'],
          description: 'Priorité de la notification',
          example: 'high'
        }
      },
      required: ['segment', 'title', 'body']
    }
  })
  async sendSegmentNotification(@Body() body: {
    segment: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    url?: string;
    priority?: 'normal' | 'high';
  }) {
    try {
      const result = await this.simpleNotificationService.sendNotificationToSegment(
        body.segment,
        {
          title: body.title,
          body: body.body,
          data: body.data,
          url: body.url,
          priority: body.priority,
        },
        NotificationType.REPORT_RECEIVED,
        'segment_notification',
      );

      return {
        success: result.success,
        message: `Notification envoyée au segment ${body.segment}`,
        segment: body.segment,
        notificationId: result.notificationId,
        oneSignalResult: result.oneSignalResult,
        errors: result.errors,
        timestamp: result.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de l\'envoi au segment',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('user/:userId/has-onesignal')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Vérifier si un utilisateur a un App ID OneSignal',
    description: 'Retourne true si l\'utilisateur a un App ID OneSignal enregistré'
  })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  async checkUserOneSignal(@Param('userId') userId: string) {
    try {
      const result = await this.simpleNotificationService.hasOneSignalPlayerId(userId);
      
      return {
        userId: userId,
        hasOneSignalAppId: result.hasAppId,
        oneSignalAppId: result.appId,
        message: result.hasAppId 
          ? 'L\'utilisateur a un App ID OneSignal enregistré'
          : 'L\'utilisateur n\'a pas de App ID OneSignal',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la vérification',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('device/:appId/status')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Vérifier si un appareil OneSignal est actif',
    description: 'Vérifie l\'état d\'un appareil via l\'API OneSignal'
  })
  @ApiParam({ name: 'appId', description: 'App ID de l\'appareil OneSignal' })
  async checkDeviceStatus(@Param('appId') appId: string) {
    try {
      // Utiliser l'API OneSignal pour vérifier l'appareil
      const result = await this.oneSignalService.getDeviceStatus(appId);
      
      return {
        appId: appId,
        isActive: result.success,
        deviceInfo: result.success ? result.data : null,
        message: result.success 
          ? 'Appareil actif et abonné'
          : 'Appareil non trouvé ou inactif',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        appId: appId,
        message: 'Erreur lors de la vérification de l\'appareil',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('devices')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ 
    summary: 'Lister tous les appareils OneSignal',
    description: 'Récupère la liste de tous les appareils depuis OneSignal'
  })
  async listAllDevices() {
    try {
      const result = await this.oneSignalService.getAllDevices();
      
      return {
        success: result.success,
        devices: result.success ? result.data : [],
        count: result.success ? (result.data?.players?.length || 0) : 0,
        message: result.success 
          ? `${result.data?.players?.length || 0} appareils trouvés`
          : 'Erreur lors de la récupération',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        devices: [],
        count: 0,
        message: 'Erreur lors de la récupération des appareils',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
