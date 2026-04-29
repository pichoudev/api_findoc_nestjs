import {
  Controller,
  Post,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  NotFoundException,
  Patch,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { InterventionsService } from './interventions.service';
import { InterventionStatus } from '@prisma/client';
import { multerOptions } from '../../multer.config';
import { SharpPipe } from '../../sharp.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';

@ApiTags('interventions-upload')
@Controller('interventions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InterventionUploadController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post(':id/upload-photo')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Uploader une photo pour une intervention',
    description: 'Permet d\'uploader une photo et de l\'associer automatiquement à une intervention. L\'image est traitée et uploadée sur Vercel Blob storage.'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image (JPEG, PNG, WebP) - max 5MB'
        },
        comment: {
          type: 'string',
          description: 'Commentaire optionnel pour la photo',
          example: 'Photo avant intervention'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Photo uploadée avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  @ApiResponse({ status: 400, description: 'Format de fichier invalide ou erreur de traitement' })
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(SharpPipe) photoUrl?: string,
    @Body('comment') comment?: string,
  ) {
    try {
      console.log('InterventionUploadController - Upload request received:', {
        interventionId: id,
        hasPhotoUrl: !!photoUrl,
        photoUrl: photoUrl,
        comment: comment
      });

      // Vérifier que l'intervention existe
      const intervention = await this.interventionsService.findOne(id);
      if (!intervention) {
        throw new NotFoundException('Intervention non trouvée');
      }

      if (!photoUrl) {
        throw new BadRequestException('Aucune photo fournie');
      }

      // Mettre à jour l'intervention avec la photo
      const updatedIntervention = await this.interventionsService.updateStatus(
        id,
        intervention.status,
        photoUrl,
        comment || `Photo uploadée le ${new Date().toLocaleString('fr-FR')}`,
      );

      console.log('InterventionUploadController - Photo uploaded successfully:', {
        interventionId: id,
        photoUrl: photoUrl,
        comment: comment
      });

      return {
        success: true,
        message: 'Photo uploadée avec succès',
        data: {
          interventionId: id,
          photoUrl: photoUrl,
          comment: comment,
          uploadedAt: new Date().toISOString(),
        },
        intervention: updatedIntervention,
      };
    } catch (error) {
      console.error('InterventionUploadController - Error uploading photo:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de l\'upload de la photo: ' + error.message);
    }
  }

  @Patch(':id/photo')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Mettre à jour la photo d\'une intervention',
    description: 'Permet de remplacer la photo existante d\'une intervention par une nouvelle'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Nouvelle photo (JPEG, PNG, WebP) - max 5MB'
        },
        comment: {
          type: 'string',
          description: 'Commentaire optionnel pour la nouvelle photo',
          example: 'Photo mise à jour'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Photo mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  @ApiResponse({ status: 400, description: 'Format de fichier invalide' })
  async updatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(SharpPipe) photoUrl?: string,
    @Body('comment') comment?: string,
  ) {
    try {
      console.log('InterventionUploadController - Update photo request received:', {
        interventionId: id,
        hasPhotoUrl: !!photoUrl,
        photoUrl: photoUrl,
        comment: comment
      });

      // Vérifier que l'intervention existe
      const intervention = await this.interventionsService.findOne(id);
      if (!intervention) {
        throw new NotFoundException('Intervention non trouvée');
      }

      if (!photoUrl) {
        throw new BadRequestException('Aucune photo fournie');
      }

      // Mettre à jour l'intervention avec la nouvelle photo
      const updatedIntervention = await this.interventionsService.updateStatus(
        id,
        intervention.status,
        photoUrl,
        comment || `Photo mise à jour le ${new Date().toLocaleString('fr-FR')}`,
      );

      console.log('InterventionUploadController - Photo updated successfully:', {
        interventionId: id,
        photoUrl: photoUrl,
        comment: comment
      });

      return {
        success: true,
        message: 'Photo mise à jour avec succès',
        data: {
          interventionId: id,
          photoUrl: photoUrl,
          comment: comment,
          updatedAt: new Date().toISOString(),
        },
        intervention: updatedIntervention,
      };
    } catch (error) {
      console.error('InterventionUploadController - Error updating photo:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la mise à jour de la photo: ' + error.message);
    }
  }

  @Post(':id/upload-photo-url')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Ajouter une photo par URL',
    description: 'Permet d\'ajouter une photo à une intervention en fournissant directement l\'URL (utile pour les photos depuis un service externe)'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photoUrl: {
          type: 'string',
          format: 'uri',
          description: 'URL de la photo',
          example: 'https://example.com/photo.jpg'
        },
        comment: {
          type: 'string',
          description: 'Commentaire optionnel',
          example: 'Photo depuis Google Cloud Storage'
        }
      },
      required: ['photoUrl']
    }
  })
  @ApiResponse({ status: 200, description: 'Photo ajoutée avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async addPhotoUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('photoUrl') photoUrl: string,
    @Body('comment') comment?: string,
  ) {
    try {
      console.log('InterventionUploadController - Add photo URL request received:', {
        interventionId: id,
        photoUrl: photoUrl,
        comment: comment
      });

      // Valider l'URL
      try {
        new URL(photoUrl);
      } catch {
        throw new BadRequestException('URL de photo invalide');
      }

      const intervention = await this.interventionsService.findOne(id);
      if (!intervention) {
        throw new NotFoundException('Intervention non trouvée');
      }

      // Mettre à jour l'intervention avec la nouvelle photo
      const updatedIntervention = await this.interventionsService.updateStatus(
        id,
        intervention.status,
        photoUrl,
        comment || `Photo ajoutée le ${new Date().toLocaleString('fr-FR')}`,
      );

      console.log('InterventionUploadController - Photo URL added successfully:', {
        interventionId: id,
        photoUrl: photoUrl,
        comment: comment
      });

      return {
        success: true,
        message: 'Photo ajoutée avec succès',
        data: {
          interventionId: id,
          photoUrl: photoUrl,
          comment: comment,
          addedAt: new Date().toISOString(),
        },
        intervention: updatedIntervention,
      };
    } catch (error) {
      console.error('InterventionUploadController - Error adding photo URL:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de l\'ajout de la photo: ' + error.message);
    }
  }

  @Get(':id/photos')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Obtenir les informations sur les photos d\'une intervention',
    description: 'Retourne les URLs et métadonnées des photos associées à une intervention'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Informations des photos récupérées' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async getPhotos(@Param('id', ParseUUIDPipe) id: string) {
    try {
      console.log('InterventionUploadController - Get photos request received:', {
        interventionId: id
      });

      const intervention = await this.interventionsService.findOne(id);
      if (!intervention) {
        throw new NotFoundException('Intervention non trouvée');
      }

      const photos: any[] = [];
      
      // Si l'intervention a une photoUrl, l'ajouter à la liste
      if (intervention.photoUrl) {
        photos.push({
          url: intervention.photoUrl,
          type: 'intervention_photo',
          uploadedAt: new Date().toISOString(), // Utiliser la date actuelle
          comment: intervention.comment,
        });
      }

      console.log('InterventionUploadController - Photos retrieved:', {
        interventionId: id,
        photoCount: photos.length,
        hasPhoto: !!intervention.photoUrl
      });

      return {
        interventionId: id,
        photos: photos,
        count: photos.length,
      };
    } catch (error) {
      console.error('InterventionUploadController - Error getting photos:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la récupération des photos: ' + error.message);
    }
  }

  @Patch(':id/remove-photo')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Supprimer la photo d\'une intervention',
    description: 'Permet de supprimer la photo associée à une intervention'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Photo supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    try {
      console.log('InterventionUploadController - Remove photo request received:', {
        interventionId: id
      });

      const intervention = await this.interventionsService.findOne(id);
      if (!intervention) {
        throw new NotFoundException('Intervention non trouvée');
      }

      // Mettre à jour l'intervention en supprimant la photo
      const updatedIntervention = await this.interventionsService.updateStatus(
        id,
        intervention.status,
        undefined, // Supprimer la photoUrl
        'Photo supprimée le ' + new Date().toLocaleString('fr-FR'),
      );

      console.log('InterventionUploadController - Photo removed successfully:', {
        interventionId: id
      });

      return {
        success: true,
        message: 'Photo supprimée avec succès',
        data: {
          interventionId: id,
          removedAt: new Date().toISOString(),
        },
        intervention: updatedIntervention,
      };
    } catch (error) {
      console.error('InterventionUploadController - Error removing photo:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la suppression de la photo: ' + error.message);
    }
  }
}
