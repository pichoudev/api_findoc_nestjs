import { IsString, IsOptional, IsEnum, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportStatus, Priority } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ 
    description: 'ID du bac signalé',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  bacId: string;

  @ApiProperty({ 
    description: 'Type de signalement',
    enum: ReportType,
    example: ReportType.PLEIN
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiPropertyOptional({ 
    description: 'Description détaillée du problème',
    example: 'Le bac déborde depuis 2 jours, il y a des déchets autour'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Emplacement de la personne qui signale (format JSON)',
    example: '{"lat": 4.0583, "lng": 9.7043}',
    type: 'string'
  })
  @IsString()
  @IsOptional()
  locationUser?: string;

  @ApiProperty({ 
    description: 'Priorité du signalement',
    enum: Priority,
    example: Priority.MEDIUM,
    default: Priority.MEDIUM
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}

// DTO pour les requêtes multipart/form-data (avec photo)
export class CreateReportWithPhotoDto {
  @ApiProperty({ 
    description: 'ID du bac signalé',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  bacId: string;

  @ApiProperty({ 
    description: 'Type de signalement',
    enum: ReportType,
    example: ReportType.PLEIN
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiPropertyOptional({ 
    description: 'Description détaillée du problème',
    example: 'Le bac déborde depuis 2 jours, il y a des déchets autour'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Emplacement de la personne qui signale (format JSON)',
    example: '{"lat": 4.0583, "lng": 9.7043}',
    type: 'string'
  })
  @IsString()
  @IsOptional()
  locationUser?: string;

  @ApiProperty({ 
    description: 'Priorité du signalement',
    enum: Priority,
    example: Priority.MEDIUM,
    default: Priority.MEDIUM
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ 
    description: 'Photo du problème (fichier)',
    type: 'string',
    format: 'binary'
  })
  photo?: Express.Multer.File;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ 
    description: 'Type de signalement',
    enum: ReportType,
    example: ReportType.ENDOMMAGE
  })
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @ApiPropertyOptional({ 
    description: 'Description détaillée du problème',
    example: 'Le bac est cassé, le couvercle ne ferme plus'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Photo du problème (fichier)',
    type: 'string',
    format: 'binary'
  })
  photo?: Express.Multer.File;

  @ApiPropertyOptional({ 
    description: 'Emplacement de la personne qui signale (format JSON)',
    example: '{"lat": 4.0583, "lng": 9.7043}',
    type: 'string'
  })
  @IsString()
  @IsOptional()
  locationUser?: string;

  @ApiPropertyOptional({ 
    description: 'Statut du signalement',
    enum: ReportStatus,
    example: ReportStatus.EN_COURS
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiPropertyOptional({ 
    description: 'Priorité du signalement',
    enum: Priority,
    example: Priority.HIGH
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}

export class FilterReportsDto {
  @ApiPropertyOptional({ 
    description: 'Filtrer par type de signalement',
    enum: ReportType
  })
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @ApiPropertyOptional({ 
    description: 'Filtrer par statut',
    enum: ReportStatus
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiPropertyOptional({ 
    description: 'Filtrer par priorité',
    enum: Priority
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ 
    description: 'Filtrer par ID du bac',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsOptional()
  bacId?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrer par ID du reporter',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ 
    description: 'Recherche par code de référence',
    example: 'REP-001'
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Numéro de page',
    example: 1,
    default: 1
  })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ 
    description: 'Nombre d\'éléments par page',
    example: 10,
    default: 10
  })
  @IsOptional()
  limit?: string;
}
