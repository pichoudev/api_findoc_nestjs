import { ApiProperty } from '@nestjs/swagger';
import { Statut_annonce, Categorie_Document } from '@prisma/client';

export class HistoriqueStatsDto {
  @ApiProperty({
    description: 'Nombre d\'annonces en cours',
    example: 3,
  })
  en_cours: number;

  @ApiProperty({
    description: 'Nombre d\'annonces archivées',
    example: 5,
  })
  archivees: number;

  @ApiProperty({
    description: 'Nombre d\'annonces rendues',
    example: 2,
  })
  rendues: number;

  @ApiProperty({
    description: 'Total des annonces',
    example: 10,
  })
  total: number;
}

export class DocumentHistoriqueDto {
  @ApiProperty({
    description: 'ID du document',
    example: 'uuid-document',
  })
  id: string;

  @ApiProperty({
    description: 'Catégories du document',
    enum: Categorie_Document,
    isArray: true,
    example: ['CNI'],
  })
  categories: Categorie_Document[];

  @ApiProperty({
    description: 'Référence du document',
    example: 'CNI-2024-123456',
  })
  reference: string;

  @ApiProperty({
    description: 'Photos du document',
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
  })
  photos_urls: string[];

  @ApiProperty({
    description: 'Indique si le document est lisible',
    example: true,
  })
  est_lisible: boolean;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2026-05-11T15:30:00.000Z',
  })
  mis_a_jour_le: Date;
}

export class AnnonceHistoriqueDto {
  @ApiProperty({
    description: 'ID de l\'annonce',
    example: 'uuid-annonce',
  })
  id: string;

  @ApiProperty({
    description: 'Type de l\'annonce',
    enum: Statut_annonce,
    example: 'PERDU',
  })
  type: string;

  @ApiProperty({
    description: 'Titre de l\'annonce',
    example: 'Carte nationale d\'identité perdue',
  })
  titre: string;

  @ApiProperty({
    description: 'Statut actuel de l\'annonce',
    enum: Statut_annonce,
    example: 'EN_COURS',
  })
  statut: string;

  @ApiProperty({
    description: 'Date de création',
    example: '2026-05-10T10:00:00.000Z',
  })
  cree_le: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2026-05-11T15:30:00.000Z',
  })
  mis_a_jour_le: Date;

  @ApiProperty({
    description: 'Récompense proposée',
    example: 50000,
  })
  recompense?: number;

  @ApiProperty({
    description: 'Lieu de perte ou découverte',
    example: 'Douala, Marché Central',
  })
  lieu: string;

  @ApiProperty({
    description: 'Documents associés à l\'annonce',
    type: [DocumentHistoriqueDto],
  })
  documents: DocumentHistoriqueDto[];
}

export class HistoriqueAnnoncesResponseDto {
  @ApiProperty({
    description: 'Liste des annonces de l\'utilisateur',
    type: [AnnonceHistoriqueDto],
  })
  annonces: AnnonceHistoriqueDto[];

  @ApiProperty({
    description: 'Statistiques des annonces par statut',
    type: HistoriqueStatsDto,
  })
  statistiques: HistoriqueStatsDto;

  @ApiProperty({
    description: 'Nombre total d\'annonces',
    example: 10,
  })
  total: number;
}
