import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Request as ReqDecorator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { AnnoncesService } from './annonces.service';
import { CreateAnnonceDto } from './dto/create.dto';
import { UpdateAnnonceDto } from './dto/update.dto';
import { QueryAnnonceDto } from './dto/query.dto';
import { HistoriqueAnnoncesResponseDto } from './dto/historique.dto';
import { Statut_annonce } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@ApiTags('annonces')
@Controller('annonces')
export class AnnoncesController {
  constructor(private readonly annoncesService: AnnoncesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 fichiers
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Créer une nouvelle annonce avec fichiers' })
  @ApiResponse({ status: 201, description: 'Annonce créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(
    @Body('createAnnonceDto') createAnnonceDtoRaw: string,
    @UploadedFiles() files?: Express.Multer.File[],
    @ReqDecorator() req?: any,
  ) {
    console.log('Annonces create - req.user:', req.user);
    console.log('Annonces create - files:', files);
    console.log('Annonces create - createAnnonceDtoRaw:', createAnnonceDtoRaw);
    
    const utilisateur = req.user as any;
    console.log('Annonces create - utilisateur:', utilisateur);
    
    // Parser manuellement le JSON
    let createAnnonceDto: CreateAnnonceDto;
    try {
      createAnnonceDto = JSON.parse(createAnnonceDtoRaw);
    } catch (error) {
      throw new BadRequestException('JSON invalide dans createAnnonceDto');
    }

    // Valider manuellement avec class-validator
    const dtoInstance = plainToInstance(CreateAnnonceDto, createAnnonceDto);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation des types de fichiers
    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException(`Le fichier ${file.originalname} n'est pas une image`);
      }
    }

    if (!utilisateur || !utilisateur.userId) {
      console.log('Annonces create - utilisateur.userId est undefined');
      throw new BadRequestException('ID utilisateur non trouvé');
    }

    console.log('Annonces create - utilisateur.userId:', utilisateur.userId);
    return this.annoncesService.createAnnonce(dtoInstance, files, utilisateur.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les annonces avec filtres' })
  @ApiResponse({ status: 200, description: 'Liste des annonces récupérée' })
  async findAll(@Query() query: QueryAnnonceDto) {
    return this.annoncesService.findAnnonces(query);
  }

  @Get('mes-annonces')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les annonces de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Annonces de l\'utilisateur récupérées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findMyAnnonces(@Query() query: QueryAnnonceDto, @ReqDecorator() req) {
    return this.annoncesService.findAnnoncesByUser(req.user.id, query);
  }


  @Get('historique')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer l\'historique des annonces de l\'utilisateur avec statistiques' })
  @ApiResponse({ status: 200, description: 'Historique récupéré avec succès', type: HistoriqueAnnoncesResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getHistoriqueAnnonces(@ReqDecorator() req?: any) {
    const utilisateur = req.user;
    return this.annoncesService.getHistoriqueAnnonces(utilisateur.userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer toutes les annonces sans filtre' })
  @ApiResponse({ status: 200, description: 'Toutes les annonces récupérées' })
  async getAllAnnonces() {
    return this.annoncesService.getAllAnnonces();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une annonce par son ID' })
  @ApiResponse({ status: 200, description: 'Annonce récupérée' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  async findOne(@Param('id') id: string) {
    return this.annoncesService.getAnnonceById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une annonce' })
  @ApiResponse({ status: 200, description: 'Annonce mise à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateAnnonceDto: UpdateAnnonceDto,
    @ReqDecorator() req
  ) {
    return this.annoncesService.updateAnnonce(id, updateAnnonceDto, req.user.id);
  }

  @Patch(':id/statut')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une annonce' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  async updateStatut(
    @Param('id') id: string,
    @Body('statut') statut: Statut_annonce,
    @ReqDecorator() req
  ) {
    return this.annoncesService.updateStatut(id, statut, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une annonce' })
  @ApiResponse({ status: 200, description: 'Annonce supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Annonce non trouvée' })
  async remove(@Param('id') id: string, @ReqDecorator() req) {
    return this.annoncesService.deleteAnnonce(id, req.user.id);
  }

  @Post('upload/single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Téléverser une seule image' })
  @ApiResponse({ status: 201, description: 'Image téléversée avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur lors du téléversement' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async uploadSingleImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('annonceId') annonceId: string,
    @Body('prefix') prefix?: string,
  ) {
    const url = await this.annoncesService.uploadSingleImage(file, annonceId, prefix);
    return {
      success: true,
      message: 'Image téléversée avec succès',
      data: { url },
    };
  }

  @Post('upload/multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 fichiers
  @ApiOperation({ summary: 'Téléverser plusieurs images pour un document' })
  @ApiResponse({ status: 201, description: 'Images téléversées avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur lors du téléversement' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async uploadDocumentImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('annonceId') annonceId: string,
    @Body('documentIndex') documentIndex: number,
  ) {
    const urls = await this.annoncesService.uploadDocumentImages(files, annonceId, documentIndex);
    return {
      success: true,
      message: `${urls.length} image(s) téléversée(s) avec succès`,
      data: { urls },
    };
  }



}
