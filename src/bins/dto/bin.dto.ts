import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BacType, BacStatus, ReportStatus } from '@prisma/client';

export class CreateBinDto {
  
  @ApiProperty({ example: 'BAC-001', description: 'Identifiant unique du bac' })
  @IsString()
  identifier: string;

  @ApiProperty({ enum: BacType, example: 'MENAGER', description: 'Type de bac' })
  @IsEnum(BacType)
  type: BacType;

  @ApiProperty({ example: 'uuid-quartier-bonaberi', description: 'ID du quartier' })
  @IsUUID()
  neighborhoodId: string;

  @ApiPropertyOptional({ 
    example: '9.7043', 
    description: 'Latitude du bac' 
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ 
    example: '4.0483', 
    description: 'Longitude du bac' 
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ 
    example: 'À côté du marché central', 
    description: 'Description de l\'emplacement' 
  })
  @IsString()
  @IsOptional()
  locationDescription?: string;

  @ApiPropertyOptional({ 
    enum: BacStatus, 
    example: 'ACTIF', 
    description: 'Statut du bac' 
  })
  @IsEnum(BacStatus)
  @IsOptional()
  status?: BacStatus;

  @ApiPropertyOptional({ 
    example: 100, 
    description: 'Capacité en litres' 
  })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ 
    example: 75, 
    description: 'Niveau de remplissage actuel (%)' 
  })
  @IsNumber()
  @IsOptional()
  fillLevel?: number;

  @ApiPropertyOptional({ 
    enum: ReportStatus, 
    example: ReportStatus.RECU, 
    description: 'Statut de rapport du bac' 
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  statusReport?: ReportStatus;
}

export class UpdateBinDto {
  @ApiPropertyOptional({ example: 'BAC-001', description: 'Identifiant unique du bac' })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiPropertyOptional({ enum: BacType, example: 'COMMERCIAL', description: 'Type de bac' })
  @IsEnum(BacType)
  @IsOptional()
  type?: BacType;

  @ApiPropertyOptional({ 
    example: 'uuid-quartier-bonaberi', 
    description: 'ID du quartier' 
  })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @ApiPropertyOptional({ 
    example: '9.7043', 
    description: 'Latitude du bac' 
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ 
    example: '4.0483', 
    description: 'Longitude du bac' 
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ 
    example: 'À côté du marché central', 
    description: 'Description de l\'emplacement' 
  })
  @IsString()
  @IsOptional()
  locationDescription?: string;

  @ApiPropertyOptional({ 
    enum: BacStatus, 
    example: 'PLEIN', 
    description: 'Statut du bac' 
  })
  @IsEnum(BacStatus)
  @IsOptional()
  status?: BacStatus;

  @ApiPropertyOptional({ 
    enum: ReportStatus, 
    example: ReportStatus.RECU, 
    description: 'Statut de rapport du bac' 
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  statusReport?: ReportStatus;

  @ApiPropertyOptional({ 
    example: 100, 
    description: 'Capacité en litres' 
  })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ 
    example: 90, 
    description: 'Niveau de remplissage actuel (%)' 
  })
  @IsNumber()
  @IsOptional()
  fillLevel?: number;
}

export class FilterBinsDto {
  @ApiPropertyOptional({ 
    enum: BacType, 
    example: 'MENAGER', 
    description: 'Filtrer par type de bac' 
  })
  @IsEnum(BacType)
  @IsOptional()
  type?: BacType;

  @ApiPropertyOptional({ 
    enum: BacStatus, 
    example: 'ACTIF', 
    description: 'Filtrer par statut du bac' 
  })
  @IsEnum(BacStatus)
  @IsOptional()
  status?: BacStatus;

  @ApiPropertyOptional({ 
    enum: ReportStatus, 
    example: ReportStatus.RECU, 
    description: 'Filtrer par statut de rapport du bac' 
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  statusReport?: ReportStatus;

  @ApiPropertyOptional({ 
    example: 'uuid-quartier-bonaberi', 
    description: 'Filtrer par quartier' 
  })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @ApiPropertyOptional({ 
    example: 'uuid-ville-douala', 
    description: 'Filtrer par ville' 
  })
  @IsUUID()
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({ 
    example: 80, 
    description: 'Filtrer les bacs avec niveau de remplissage supérieur' 
  })
  @IsNumber()
  @IsOptional()
  fillLevelAbove?: number;

  @ApiPropertyOptional({ 
    example: 'BAC-001', 
    description: 'Rechercher par identifiant' 
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
