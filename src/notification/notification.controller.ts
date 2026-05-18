import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller('notification')
@ApiTags("notification")
@UseGuards(JwtAuthGuard)
export class NotificationController {

    // constructeur
    constructor(
        private readonly notification :NotificationService
    ){}

    // route pour afficher les notifications d'un utilisateur
      @Get('mes-notifications')
      @ApiOperation({ 
        summary: 'Mes notifications',
        description: 'Récupère toutes les notifications de l\'utilisateur connecté'
      })
      async getMyNotifications(@CurrentUser() user: any) {
        console.log(`user:${user}`)
        return await this.notification.getNotif(user.userId);
      }


    // route pour afficher les notifications d'un utilisateur
      @Get('mes-notifications/:id')
      @ApiOperation({ 
        summary: 'notifications by id',
        description: 'Récupère la notification de l\'utilisateur connect a partir de son idé'
      })
      async getMyNotificationById(@CurrentUser() user: any) {
        console.log(`user:${user}`)
        return await this.notification.getNotifById(user.userId);
      }

    // route pour afficher les notifications d'un utilisateur
      @Post('lu/:id')
      @ApiOperation({ 
        summary: 'Mes notifications',
        description: 'Récupère toutes les notifications de l\'utilisateur connecté'
      })
    @ApiParam({ name: 'notificationId', description: 'ID de la notification' })
    
      async markRead(@Param("id") id:string , @CurrentUser() user: any) {
        console.log(`user:${user}`)
        return await this.notification.markReadOneNotif(user.userId , id);
      }

     // route pour Marquer toutes comme lue les notifications d'un utilisateur
    @Post('tous-lu')
    @ApiOperation({ 
        summary: 'Marquer toutes comme lues',
        description: 'Marque toutes les notifications de l\'utilisateur comme lues'
    })
      async markAllAsRead(@CurrentUser() user: any) {
        console.log(`user:${user}`)
        return await this.notification.markReadAllNotif(user.userId);
    }

    // route pour supprimer une notification
    @Delete(':id')
    @ApiOperation({ 
    summary: 'supprimer une notification ',
    description: 'supprimer les notifications par l\'utilisateur'
  })
  async deleteNotification(@Param("id") id:string ,@CurrentUser() user: any) {
    return await this.notification.deleteNotification(user.userId , id)
  } 

}
