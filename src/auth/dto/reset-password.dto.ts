import { IsString, IsNotEmpty, MinLength, Validate, IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MatchPasswords } from './match-passwords.decorator';

export class RequestPasswordResetDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Purpose de la demande de réinitialisation',
    example: 'RESET_PASSWORD',
    enum: ['RESET_PASSWORD']
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['RESET_PASSWORD'])
  purpose: string = 'RESET_PASSWORD';
}

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Code de réinitialisation reçu par email',
    example: '123456'
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ 
    description: 'Purpose de la réinitialisation',
    example: 'RESET_PASSWORD',
    enum: ['RESET_PASSWORD']
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['RESET_PASSWORD'])
  purpose: string = 'RESET_PASSWORD';

  @ApiProperty({ 
    description: 'Nouveau mot de passe',
    example: 'newPassword123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  nouveau_mot_de_passe: string;

  @ApiProperty({ 
    description: 'Confirmation du nouveau mot de passe',
    example: 'newPassword123'
  })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswords, ['nouveau_mot_de_passe'])
  confirm_nouveau_mot_de_passe: string;
}
