import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches,IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {Region} from '@prisma/client';


export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Prénom de l\'utilisateur',
    example: 'Jean',
    minLength: 2,
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes' })
  prenom?: string;

  @ApiPropertyOptional({
    description: 'Nom de famille de l\'utilisateur',
    example: 'Dupont',
    minLength: 2,
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes' })
  nom?: string;

  @ApiPropertyOptional({
    description: 'Email de l\'utilisateur',
    example: 'jean.dupont@example.com'
  })
  @IsOptional()
  @IsEmail({}, { message: 'L\'email doit être valide' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone de l\'utilisateur',
    example: '+237123456789'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[+]?[\d\s-()]+$/, { message: 'Le numéro de téléphone n\'est pas valide' })
  telephone?: string;

  @ApiPropertyOptional({
    description: 'ID OneSignal pour les notifications push',
    example: 'b2f7f966-9e7d-412c-b30f-1728fed2d872'
  })
  @IsOptional()
  @IsString()
  one_signal_id?: string;

  @ApiPropertyOptional({
    description: 'Nom de la ville',
    example: 'Douala',
  })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional({
    description: 'Nom de la region',
    example: 'LITTORAL',
  })
  @IsOptional()
  @IsString()
  region?: string;
}
