import { IsEnum, IsOptional, IsString, IsEmail, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'Prénom de l\'utilisateur' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de l\'utilisateur' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email de l\'utilisateur' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+237612345678', description: 'Téléphone de l\'utilisateur' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe de l\'utilisateur' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ 
    enum: UserRole, 
    example: 'CITIZEN', 
    description: 'Rôle de l\'utilisateur (défaut: CITIZEN)' 
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ 
    example: 'uuid-du-quartier', 
    description: 'ID du quartier de l\'utilisateur' 
  })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

   @ApiPropertyOptional({ 
    example: 'Akwa', 
    description: 'nom du quartier de l\'utilisateur' 
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional({ 
    example: 'token-fcm', 
    description: 'Token FCM pour les notifications push' 
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'Prénom de l\'utilisateur' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Nom de l\'utilisateur' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com', description: 'Email de l\'utilisateur' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+237612345678', description: 'Téléphone de l\'utilisateur' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ 
    enum: UserRole, 
    example: 'AGENT', 
    description: 'Rôle de l\'utilisateur' 
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ 
    example: 'uuid-du-quartier', 
    description: 'ID du quartier de l\'utilisateur' 
  })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @ApiPropertyOptional({ 
    example: 'Akwa', 
    description: 'Nom du quartier de l\'utilisateur' 
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut actif de l\'utilisateur' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut vérifié de l\'utilisateur' 
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ 
    example: 'token-fcm', 
    description: 'Token FCM pour les notifications push' 
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class UpdateUserPasswordDto {
  @ApiProperty({ example: 'oldpassword123', description: 'Ancien mot de passe' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'newpassword123', description: 'Nouveau mot de passe' })
  @IsString()
  newPassword: string;
}

export class FilterUsersDto {
  @ApiPropertyOptional({ 
    enum: UserRole, 
    example: 'CITIZEN', 
    description: 'Filtrer par rôle' 
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filtrer par statut actif' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filtrer par statut vérifié' 
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ 
    example: 'uuid-du-quartier', 
    description: 'Filtrer par quartier' 
  })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @ApiPropertyOptional({ 
    example: 'john', 
    description: 'Rechercher par nom ou email' 
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ 
    example: '1', 
    description: 'Page number' 
  })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ 
    example: '10', 
    description: 'Items per page' 
  })
  @IsString()
  @IsOptional()
  limit?: string;
}
