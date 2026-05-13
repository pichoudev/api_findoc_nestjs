import { ApiProperty } from "@nestjs/swagger";
import { Region } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";


export class CreateVilleDto{

    @ApiProperty({description :"nom de la ville" ,example: "douala"})
    @IsNotEmpty()
    @IsString()
    nom:string

    @ApiProperty({description:"Region ou se trouve la ville" ,example:"LITTORAL"})
    @IsString()
    @IsEnum(Region)
    region:Region = Region.LITTORALE
}