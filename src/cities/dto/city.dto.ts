import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Region } from '@prisma/client';

export class CreateCityDto {
  @ApiProperty({ example: 'Douala', description: 'Nom de la ville' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cameroun', description: 'Pays de la ville' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '237', description: 'Code postal de la ville' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ 
    enum: Region, 
    example: 'LITTORAL', 
    description: 'Région de la ville' 
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut actif de la ville' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCityDto {
  @ApiPropertyOptional({ example: 'Douala', description: 'Nom de la ville' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Cameroun', description: 'Pays de la ville' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '237', description: 'Code postal de la ville' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ 
    enum: Region, 
    example: 'LITTORAL', 
    description: 'Région de la ville' 
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut actif de la ville' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FilterCitiesDto {
  @ApiPropertyOptional({ 
    enum: Region, 
    example: 'LITTORAL', 
    description: 'Filtrer par région' 
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filtrer par statut actif' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: 'Douala', 
    description: 'Rechercher par nom de ville' 
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
