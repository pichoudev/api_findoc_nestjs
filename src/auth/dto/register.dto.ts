import { IsString, IsNotEmpty, IsEmail, MinLength, Validate, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchPasswords } from './match-passwords.decorator';
import { Type_utilisateur } from '@prisma/client';

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Rôle de l\'utilisateur: UTILISATEUR, ADMIN', enum: Type_utilisateur })
  @IsEnum(Type_utilisateur)
  @IsOptional()
  role?: Type_utilisateur;

  @ApiProperty({ description: 'Prénom de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  prenom: string;

  @ApiProperty({ description: 'Nom de famille de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiPropertyOptional({ description: 'Téléphone de l\'utilisateur' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ description: 'Email de l\'utilisateur' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Mot de passe (min 6 caractères)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  mot_de_passe: string;

  @ApiProperty({ description: 'Confirmation du mot de passe' })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswords, ['mot_de_passe'])
  confirm_mot_de_passe: string;

  @ApiPropertyOptional({ description: 'URL de la photo de profil' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({ description: 'nom de la ville' })
  @IsString()
  @IsOptional()
  ville?: string;
}
