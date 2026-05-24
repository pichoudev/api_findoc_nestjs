import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsEmail } from 'class-validator';
import { Mode_paiement } from '@prisma/client';

export class CreatePaiementDto {

  @ApiProperty({ description: 'Montant du paiement', example: 5000 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  montant: number;

  @ApiProperty({ enum: Mode_paiement, description: 'Mode de paiement', example: Mode_paiement.OM })
  @IsEnum(Mode_paiement)
  @IsNotEmpty()
  mode_paiement: Mode_paiement;

  @ApiPropertyOptional({ description: 'Statut du paiement', example: 'RECU', default: 'RECU' })
  @IsString()
  @IsOptional()
  statut?: string = 'RECU';

  @ApiProperty({ description: "ID de l'annonce", example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  annonce_id: string;

  @ApiPropertyOptional({ description: 'Description du paiement', example: 'Paiement pour annonce #123' })
  @IsString()
  @IsOptional()
  description?: string;

  // ── Champs ajoutés pour Notch Pay ──────────────────────────────────────────

  @ApiProperty({ description: 'Email du client pour Notch Pay', example: 'client@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone Mobile Money (OM/MOMO)', example: '237690000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Prénom du client', example: 'Jean' })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Nom du client', example: 'Dupont' })
  @IsString()
  @IsOptional()
  last_name?: string;
}