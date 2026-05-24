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




// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { CreatePaiementDto } from './dto/create.dto';
// import { UpdatePaiementDto } from './dto/update.dto';
// import axios from 'axios';

// @Injectable()
// export class PaiementsService {
//   private readonly apiBase = 'https://api.notchpay.co';
//   private readonly publicKey: string;
//   private readonly privateKey: string;
//   private readonly callbackUrl: string;

// constructor(
//   private readonly prisma: PrismaService,
//   private readonly config: ConfigService,
// ) {
//   this.publicKey  = this.config.getOrThrow<string>('NOTCHPAY_PUBLIC_KEY');
//   this.privateKey = this.config.getOrThrow<string>('NOTCHPAY_PRIVATE_KEY');
// //   this.callbackUrl = this.config.getOrThrow<string>('NOTCHPAY_CALLBACK_URL');
// }

//   // ─── Initier un paiement via Notch Pay ──────────────────────────────────
//   async createPaiement(data: CreatePaiementDto, utilisateurId: string) {

//     // 1. Vérifier l'annonce
//     const annonce = await this.prisma.annonce.findUnique({
//       where: { id: data.annonce_id },
//     });
//     if (!annonce) throw new NotFoundException('Annonce non trouvée');

//     // 2. Vérifier l'utilisateur
//     const utilisateur = await this.prisma.utilisateur.findUnique({
//       where: { id: utilisateurId },
//     });
//     if (!utilisateur) throw new NotFoundException('Utilisateur non trouvé');

//     // 3. Générer une référence unique
//     const reference = `pay_${utilisateurId}_${Date.now()}`;

//     // 4. Construire le payload Notch Pay
//     const notchPayload: Record<string, any> = {
//       amount: data.montant,
//       currency: 'XAF',
//       email: data.email,
//       reference,
//       description: data.description ?? `Paiement annonce ${data.annonce_id}`,
//       callback: this.callbackUrl,
//     };

//     // Champs optionnels si fournis
//     if (data.phone)      notchPayload.phone      = data.phone;
//     if (data.first_name) notchPayload.first_name = data.first_name;
//     if (data.last_name)  notchPayload.last_name  = data.last_name;

//     // 5. Appel à l'API Notch Pay
//     let notchPayResponse: any;
//     try {
//       const { data: res } = await axios.post(
//         `${this.apiBase}/payments/initialize`,
//         notchPayload,
//         {
//           headers: {
//             Authorization: this.publicKey,
//             'Content-Type': 'application/json',
//           },
//         },
//       );
//       notchPayResponse = res;
//     } catch (err) {
//       throw new BadRequestException(
//         err?.response?.data?.message ?? "Erreur Notch Pay lors de l'initialisation",
//       );
//     }

//     // 6. Sauvegarder en base avec statut PENDING
//     const paiement = await this.prisma.paiement.create({
//       data: {
//         montant:       data.montant,
//         mode_paiement: data.mode_paiement,
//         statut:        'EN_COURS',
//         auteur_id:     utilisateurId,
//         annonce_id:    data.annonce_id,
//         reference,
//         notchpay_url:  notchPayResponse?.authorization_url ?? null,
//       },
//     });

//     // 7. Retourner le paiement + l'URL de redirection
//     return {
//       message: "Paiement initialisé, redirigez l'utilisateur vers l'URL de paiement",
//       paiement,
//       payment_url: notchPayResponse?.authorization_url,
//     };
//   }

//   // ─── Callback Notch Pay ─────────────────────────────────────────────────
//   async handleCallback(reference: string) {

//     if (!reference) {
//       throw new BadRequestException('Référence manquante dans le callback');
//     }

//     // 1. Vérifier que le paiement existe en base
//     const paiement = await this.prisma.paiement.findUnique({
//       where: { reference },
//     });
//     if (!paiement) throw new NotFoundException('Paiement non trouvé en base');

//     // 2. Vérifier le statut auprès de Notch Pay (clé privée)
//     let notchData: any;
//     try {
//       const { data } = await axios.get(
//         `${this.apiBase}/payments/${reference}`,
//         {
//           headers: {
//             Authorization: this.privateKey,
//             'Content-Type': 'application/json',
//           },
//         },
//       );
//       notchData = data;
//     } catch (err) {
//       throw new BadRequestException(
//         'Impossible de vérifier le paiement auprès de Notch Pay',
//       );
//     }

//     // 3. Mapper le statut Notch Pay vers ton statut interne
//     const statutNotch = notchData?.transaction?.status;
//     const statut =
//       statutNotch === 'complete'  ? 'RECU'    :
//       statutNotch === 'failed'    ? 'ECHOUE'  :
//       statutNotch === 'cancelled' ? 'ANNULE'  :
//                                     'PENDING';

//     // 4. Mettre à jour le statut en base
//     const paiementMisAJour = await this.prisma.paiement.update({
//       where: { reference },
//       data: { statut },
//     });

//     return {
//       message: `Paiement marqué comme ${statut}`,
//       data: paiementMisAJour,
//     };
//   }

//   // ─── Vérification manuelle d'un paiement ────────────────────────────────
//   async verifyPaiement(reference: string) {
//     try {
//       const { data } = await axios.get(
//         `${this.apiBase}/payments/${reference}`,
//         {
//           headers: {
//             Authorization: this.privateKey,
//             'Content-Type': 'application/json',
//           },
//         },
//       );
//       return data;
//     } catch (err) {
//       throw new BadRequestException(
//         err?.response?.data?.message ?? 'Erreur lors de la vérification du paiement',
//       );
//     }
//   }

//   // ─── Supprimer un paiement ───────────────────────────────────────────────
//   async deletePaiement(id: string) {
//     const paiement = await this.prisma.paiement.findUnique({ where: { id } });
//     if (!paiement) {
//       throw new NotFoundException('Paiement non trouvé dans la base de données');
//     }

//     const paiementSupprime = await this.prisma.paiement.delete({ where: { id } });
//     return {
//       message: 'Paiement supprimé avec succès',
//       data: paiementSupprime,
//     };
//   }

//   // ─── Obtenir tous les paiements ──────────────────────────────────────────
//   async getAllPaiements() {
//     return this.prisma.paiement.findMany({
//       orderBy: { cree_le: 'desc' },   // ← adapte selon ton schema
//     });
//   }

//   // ─── Obtenir un paiement par ID ──────────────────────────────────────────
//   async getPaiementById(id: string) {
//     const paiement = await this.prisma.paiement.findUnique({ where: { id } });
//     if (!paiement) {
//       throw new NotFoundException('Paiement non trouvé dans la base de données');
//     }
//     return paiement;
//   }

//   // ─── Mettre à jour un paiement ───────────────────────────────────────────
//   async updatePaiement(id: string, data: UpdatePaiementDto) {
//     const paiement = await this.prisma.paiement.findUnique({ where: { id } });
//     if (!paiement) {
//       throw new NotFoundException('Paiement non trouvé dans la base de données');
//     }

//     const paiementMisAJour = await this.prisma.paiement.update({
//       where: { id },
//       data,
//     });
//     return {
//       message: 'Paiement mis à jour avec succès',
//       data: paiementMisAJour,
//     };
//   }
// }