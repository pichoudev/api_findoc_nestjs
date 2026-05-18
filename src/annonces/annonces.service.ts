import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueStatsDto, AnnonceHistoriqueDto } from './dto/historique.dto';
import { UpdateAnnonceDto } from './dto/update.dto';
import { QueryAnnonceDto } from './dto/query.dto';
import { Statut_annonce, Type_annonce, Type_notification } from '@prisma/client';
import { VercelBlobService } from '../vercel-blob/vercel-blob.service';
import { CreateAnnonceDto } from './dto/create.dto';
import { NotificationService } from 'src/notification/notification.service';
import { CreateNotificationDto } from 'src/notification/dto/createdto';
import { skip } from 'rxjs';

@Injectable()
export class AnnoncesService {
  private readonly logger = new Logger(AnnoncesService.name);

  constructor(private prisma: PrismaService,
    private readonly vercelBlobService: VercelBlobService,
    private readonly notification : NotificationService
  ) {}

  /** fonction genreale pour la 
   * Génération automatique de référence document
   */
  private generateReference(category: string): string {
    const year = new Date().getFullYear();

    const random = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();

    return `${category}-${year}-${random}`;
  }

  /**
   * fonction pour 
   * Téléverser plusieurs images pour les documents
   */
  async uploadDocumentImages(files: Express.Multer.File[], annonceId: string, documentIndex: number): Promise<string[]> {
    console.log('uploadDocumentImages - Début de la méthode');
    console.log('uploadDocumentImages - files.length:', files.length);
    console.log('uploadDocumentImages - annonceId:', annonceId);
    console.log('uploadDocumentImages - documentIndex:', documentIndex);
    
    if (!this.vercelBlobService.isConfigured()) {
      console.log('uploadDocumentImages - Vercel Blob non configuré');
      throw new BadRequestException('Le service de stockage n\'est pas configuré ou insdisponible');
    }

    console.log('uploadDocumentImages - Vercel Blob configuré, début upload');
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`uploadDocumentImages - Traitement fichier ${i}:`, file.originalname);
      const filename = `annonces/${annonceId}/documents/${documentIndex}/image_${i}_${Date.now()}.${file.originalname.split('.').pop()}`;
      console.log(`uploadDocumentImages - Nom de fichier généré: ${filename}`);
      
      try {
        console.log(`uploadDocumentImages - Upload du fichier ${i} en cours...`);
        const url = await this.vercelBlobService.uploadImage(file.buffer, filename);
        console.log(`uploadDocumentImages - Upload réussi pour ${i}: ${url}`);
        uploadedUrls.push(url);
        this.logger.log(`Image uploadée avec succès: ${filename}`);
      } catch (error) {
        console.log(`uploadDocumentImages - Erreur upload fichier ${i}:`, error);
        this.logger.error(`Erreur lors de l'upload de l'image ${filename}:`, error);
        throw new BadRequestException(`Erreur lors de l'upload de l'image ${i + 1}: ${error.message}`);
      }
    }

    console.log('uploadDocumentImages - Upload terminé, URLs:', uploadedUrls);
    return uploadedUrls;
  }

  /**
   * Récupérer l'historique des annonces d'un utilisateur avec statistiques
   */
  async getHistoriqueAnnonces(utilisateurId: string) {
    console.log('getHistoriqueAnnonces - utilisateurId:', utilisateurId);
    
    // Récupérer toutes les annonces de l'utilisateur
    const annonces = await this.prisma.annonce.findMany({
      where: {
        auteur_id: utilisateurId,
      },
      orderBy: {
        cree_le: 'desc',
      },
      include: {
        documents: {
          select: {
            id: true,
            categories: true,
            reference: true,
            photos_urls: true,
            est_lisible: true,
            mis_a_jour_le: true,
          },
        },
      },
    });

    // console.log('getHistoriqueAnnonces - annonces trouvées:', annonces.length);
    // console.log('getHistoriqueAnnonces - annonces:', JSON.stringify(annonces, null, 2));

    // Calculer les statistiques
    const stats: HistoriqueStatsDto = {
      en_cours: annonces.filter(a => a.statut === 'EN_COURS').length,
      archivees: annonces.filter(a => a.statut === 'ARCHIVE').length,
      rendues: annonces.filter(a => a.statut === 'RENDU').length,
      total: annonces.length,
    };

    // Transformer les annonces en format de réponse
    const annoncesHistorique = annonces.map(annonce => ({
      id: annonce.id,
      type: annonce.type,
      titre: annonce.titre,
      statut: annonce.statut,
      cree_le: annonce.cree_le,
      mis_a_jour_le: annonce.mis_a_jour_le,
      recompense: annonce.recompense,
      lieu: annonce.lieu,
      date_perte_ou_decouverte: annonce.date_perte_ou_decouverte,
      documents: annonce.documents.map(doc => ({
        id: doc.id,
        categories: doc.categories,
        reference: doc.reference,
        photos_urls: doc.photos_urls,
        est_lisible: doc.est_lisible,
        mis_a_jour_le: doc.mis_a_jour_le,
      })),
    }));

    return {
      annonces: annoncesHistorique,
      statistiques: stats,
    };
  }

  /**
   * Téléverser une seule image
   */
  async uploadSingleImage(file: Express.Multer.File, annonceId: string, prefix: string = 'annonce'): Promise<string> {
    if (!this.vercelBlobService.isConfigured()) {
      throw new BadRequestException('Le service de stockage n\'est pas configuré');
    }

    const filename = `annonces/${annonceId}/${prefix}_${Date.now()}.${file.originalname.split('.').pop()}`;
    
    try {
      const url = await this.vercelBlobService.uploadImage(file.buffer, filename);
      this.logger.log(`Image uploadée avec succès: ${filename}`);
      return url;
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload de l'image ${filename}:`, error);
      throw new BadRequestException(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  /**
   * fonction de Création d'une annonce par un auteur (utilisateur) connecte
   */
  async createAnnonce(data: CreateAnnonceDto, files?: Express.Multer.File[], utilisateurId?: string) {
    this.logger.log('Création annonce...');

    try {
      const {
        documents,
        auteur_id,
        ...annonceData
      } = data;

      // Utiliser userId du JWT si non fourni dans auteur_id
      const finalUserId = utilisateurId || auteur_id;

      /**
       * Vérifier si le service Vercel Blob est configuré
       */
      if (files && files.length > 0 && !this.vercelBlobService.isConfigured()) {
        throw new BadRequestException('Le service de stockage Vercel Blob n\'est pas configuré. Veuillez définir BLOB_READ_WRITE_TOKEN.');
      }

      /**
       * fonction pour Vérifier si utilisateur existe
       */
      const utilisateur = await this.prisma.utilisateur.findUnique({
        where: {
          id: finalUserId,
        },
      });

      if (!utilisateur) {
        throw new NotFoundException(`Utilisateur dont l'id est:${finalUserId} n'existe pas` );
      }

      /**
       * Traitement des documents avec téléversement des images sur Vercel Blob
       */
      let processedDocuments;

      if (files && files.length > 0) {
        // Upload des fichiers et association avec les documents
        console.log('Upload des fichiers en cours...');
        console.log('Nombre de fichiers:', files.length);
        console.log('Documents à traiter:', documents.length);
        const docUrls = await this.uploadDocumentImages(files, 'temp-annonce-id', 0);
        console.log('URLs obtenues après upload:', docUrls);

        // Traiter les documents avec les URLs téléversées
        processedDocuments = documents.map((doc, docIndex) => {
          // Distribuer les URLs téléversées entre les documents
          const urlsPerDocument = Math.ceil(docUrls.length / documents.length);
          const startIndex = docIndex * urlsPerDocument;
          const endIndex = Math.min(startIndex + urlsPerDocument, docUrls.length);
          const urlsForThisDocument = docUrls.slice(startIndex, endIndex);

          // Combiner avec les URLs existantes
          const allUrls = [
            ...(doc.photos_urls || []).filter(url => url.startsWith('http')),
            ...urlsForThisDocument
          ];

          return {
            categories: doc.categories,
            reference: doc.reference ?? this.generateReference(doc.categories[0]),
            photos_urls: allUrls,
            est_lisible: doc.est_lisible ?? true,
          };
        });
      } else {
        // Pas de fichiers, utiliser les URLs existantes
        processedDocuments = documents.map((doc) => ({
          categories: doc.categories,
          reference: doc.reference ?? this.generateReference(doc.categories[0]),
          photos_urls: doc.photos_urls || [],
          est_lisible: doc.est_lisible ?? true,
        }));
      }

        console.log('utilisateurId:', utilisateurId);
      console.log('processedDocuments:', processedDocuments);

      /**
       * Création annonce + documents avec les URLs téléversées
       */
      const annonce = await this.prisma.annonce.create({
        data: {
          ...annonceData,
          titre: annonceData.titre || 'Annonce sans titre',
          lieu: annonceData.lieu || '',
          auteur: { connect: { id: utilisateurId } },
          documents: {
            create: processedDocuments,
          },
        },

        include: {
          auteur: {
            select: {
              id: true,
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },

          documents: true,
        },
      });


      this.logger.log(
        `Annonce créée avec succès : ${annonce.id}`,
      );

          //  enregistrer la notification 
          const notif : CreateNotificationDto = {
            utilisateur_id : utilisateur.id,
            message : `votre annonce a ete publiee avec succes :, ${annonce.type}`,
            type: Type_notification.SIGNALEMENT
          }
          
          await this.notification.createNotification(utilisateur.id ,notif);  
      return {
        success: true,
        message:
          'Annonce créée avec succès',
        data: annonce,
        documents: data.documents,
      };
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(
        error.message ||
          'Erreur lors de la création de l’annonce',
      );
    }
  }

  /**
   * fonction pour Récupérer toutes les annonces
   *
   */
  async getAllAnnonces( query: QueryAnnonceDto) {
    const { limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;
    
    return this.prisma.annonce.findMany({
      include: {
        auteur: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            telephone: true,
          },
        },
         documents: true,
      },
      orderBy: {
        cree_le: 'desc',
      },
      skip,
      take: limit,

    });
  }

  /**
   * Récupérer une annonce par ID
   */
  async getAnnonceById(id: string) {
    const annonce = await this.prisma.annonce.findUnique({
      where: {
        id,
      },

      include: {
        auteur: true,
        documents: true,
        alerts: true,
      },
    });

    if (!annonce) {
      throw new NotFoundException(
        'Annonce introuvable',
      );
    }

    return annonce;
  }

  /**
   * Supprimer une annonce
   */
  async deleteAnnonce(id: string, utilisateur_id: string) {
    const annonce = await this.prisma.annonce.findUnique({
      where: {
        id,
      },
    });

    if (!annonce) {
      throw new NotFoundException(
        `Annonce avec l'id :${id} est introuvable`,
      );
    }

    if (annonce.auteur_id !== utilisateur_id) {
      console.log('annonce.auteur_id', annonce.auteur_id);
      console.log('utilisateur_id', utilisateur_id);
      throw new ForbiddenException('Vous n\'êtes pas autorisé à supprimer cette annonce');
    }

    await this.prisma.annonce.delete({
      where: {
        id,
      },
    });

      //  enregistrer la notification 
       const notif : CreateNotificationDto = {
        utilisateur_id : annonce.auteur_id,
        message : `votre annonce a ete supprimer avec succes :, ${annonce.type}`,
        type: Type_notification.SIGNALEMENT
     }
          
       await this.notification.createNotification(annonce.auteur_id ,notif);  

    return {
      success: true,
      message:
        'l\'Annonce supprimée avec succès',
    };
  }

  /**
   * Rechercher des annonces avec filtres
   */
  async findAnnonces(query: QueryAnnonceDto) {
    const { 
      type, 
      statut, 
      categorie, 
      lieu, 
      nom_proprietaire, 
      recherche,
      limit = 10,
      page = 1,
      orderBy = 'desc'
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (lieu) where.lieu = { contains: lieu, mode: 'insensitive' };
    if (nom_proprietaire) where.nom_proprietaire = { contains: nom_proprietaire, mode: 'insensitive' };
    
    if (recherche) {
      where.OR = [
        { titre: { contains: recherche, mode: 'insensitive' } },
        { description: { contains: recherche, mode: 'insensitive' } },
        { lieu: { contains: recherche, mode: 'insensitive' } },
        { nom_proprietaire: { contains: recherche, mode: 'insensitive' } },
      ];
    }

    if (categorie) {
      where.documents = {
        some: {
          categories: {
            has: categorie,
          },
        },
      };
    }

    const [annonces, total] = await Promise.all([
      this.prisma.annonce.findMany({
        where,
        include: {
          documents: true,
          auteur: {
            select: {
              id: true,
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },
        },
        orderBy: {
          cree_le: orderBy,
        },
        skip,
        take: limit,
      }),
      this.prisma.annonce.count({ where }),
    ]);

    return {
      data: annonces,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mettre à jour une annonce
   */
  async updateAnnonce(id: string, updateAnnonceDto: UpdateAnnonceDto, userId: string) {
    const annonce = await this.getAnnonceById(id);

    if (annonce.auteur_id !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette annonce');
    }

    const updateData: any = { ...updateAnnonceDto };

    if (updateAnnonceDto.documents) {
      updateData.documents = {
        deleteMany: {},
        create: updateAnnonceDto.documents.map(doc => ({
          ...doc,
          reference: doc.reference ?? this.generateReference(doc.categories?.[0] || 'DOC'),
          est_lisible: doc.est_lisible ?? true,
        })),
      };
      delete updateData.documents;
    }

    const updatedAnnonce = await this.prisma.annonce.update({
      where: { id },
      data: updateData,
      include: {
        documents: true,
        auteur: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
          },
        },
      },
    });

      //  enregistrer la notification 
       const notif : CreateNotificationDto = {
            utilisateur_id : annonce.auteur_id,
            message : `votre annonce a ete mise a jour avec succes :, ${annonce.type}`,
            type: Type_notification.SYSTEME
          }
          
          await this.notification.createNotification(annonce.auteur_id ,notif);  

    return updatedAnnonce;
  }

  /**
   * Récupérer les annonces d'un utilisateur
   */
  async findAnnoncesByUser(userId: string, query: QueryAnnonceDto) {
    const { limit = 10, page = 1, orderBy = 'desc' } = query;
    const skip = (page - 1) * limit;

    const [annonces, total] = await Promise.all([
      this.prisma.annonce.findMany({
        where: { auteur_id: userId },
        include: {
          documents: true,
        },
        orderBy: {
          cree_le: orderBy,
        },
        skip,
        take: limit,
      }),
      this.prisma.annonce.count({ where: { auteur_id: userId } }),
    ]);

    return {
      data: annonces,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mettre à jour le statut d'une annonce
   */
  async updateStatut(id: string, statut: Statut_annonce, userId: string) {
    const annonce = await this.getAnnonceById(id);

    if (annonce.auteur_id !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier cette annonce');
    }

    const updatedAnnonce = await this.prisma.annonce.update({
      where: { id },
      data: { statut },
      include: {
        documents: true,
        auteur: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
          },
        },
      },
    });

    return updatedAnnonce;
  }




  // fonction pour retourner les annonces de typer perdu
  async findAnnoncesPerdu() {
    
    return this.prisma.annonce.findMany({
      where: { type: Type_annonce.PERDU },
      include: {
        documents: true,
        auteur: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
          },
        },
      },
    });
  }



  // fonction pour retourner les annonces de typer perdu
  async findAnnoncesTrouve() {
    return this.prisma.annonce.findMany({
      where: { type: Type_annonce.TROUVE},
      include: {
        documents: true,
        auteur: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            telephone: true,
          },
        },
      },
    });
  }

}
