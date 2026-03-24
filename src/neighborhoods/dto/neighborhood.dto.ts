import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNeighborhoodDto {
  @ApiProperty({ example: 'Bonaberi', description: 'Nom du quartier' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'uuid-ville-douala', description: 'ID de la ville' })
  @IsUUID()
  cityId: string;

  @ApiPropertyOptional({ 
    example: 'Quartier populaire au nord de Douala', 
    description: 'Description du quartier' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut actif du quartier' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateNeighborhoodDto {
  @ApiPropertyOptional({ example: 'Bonaberi', description: 'Nom du quartier' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ 
    example: 'uuid-ville-douala', 
    description: 'ID de la ville' 
  })
  @IsUUID()
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({ 
    example: 'Quartier populaire au nord de Douala', 
    description: 'Description du quartier' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Statut actif du quartier' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FilterNeighborhoodsDto {
  @ApiPropertyOptional({ 
    example: 'uuid-ville-douala', 
    description: 'Filtrer par ville' 
  })
  @IsUUID()
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filtrer par statut actif' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: 'Bonaberi', 
    description: 'Rechercher par nom de quartier' 
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
