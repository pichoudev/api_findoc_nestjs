import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { NotificationEventType } from './types/notification.types';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister les notifications de l\'utilisateur',
    description: 'Retourne les notifications de l\'utilisateur connecté avec pagination'
  })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Filtrer uniquement les notifications non lues' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de notifications à retourner' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset pour la pagination' })
  @ApiResponse({ status: 200, description: 'Notifications récupérées avec succès' })
  async findMyNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.notificationService.findUserNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('unread-count')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Nombre de notifications non lues',
    description: 'Retourne le nombre de notifications non lues pour l\'utilisateur connecté'
  })
  @ApiResponse({ status: 200, description: 'Nombre récupéré avec succès' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    const count = await this.notificationService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Marquer une notification comme lue',
    description: 'Marque une notification spécifique comme lue'
  })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('mark-all-read')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Marquer toutes les notifications comme lues',
    description: 'Marque toutes les notifications de l\'utilisateur comme lues'
  })
  @ApiResponse({ status: 200, description: 'Toutes les notifications marquées comme lues' })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Supprimer une notification',
    description: 'Supprime une notification spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async deleteNotification(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.notificationService.deleteNotification(id, userId);
  }

  @Post('test')
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Tester une notification (admin uniquement)',
    description: 'Envoie une notification de test pour vérifier le système'
  })
  @ApiResponse({ status: 200, description: 'Notification de test envoyée' })
  async testNotification(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    // Envoyer une notification de test
    this.notificationService.emitEvent(NotificationEventType.WELCOME_MESSAGE, {
      userId,
      firstName: 'Test',
    });

    return { message: 'Notification de test envoyée' };
  }
}
