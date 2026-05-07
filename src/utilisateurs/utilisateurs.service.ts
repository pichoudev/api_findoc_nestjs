import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VercelBlobService } from '../vercel-blob/vercel-blob.service';
import { CreationUtilisateurDto } from './dto/creationUtilisateurDto.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {

    constructor(
        private prisma: PrismaService,
        private vercelBlobService: VercelBlobService
    ) {}

    // retourner la liste des utilisateurs avec pagination
    async findAll(page: number = 1, limit: number = 100) {
        const skip = (page - 1) * limit;
        
        const [utilisateurs, total] = await Promise.all([
            this.prisma.utilisateur.findMany({
                skip,
                take: limit,
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
                orderBy: {
                    cree_le: 'desc',
                },
            }),
            this.prisma.utilisateur.count(),
        ]);

        return {
            utilisateurs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    // retourner un utilisateur par son id
    async findOne(id: string) {
        const utilisateur = await this.prisma.utilisateur.findUnique({
            where: { id },
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

        if (!utilisateur) {
            throw new NotFoundException('Utilisateur non trouvé');
        }

        return utilisateur;
    }

    // trouver un utilisateur par email
    async findByEmail(email: string) {
        return this.prisma.utilisateur.findUnique({
            where: { email },
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
    }

    // créer un utilisateur avec le DTO
    async create(createUtilisateurDto: CreationUtilisateurDto) {
        // Vérifier si l'email existe déjà
        const existingUser = await this.prisma.utilisateur.findUnique({
            where: { email: createUtilisateurDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Un utilisateur avec cet email existe déjà');
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(createUtilisateurDto.mot_de_passe, 10);

        // Préparer les données de création
        const createFields = {
            prenom: createUtilisateurDto.prenom,
            nom: createUtilisateurDto.nom,
            email: createUtilisateurDto.email,
            telephone: createUtilisateurDto.telephone,
            mot_de_passe_hash: hashedPassword,
            role: createUtilisateurDto.role,
            photo: createUtilisateurDto.photo,
            ville: createUtilisateurDto.ville,
            region:createUtilisateurDto.region,
            est_actif: true, // Les utilisateurs créés par admin sont actifs par défaut
            est_verifie: true, // Les utilisateurs créés par admin sont vérifiés par défaut
        };

        // Créer l'utilisateur
        const utilisateur = await this.prisma.utilisateur.create({
            data: createFields,
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

        return utilisateur;
    }

    // mettre à jour un utilisateur
    async update(id: string, updateData: Partial<CreationUtilisateurDto>) {
        // Vérifier si l'utilisateur existe
        const existingUser = await this.findOne(id);

        // Si l'email est modifié, vérifier qu'il n'existe pas déjà
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await this.prisma.utilisateur.findUnique({
                where: { email: updateData.email },
            });

            if (emailExists) {
                throw new ConflictException('Un utilisateur avec cet email existe déjà');
            }
        }

        // Préparer les données de mise à jour
        const updateFields: any = {
            prenom: updateData.prenom,
            nom: updateData.nom,
            email: updateData.email,
            telephone: updateData.telephone,
            role: updateData.role,
            photo: updateData.photo,
            ville:updateData.ville,
            region:updateData.region,
        };

        // Si le mot de passe est fourni, le hasher
        if (updateData.mot_de_passe) {
            updateFields.mot_de_passe_hash = await bcrypt.hash(updateData.mot_de_passe, 10);
        }

        const utilisateur = await this.prisma.utilisateur.update({
            where: { id },
            data: updateFields,
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

        return utilisateur;
    }

    // supprimer un utilisateur (soft delete)
    async remove(id: string) {
        await this.findOne(id); // Vérifie si l'utilisateur existe

        return this.prisma.utilisateur.update({
            where: { id },
            data: {
                est_actif: false, // Désactiver au lieu de supprimer
            },
        });
    }

    // activer/désactiver un utilisateur
    async toggleActive(id: string) {
        const utilisateur = await this.findOne(id);

        return this.prisma.utilisateur.update({
            where: { id },
            data: {
                est_actif: !utilisateur.est_actif,
            },
            select: {
                id: true,
                prenom: true,
                nom: true,
                email: true,
                role: true,
                est_actif: true,
            },
        });
    }

    // compter les utilisateurs par rôle
    async countByRole() {
        const counts = await this.prisma.utilisateur.groupBy({
            by: ['role'],
            _count: {
                role: true,
            },
        });

        return counts.map(item => ({
            role: item.role,
            count: item._count.role,
        }));
    }

    // rechercher des utilisateurs
    async search(query: string, page: number = 1, limit: number = 100) {
        const skip = (page - 1) * limit;

        const [utilisateurs, total] = await Promise.all([
            this.prisma.utilisateur.findMany({
                where: {
                    OR: [
                        {
                            prenom: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                        {
                            nom: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                        {
                            email: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                    ],
                },
                skip,
                take: limit,
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
                },
                orderBy: {
                    cree_le: 'desc',
                },
            }),
            this.prisma.utilisateur.count({
                where: {
                    OR: [
                        {
                            prenom: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                        {
                            nom: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                        {
                            email: {
                                contains: query,
                                mode: 'insensitive',
                            },
                        },
                    ],
                },
            }),
        ]);

        return {
            utilisateurs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    // Uploader la photo de profil pour un utilisateur (admin)
    async uploadUserPhoto(userId: string, file: Express.Multer.File) {
        // Vérifier si le service blob est configuré
        if (!this.vercelBlobService.isConfigured()) {
            throw new BadRequestException('Service d\'upload non configuré');
        }

        // Vérifier si l'utilisateur existe
        await this.findOne(userId);

        // Vérifier le type de fichier
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Le fichier doit être une image');
        }

        // Générer un nom de fichier unique
        const fileExtension = file.originalname.split('.').pop();
        const filename = `user-${userId}-${Date.now()}.${fileExtension}`;

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

    // Supprimer la photo de profil d'un utilisateur (admin)
    async removeUserPhoto(userId: string) {
        // Vérifier si l'utilisateur existe
        await this.findOne(userId);

        await this.prisma.utilisateur.update({
            where: { id: userId },
            data: {
                photo: null,
            },
        });

        return { message: 'Photo de profil supprimée avec succès' };
    }
}
