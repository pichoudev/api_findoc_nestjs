import { IsString, IsNotEmpty, MinLength, Validate, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchPasswords } from './match-passwords.decorator';

export class RequestPasswordResetDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone de l\'utilisateur',
    example: 'user@example.com ou +237123456789'
  })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Email ou numéro de téléphone de l\'utilisateur',
    example: 'user@example.com ou +237123456789'
  })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ 
    description: 'Code de réinitialisation reçu par email/SMS',
    example: '123456'
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ 
    description: 'Nouveau mot de passe',
    example: 'newPassword123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirmation du nouveau mot de passe',
    example: 'newPassword123'
  })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswords, ['newPassword'])
  confirmPassword: string;
}
