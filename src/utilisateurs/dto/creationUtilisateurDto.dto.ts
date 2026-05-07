import { IsEnum, IsOptional, IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type_utilisateur ,Region} from '@prisma/client';

export class CreationUtilisateurDto {
  @ApiProperty({
    description: 'Nom de famille de l\'utilisateur',
    example: 'steph',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes' })
  nom: string;

  @ApiProperty({
    description: 'Prénom de l\'utilisateur',
    example: 'pichou',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes' })
  prenom: string;

  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'jean.dupont@example.com'
  })
  @IsEmail({}, { message: 'L\'email doit être valide' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone de l\'utilisateur',
    example: '+237123456789'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[+]?[\d\s-()]+$/, { message: 'Le numéro de téléphone n\'est pas valide' })
  telephone?: string;

  @ApiPropertyOptional({
    description: 'URL de la photo de profil',
    example: 'https://example.com/photo.jpg'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'L\'URL de la photo ne peut pas dépasser 500 caractères' })
  photo?: string;

  @ApiProperty({
    description: 'Mot de passe de l\'utilisateur',
    example: 'Password123!',
    minLength: 8,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial'
  })
  mot_de_passe: string;

  @ApiProperty({
    description: 'Rôle de l\'utilisateur',
    enum: Type_utilisateur,
    example: Type_utilisateur.UTILISATEUR
  })
  @IsEnum(Type_utilisateur, { message: 'Le rôle doit être valide' })
  @IsNotEmpty()
  role: Type_utilisateur;

  @ApiProperty({
    description: 'Nom de la ville',
    example: 'Dupont',
  })
  @IsString()
  @IsNotEmpty()
  ville: string;

    @ApiProperty({
    description: 'Nom de la region',
    example: 'LITTORAL',
  })
  @IsString()
  @IsNotEmpty()
  region: Region;
}