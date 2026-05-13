import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaiementDto } from './dto/create.dto';
import { UpdatePaiementDto } from './dto/update.dto';

@Injectable()
export class PaiementsService {

    // constructeur
    constructor(
        private readonly prisma: PrismaService
    ) {}


     // fonction pour enregistrer un paiement
    async createPaiement(data: CreatePaiementDto, utilisateurId: string) {
    // 1. Vérification si l'annonce existe
    const annonce = await this.prisma.annonce.findUnique({
        where: {
        id: data.annonce_id 
        }
    });

    if (!annonce) {
        throw new NotFoundException('Annonce non trouvée'); // ← utilise NotFoundException
    }

    // 2. Vérification si l'utilisateur existe
    const utilisateur = await this.prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
    });

    if (!utilisateur) {
        throw new NotFoundException('Utilisateur non trouvé');
    }

    // 3. Création du paiement
    const paiement = await this.prisma.paiement.create({
        data: {
        montant: data.montant,
        mode_paiement: data.mode_paiement,
        statut: data.statut ?? "RECU",
        auteur_id: utilisateurId,
        annonce_id: data.annonce_id, 
        }
    });

    return paiement;
    }


    // fonction pour supprimer un paiement
    async deletePaiement(id: string) {
        // 1. Vérification si le paiement existe
        const paiement = await this.prisma.paiement.findUnique({
            where: {
                id
            }
        });

        if (!paiement) {
            throw new NotFoundException('Paiement non trouvé dans la base de donnees');
        }

        const paiementSupprime = await this.prisma.paiement.delete({
            where: {
                id
            }
        });

        return {
            message: "Paiement supprimé avec succès",
            data: paiementSupprime
        };
    }

    // fonction pour obtenir tous les paiements
    async getAllPaiements() {
        const paiements = await this.prisma.paiement.findMany();
        return paiements;
    }

    // fonction pour obtenir un paiement par son id
    async getPaiementById(id: string) {
        const paiement = await this.prisma.paiement.findUnique({
            where: {
                id
            }
        });

        if (!paiement) {
            throw new NotFoundException('Paiement non trouvé dans la base de donnees');
        }

        return paiement;
    }

    // fonction pour mettre à jour un paiement
    async updatePaiement(id: string, data: UpdatePaiementDto) {
        const paiement = await this.prisma.paiement.findUnique({
            where: {
                id
            }
        });

        if (!paiement) {
            throw new NotFoundException('Paiement non trouvé dans la base de donnees');
        }

        const paiementMisAJour = await this.prisma.paiement.update({
            where: {
                id
            },
            data: data
        });

        return {
            message: "Paiement mis à jour avec succès",
            data: paiementMisAJour
        };
    }
}
