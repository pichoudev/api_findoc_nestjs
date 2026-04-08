import { IsString, IsOptional, IsEnum, IsUUID, IsNotEmpty, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterventionStatus } from '@prisma/client';

export class CreateInterventionDto {
  @ApiProperty({ 
    description: 'ID du signalement à traiter',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  reportId: string;

  @ApiProperty({ 
    description: 'ID de l\'agent HYSACAM assigné',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;

  @ApiPropertyOptional({ 
    description: 'Commentaire initial de l\'intervention',
    example: 'Intervention planifiée pour demain matin'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}

export class UpdateInterventionDto {
  @ApiPropertyOptional({ 
    description: 'Statut de l\'intervention',
    enum: InterventionStatus,
    example: InterventionStatus.EN_COURS
  })
  @IsEnum(InterventionStatus)
  @IsOptional()
  status?: InterventionStatus;

  @ApiPropertyOptional({ 
    description: 'Commentaire sur l\'intervention',
    example: 'Le bac a été vidé et nettoyé'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ 
    description: 'Date de début de l\'intervention',
    example: '2026-03-20T10:30:00Z'
  })
  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @ApiPropertyOptional({ 
    description: 'Date de fin de l\'intervention',
    example: '2026-03-20T11:45:00Z'
  })
  @IsDateString()
  @IsOptional()
  completedAt?: string;
}

export class FilterInterventionsDto {
  @ApiPropertyOptional({ 
    description: 'Filtrer par statut d\'intervention',
    enum: InterventionStatus
  })
  @IsEnum(InterventionStatus)
  @IsOptional()
  status?: InterventionStatus;

  @ApiPropertyOptional({ 
    description: 'Filtrer par ID du signalement',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsOptional()
  reportId?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrer par ID de l\'agent',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrer par date de début (YYYY-MM-DD)',
    example: '2026-03-20'
  })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrer par date de fin (YYYY-MM-DD)',
    example: '2026-03-31'
  })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Recherche par commentaire',
    example: 'bac plein'
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

export class AssignInterventionDto {
  @ApiProperty({ 
    description: 'ID de l\'agent HYSACAM à assigner',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;

  @ApiPropertyOptional({ 
    description: 'Commentaire d\'assignation',
    example: 'Urgent - Bac critique dans zone commerciale'
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
