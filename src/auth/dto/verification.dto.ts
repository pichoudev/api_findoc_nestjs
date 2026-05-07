import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum VerificationMethod {
  EMAIL = 'EMAIL'
}

export class SendVerificationCodeDto {
  @ApiProperty({ 
    description: 'Email pour la vérification de compte',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Méthode d\'envoi du code',
    enum: VerificationMethod,
    example: VerificationMethod.EMAIL,
    default: VerificationMethod.EMAIL
  })
  @IsEnum(VerificationMethod)
  method?: VerificationMethod = VerificationMethod.EMAIL;
}

export class VerifyAccountDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Code de vérification de compte',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ 
    description: 'Type de vérification',
    example: 'VERIFY_EMAIL'
  })
  @IsNotEmpty()
  @IsString()
  purpose: string;
}
