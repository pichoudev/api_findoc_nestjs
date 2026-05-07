import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VercelBlobService } from '../vercel-blob/vercel-blob.service';
import * as bcrypt from 'bcrypt';
import { Region } from '@prisma/client';

@Injectable()
export class MeService {
  constructor(
    private prisma: PrismaService,
    private vercelBlobService: VercelBlobService,
  ) {}

  // Obtenir les informations de l'utilisateur connecté
  async getProfile(userId: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        role: true,
        photo: true,
        ville:true,
        region:true,
        est_verifie: true,
        est_actif: true,
        cree_le: true,
        mis_a_jour_le: true,
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return utilisateur;
  }

  // Mettre à jour le profil de l'utilisateur connecté
  async updateProfile(userId: string, updateData: {
    prenom?: string;
    nom?: string;
    telephone?: string;
    email?: string;
    one_signal_id?: string;
    ville?: string;
    region?: Region;
  }) {
    // Vérifier si l'utilisateur existe
    const existingUser = await this.getProfile(userId);

    // Si l'email est modifié, vérifier qu'il n'existe pas déjà
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.prisma.utilisateur.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        throw new BadRequestException('Un utilisateur avec cet email existe déjà');
      }
    }

    const utilisateur = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        telephone: true,
        role: true,
        photo: true,
        ville:true,
        region: true,
        est_verifie: true,
        est_actif: true,
        cree_le: true,
        mis_a_jour_le: true,
      },
    });

    return utilisateur;
  }

  // Mettre à jour le mot de passe
  async updatePassword(userId: string, passwordData: {
    ancien_mot_de_passe: string;
    nouveau_mot_de_passe: string;
  }) {
    // Vérifier si l'utilisateur existe et récupérer le mot de passe actuel
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mot_de_passe_hash: true,
      },
    });

    if (!utilisateur) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(
      passwordData.ancien_mot_de_passe,
      utilisateur.mot_de_passe_hash
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(passwordData.nouveau_mot_de_passe, 10);

    // Mettre à jour le mot de passe
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        mot_de_passe_hash: hashedNewPassword,
      },
    });

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  // Uploader la photo de profil
  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    // Vérifier si le service blob est configuré
    if (!this.vercelBlobService.isConfigured()) {
      throw new BadRequestException('Service d\'upload non configuré');
    }

    // Vérifier le type de fichier
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit être une image');
    }

    // Générer un nom de fichier unique
    const fileExtension = file.originalname.split('.').pop();
    const filename = `profile-${userId}-${Date.now()}.${fileExtension}`;

    try {
      // Uploader l'image sur Vercel Blob
      const photoUrl = await this.vercelBlobService.uploadImage(
        file.buffer,
        filename
      );

      // Mettre à jour l'utilisateur avec la nouvelle URL de photo
      const utilisateur = await this.prisma.utilisateur.update({
        where: { id: userId },
        data: {
          photo: photoUrl,
        },
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          telephone: true,
          role: true,
          photo: true,
          est_verifie: true,
          est_actif: true,
          cree_le: true,
          mis_a_jour_le: true,
        },
      });

      return {
        message: 'Photo de profil mise à jour avec succès',
        utilisateur,
        photoUrl,
      };
    } catch (error) {
      throw new BadRequestException('Erreur lors de l\'upload de la photo: ' + error.message);
    }
  }

  // Supprimer la photo de profil
  async removeProfilePhoto(userId: string) {
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        photo: null,
      },
    });

    return { message: 'Photo de profil supprimée avec succès' };
  }
}
