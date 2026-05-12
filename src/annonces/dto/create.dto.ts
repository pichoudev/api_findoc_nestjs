import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsBoolean,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  Statut_annonce,
  Type_annonce,
  Categorie_Document,
} from '@prisma/client';

class CreateDocumentDto {
  @ApiProperty({
    description: 'Catégories du document',
    enum: Categorie_Document,
    isArray: true,
    example: ['CNI'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Categorie_Document, { each: true })
  categories: Categorie_Document[];

  @ApiPropertyOptional({
    description: 'Référence du document',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    description: 'Photos du document',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  photos_urls?: string[] =[];

  @ApiPropertyOptional({
    description: 'Indique si le document est lisible',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  est_lisible?: boolean;
}

export class CreateAnnonceDto {
  @ApiProperty({
    description: "Type d'annonce",
    enum: Type_annonce,
    example: Type_annonce.PERDU,
  })
  @IsEnum(Type_annonce)
  type: Type_annonce;

  @ApiPropertyOptional({
    description: 'Date de naissance',
    example: '1998-05-12',
  })
  @IsOptional()
  @IsDateString()
  date_de_naissance?: Date;

  @ApiProperty({
    description: 'Nom du propriétaire',
    example: 'Jean Dupont',
  })
  @IsString()
  nom_proprietaire: string;

  @ApiProperty({
    description: "Titre de l'annonce",
    example: 'Carte nationale perdue',
  })
  @IsString()
  titre: string;

  @ApiPropertyOptional({
    description: 'Récompense',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  recompense?: number;

  @ApiProperty({
    description: "Description de l'annonce",
    example: 'Document perdu au marché central',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Lieu de perte ou découverte',
    example: 'Douala',
  })
  @IsString()
  lieu: string;

  @ApiProperty({
    description: 'Date de perte ou découverte',
    example: '2026-05-10T10:00:00.000Z',
  })
  @IsDateString()
  date_perte_ou_decouverte: Date;

  @ApiPropertyOptional({
    description: "Statut de l'annonce",
    enum: Statut_annonce,
    example: Statut_annonce.EN_COURS,
  })
  @IsOptional()
  @IsEnum(Statut_annonce)
  statut?: Statut_annonce;

  @ApiPropertyOptional({
    description: "ID de l'auteur (optionnel, sera pris depuis le JWT)",
    example: 'uuid-utilisateur',
  })
  @IsOptional()
  @IsUUID()
  auteur_id?: string;

  @ApiProperty({
    description: 'Documents associés à l’annonce',
    type: [CreateDocumentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  documents: CreateDocumentDto[];

  }
