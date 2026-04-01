import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum VerificationMethod {
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

export class SendVerificationCodeDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone pour la vérification de compte',
    example: 'user@example.com'
  })
  @IsNotEmpty({ message: 'Email ou téléphone requis' })
  @IsString({ message: 'Email ou téléphone doit être une chaîne de caractères' })
  emailOrPhone: string;

  @ApiProperty({ 
    description: 'Méthode d\'envoi du code',
    enum: VerificationMethod,
    example: VerificationMethod.EMAIL,
    default: VerificationMethod.EMAIL
  })
  @IsEnum(VerificationMethod, { message: 'Méthode invalide' })
  method?: VerificationMethod = VerificationMethod.EMAIL;
}

export class VerifyAccountDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone',
    example: 'user@example.com'
  })
  @IsNotEmpty({ message: 'Email ou téléphone requis' })
  @IsString({ message: 'Email ou téléphone doit être une chaîne de caractères' })
  emailOrPhone: string;

  @ApiProperty({ 
    description: 'Code de vérification de compte',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsNotEmpty({ message: 'Code requis' })
  @IsString({ message: 'Code doit être une chaîne de caractères' })
  code: string;

  @ApiProperty({ 
    description: 'Type de vérification',
    example: 'VERIFY_EMAIL'
  })
  @IsNotEmpty({ message: 'Type de vérification requis' })
  @IsString({ message: 'Type doit être une chaîne de caractères' })
  purpose: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone pour la réinitialisation',
    example: 'user@example.com'
  })
  @IsNotEmpty({ message: 'Email ou téléphone requis' })
  @IsString({ message: 'Email ou téléphone doit être une chaîne de caractères' })
  emailOrPhone: string;

  @ApiProperty({ 
    description: 'Méthode d\'envoi du code de réinitialisation',
    enum: VerificationMethod,
    example: VerificationMethod.EMAIL,
    default: VerificationMethod.EMAIL
  })
  @IsEnum(VerificationMethod, { message: 'Méthode invalide' })
  method?: VerificationMethod = VerificationMethod.EMAIL;
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone',
    example: 'user@example.com'
  })
  @IsNotEmpty({ message: 'Email ou téléphone requis' })
  @IsString({ message: 'Email ou téléphone doit être une chaîne de caractères' })
  emailOrPhone: string;

  @ApiProperty({ 
    description: 'Code de réinitialisation reçu',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsNotEmpty({ message: 'Code requis' })
  @IsString({ message: 'Code doit être une chaîne de caractères' })
  code: string;

  @ApiProperty({ 
    description: 'Nouveau mot de passe',
    example: 'newPassword123',
    minLength: 6
  })
  @IsNotEmpty({ message: 'Nouveau mot de passe requis' })
  @IsString({ message: 'Mot de passe doit être une chaîne de caractères' })
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirmation du nouveau mot de passe',
    example: 'newPassword123',
    minLength: 6
  })
  @IsNotEmpty({ message: 'Confirmation du mot de passe requise' })
  @IsString({ message: 'Mot de passe doit être une chaîne de caractères' })
  confirmPassword: string;
}
