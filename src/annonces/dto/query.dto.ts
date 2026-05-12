import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Statut_annonce, Type_annonce, Categorie_Document } from '@prisma/client';

export class QueryAnnonceDto {
  @ApiPropertyOptional({
    description: 'Filtrer par type d\'annonce',
    enum: Type_annonce,
    example: Type_annonce.PERDU,
  })
  @IsOptional()
  @IsEnum(Type_annonce)
  type?: Type_annonce;

  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: Statut_annonce,
    example: Statut_annonce.EN_COURS,
  })
  @IsOptional()
  @IsEnum(Statut_annonce)
  statut?: Statut_annonce;

  @ApiPropertyOptional({
    description: 'Filtrer par catégorie de document',
    enum: Categorie_Document,
    example: Categorie_Document.CNI,
  })
  @IsOptional()
  @IsEnum(Categorie_Document)
  categorie?: Categorie_Document;

  @ApiPropertyOptional({
    description: 'Rechercher par lieu',
    example: 'Douala',
  })
  @IsOptional()
  @IsString()
  lieu?: string;

  @ApiPropertyOptional({
    description: 'Rechercher par nom du propriétaire',
    example: 'Jean',
  })
  @IsOptional()
  @IsString()
  nom_proprietaire?: string;

  @ApiPropertyOptional({
    description: 'Recherche textuelle dans le titre ou description',
    example: 'carte perdue',
  })
  @IsOptional()
  @IsString()
  recherche?: string;

  @ApiPropertyOptional({
    description: 'Nombre d\'éléments par page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Numéro de page',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Ordre de tri',
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  orderBy?: 'asc' | 'desc' = 'desc';
}
