import { IsString, IsNotEmpty, IsEmail, MinLength, Validate, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchPasswords } from './match-passwords.decorator';

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Rôle de l\'utilisateur: CITIZEN, AGENT, SUPERVISOR, ADMIN' })
  @IsString()
  @IsOptional()
  @IsIn(['CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN'])
  role?: string;

  @ApiPropertyOptional({ description: 'Prénom de l\'utilisateur' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Nom de famille de l\'utilisateur' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Téléphone de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Email de l\'utilisateur' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Mot de passe (min 6 caractères)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Confirmation du mot de passe' })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPasswords, ['password'])
  confirmPassword: string;

  @ApiPropertyOptional({ description: 'Nom du quartier (optionnel)' })
  @IsString()
  @IsOptional()
  neighborhood?: string;
}
