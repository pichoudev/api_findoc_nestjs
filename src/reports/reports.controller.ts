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
  ParseUUIDPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam, ApiBody } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto, FilterReportsDto, CreateReportWithPhotoDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole, ReportStatus } from '@prisma/client';
import { multerOptions } from '../../multer.config';
import { SharpPipe } from '../../sharp.pipe';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Créer un nouveau signalement de bac',
    description: 'Permet à un utilisateur de signaler un problème sur un bac avec photo optionnelle'
  })
  @ApiBody({ type: CreateReportWithPhotoDto })
  @ApiResponse({ status: 201, description: 'Signalement créé avec succès' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 404, description: 'Bac ou utilisateur non trouvé' })
  async create(
    @Body() createReportDto: CreateReportDto,
    @Req() req: any,
    @UploadedFile(SharpPipe) photoUrl?: string,
  ) {
    console.log('ReportsController - Create request received:', {
      body: createReportDto,
      hasPhotoUrl: !!photoUrl,
      photoUrl: photoUrl
    });

    // Extraire l'ID utilisateur depuis le JWT
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    console.log('ReportsController - User ID extracted:', userId);

    try {
      const result = await this.reportsService.create(createReportDto, userId, photoUrl, req);
      console.log('ReportsController - Report created successfully');
      return result;
    } catch (error) {
      console.error('ReportsController - Error creating report:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du signalement: ' + error.message);
    }
  }

  @Get()
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister tous les signalements',
    description: 'Retourne tous les signalements avec pagination et filtres optionnels'
  })
  @ApiResponse({ status: 200, description: 'Liste des signalements récupérée avec succès' })
  async findAll(@Query() filters: FilterReportsDto) {
    return this.reportsService.findAll(filters);
  }

  @Get('my-reports')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister mes signalements',
    description: 'Retourne tous les signalements créés par l\'utilisateur authentifié'
  })
  @ApiResponse({ status: 200, description: 'Mes signalements récupérés avec succès' })
  async findMyReports(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.reportsService.findByUser(userId);
  }

  @Get('my-stats')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Mes statistiques de signalements',
    description: 'Retourne les statistiques des signalements de l\'utilisateur authentifié'
  })
  @ApiResponse({ status: 200, description: 'Mes statistiques récupérées avec succès' })
  async getMyStats(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.reportsService.getUserStats(userId);
  }

  @Get('citizen/:userId')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister les signalements d\'un citoyen',
    description: 'Retourne tous les signalements créés par un citoyen spécifique (agents et admins uniquement)'
  })
  @ApiParam({ name: 'userId', description: 'ID du citoyen' })
  @ApiResponse({ status: 200, description: 'Signalements du citoyen récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Citoyen non trouvé' })
  async findCitizenReports(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reportsService.findByUser(userId);
  }

  @Get('citizen/:userId/stats')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Statistiques d\'un citoyen',
    description: 'Retourne les statistiques des signalements d\'un citoyen spécifique (agents et admins uniquement)'
  })
  @ApiParam({ name: 'userId', description: 'ID du citoyen' })
  @ApiResponse({ status: 200, description: 'Statistiques du citoyen récupérées avec succès' })
  @ApiResponse({ status: 404, description: 'Citoyen non trouvé' })
  async getCitizenStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reportsService.getUserStats(userId);
  }

  @Get('stats')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Statistiques des signalements',
    description: 'Retourne des statistiques détaillées sur les signalements'
  })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.reportsService.getStats();
  }

  @Get('bin/:bacId')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Signalements par bac',
    description: 'Retourne tous les signalements pour un bac spécifique'
  })
  @ApiParam({ name: 'bacId', description: 'ID du bac' })
  @ApiResponse({ status: 200, description: 'Signalements du bac récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  async findByBin(@Param('bacId', ParseUUIDPipe) bacId: string) {
    return this.reportsService.findByBin(bacId);
  }

  @Get(':id')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Détails d\'un signalement',
    description: 'Retourne les détails complets d\'un signalement spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID du signalement' })
  @ApiResponse({ status: 200, description: 'Signalement récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Mettre à jour un signalement',
    description: 'Permet de modifier les informations d\'un signalement existant'
  })
  @ApiParam({ name: 'id', description: 'ID du signalement' })
  @ApiResponse({ status: 200, description: 'Signalement mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReportDto: UpdateReportDto,
    @UploadedFile(SharpPipe) photoUrl?: string,
  ) {
    return this.reportsService.update(id, updateReportDto, photoUrl);
  }

  @Patch(':id/status')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Mettre à jour le statut d\'un signalement',
    description: 'Permet de changer le statut d\'un signalement (ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)'
  })
  @ApiParam({ name: 'id', description: 'ID du signalement' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ReportStatus,
  ) {
    return this.reportsService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Supprimer un signalement',
    description: 'Supprime un signalement (uniquement s\'il n\'a pas d\'intervention assignée)'
  })
  @ApiParam({ name: 'id', description: 'ID du signalement' })
  @ApiResponse({ status: 200, description: 'Signalement supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer - intervention existante' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.remove(id);
  }

  // ─── SYNC ENDPOINTS ────────────────────────────────────────────────────────
  @Post('sync/:bacId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Synchroniser le statusReport d\'un bac',
    description: 'Synchronise le statusReport d\'un bac avec le statut le plus récent de ses signalements'
  })
  @ApiParam({ name: 'bacId', description: 'ID du bac' })
  @ApiResponse({ status: 200, description: 'StatusReport synchronisé avec succès' })
  @ApiResponse({ status: 404, description: 'Bac non trouvé' })
  async syncBinStatusReport(@Param('bacId', ParseUUIDPipe) bacId: string) {
    await this.reportsService.syncBinStatusReport(bacId);
    return { message: 'StatusReport synchronisé avec succès' };
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Synchroniser tous les statusReport',
    description: 'Synchronise tous les statusReport des bacs avec leurs signalements les plus récents'
  })
  @ApiResponse({ status: 200, description: 'Tous les statusReport synchronisés avec succès' })
  async syncAllBinStatusReports() {
    await this.reportsService.syncAllBinStatusReports();
    return { message: 'Tous les statusReport synchronisés avec succès' };
  }

  @Patch(':id/cancel')
  @Roles('CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiParam({ name: 'id', description: 'ID du signalement à annuler' })
  @ApiOperation({ 
    summary: 'Annuler un signalement',
    description: 'Annule un signalement et remet le reportType du bac à NORMAL'
  })
  @ApiResponse({ status: 200, description: 'Signalement annulé avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  @ApiResponse({ status: 403, description: 'Non autorisé à annuler ce signalement' })
  @ApiResponse({ status: 400, description: 'Signalement déjà terminé ou annulé' })
  async cancelReport(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    console.log('DEBUG - Controller - User from request:', {
      user: req.user,
      userId: userId,
      reportId: reportId
    });
    return this.reportsService.cancelReport(reportId, userId);
  }
}
