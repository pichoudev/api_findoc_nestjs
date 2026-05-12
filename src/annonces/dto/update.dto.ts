import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Statut_annonce, Categorie_Document } from '@prisma/client';

class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: 'Catégories du document',
    enum: Categorie_Document,
    isArray: true,
    example: ['CNI'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Categorie_Document, { each: true })
  categories?: Categorie_Document[];

  @ApiPropertyOptional({
    description: 'Référence du document',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Photos du document',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos_urls?: string[];

  @ApiPropertyOptional({
    description: 'Indique si le document est lisible',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  est_lisible?: boolean;
}

export class UpdateAnnonceDto {
  @ApiPropertyOptional({
    description: 'Titre de l\'annonce',
    example: 'Carte nationale perdue',
  })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({
    description: 'Récompense',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  recompense?: number;

  @ApiPropertyOptional({
    description: "Description de l'annonce",
    example: 'Document perdu au marché central',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lieu de perte ou découverte',
    example: 'Douala',
  })
  @IsOptional()
  @IsString()
  lieu?: string;

  @ApiPropertyOptional({
    description: 'Date de perte ou découverte',
    example: '2026-05-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  date_perte_ou_decouverte?: Date;

  @ApiPropertyOptional({
    description: "Statut de l'annonce",
    enum: Statut_annonce,
    example: Statut_annonce.RENDU,
  })
  @IsOptional()
  @IsEnum(Statut_annonce)
  statut?: Statut_annonce;

  @ApiPropertyOptional({
    description: 'Documents associés à l\'annonce',
    type: [UpdateDocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDocumentDto)
  documents?: UpdateDocumentDto[];
}
