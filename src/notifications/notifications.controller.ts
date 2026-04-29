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
import { UserRole } from '@prisma/client';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly oneSignalService: OneSignalService,
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
}
