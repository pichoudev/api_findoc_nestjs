import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/createdto';
import { Utilisateur } from '@prisma/client';

@Injectable()
export class NotificationService {

    // constructeur 
    constructor(
        private readonly prisma : PrismaService
    ){}

    // fonction creer une notification
    async createNotification( id:string ,data:CreateNotificationDto){
        // `verification de l'utilisateur dans la bd
        const user = await this.prisma.utilisateur.findUnique({
            where:{
                id:id
            }
        });

        if(!user){
            return new NotFoundException("utilisateur pas inscrit");
        }

        // on enregistre la notification dans la bd
        const notif = await this.prisma.notification.create({
            data:{
                ...data
            }
        });

        return {
            message:"notification cree avec succes",
            data:notif
        }

    }


    // recuperer les notifications d'un utilisateur connecte
    async getNotifById(id:string){
        // `verification de l'utilisateur dans la bd
        const user = await this.prisma.utilisateur.findUnique({
            where:{
                id:id
            }
        });

        if(!user){
            return new NotFoundException("utilisateur pas inscrit");
        }

        const notifications = await this.prisma.notification.findMany({
            where:{
                utilisateur_id:id,
            }
        });
        return 
            data:notifications
    }

    // fonction pour rtourne toutes les notifications d'un utilisateur
    async getNotif(utilisateur_id:string ){
        const notifications =  await this.prisma.notification.findMany({
            where:{
                utilisateur_id: utilisateur_id,
            }
        });

        // les stats
        const es_lues =  await this.prisma.notification.findMany({
                where:{
                    est_lue:false
                }
            });

            return {
                data: notifications,
                es_lues : es_lues.length
            }
    }

    // mettre ajour le satut de lecture d'une notification
    async markReadOneNotif(utilisateur_id:string ,noti_id:string):Promise<any>{
    // `verification de l'utilisateur dans la bd
        const user = await this.prisma.utilisateur.findUnique({
            where:{
                id:utilisateur_id
            }
        });

        if(!user){
            return new NotFoundException("utilisateur pas inscrit");
        }

        await this.prisma.notification.update({
            where:{
                id: noti_id,
            },
            data: {
                est_lue: true,
            },

        })


    }

        // mettre ajour le satut de lecture d'une notification
    async markReadAllNotif(utilisateur_id:string):Promise<any>{
    // `verification de l'utilisateur dans la bd
        const user = await this.prisma.utilisateur.findUnique({
            where:{
                id:utilisateur_id
            }
        });

        if(!user){
            return new NotFoundException("utilisateur pas inscrit");
        }

        await this.prisma.notification.updateMany({
            where:{
                utilisateur_id:utilisateur_id,
                est_lue:false
            },
            data: {
                est_lue: true,
            },

        })
    }

    // fonction pour supprimer une notification
    async deleteNotification(utilisateur_id: string ,notif_id:string ):Promise<void>{
         await this.prisma.notification.delete({
            where:{
                utilisateur_id:utilisateur_id,
                id: notif_id
            }
         })
    }
}
