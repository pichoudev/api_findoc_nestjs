import { ApiProperty } from "@nestjs/swagger";
import { Type_notification } from "@prisma/client";
import { IsString } from "class-validator";


export class CreateNotificationDto{

    @ApiProperty({description:"l'identifiant de l'utlisateur a qui on va envoyer la notification"})
    @IsString()
    utilisateur_id : string;

    @ApiProperty({description:"contenu de la notification"})
    @IsString()
    message : string;

    @ApiProperty({description:"l'identifiant de l'utlisateur a qui on va envoyer la notification"})
    @IsString()
    type : Type_notification = Type_notification.SIGNALEMENT;

}