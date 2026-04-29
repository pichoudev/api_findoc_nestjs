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
  ParseUUIDPipe,
  Req,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto, UpdateInterventionDto, FilterInterventionsDto, AssignInterventionDto } from './dto/intervention.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { UserRole, InterventionStatus } from '@prisma/client';

@ApiTags('interventions')
@Controller('interventions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Créer une nouvelle intervention',
    description: 'Permet de créer une intervention pour un signalement existant'
  })
  @ApiResponse({ status: 201, description: 'Intervention créée avec succès' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 404, description: 'Signalement ou agent non trouvé' })
  @ApiResponse({ status: 409, description: 'Intervention déjà existante' })
  async create(@Body() createInterventionDto: CreateInterventionDto) {
    return this.interventionsService.create(createInterventionDto);
  }

  @Get()
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister toutes les interventions',
    description: 'Retourne toutes les interventions avec pagination et filtres optionnels'
  })
  @ApiResponse({ status: 200, description: 'Liste des interventions récupérée avec succès' })
  async findAll(@Query() filters: FilterInterventionsDto) {
    return this.interventionsService.findAll(filters);
  }

  @Get('my-interventions')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Lister mes interventions',
    description: 'Retourne toutes les interventions assignées à l\'agent connecté'
  })
  @ApiResponse({ status: 200, description: 'Mes interventions récupérées avec succès' })
  async findMyInterventions(@Req() req: any, @Query() filters?: FilterInterventionsDto) {
    const agentId = req.user?.sub || req.user?.userId || req.user?.id;
    if (!agentId) {
      throw new BadRequestException('Agent non authentifié');
    }

    return this.interventionsService.findByAgent(agentId, filters);
  }

  @Get('stats')
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Statistiques des interventions',
    description: 'Retourne des statistiques détaillées sur les interventions'
  })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return this.interventionsService.getStats();
  }

  @Get('/:agentId/stats')
  @Roles('SUPERVISOR', 'ADMIN', 'AGENT')
  @ApiOperation({ 
    summary: 'Statistiques d\'interventions d\'un agent',
    description: 'Récupère les statistiques d\'interventions pour un agent spécifique'
  })
  @ApiParam({ name: 'agentId', description: 'ID de l\'agent' })
  @ApiResponse({ status: 200, description: 'Stats récupérées avec succès' })
  @ApiResponse({ status: 404, description: 'Agent non trouvé' })
  async getAgentStats(@Param('agentId', ParseUUIDPipe) agentId: string, @Req() req: any) {
    // Vérifier si l'agent demande ses propres stats ou si c'est un superviseur/admin
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    
    // Un agent ne peut voir que ses propres stats
    if (userRole === 'AGENT' && userId !== agentId) {
      throw new ForbiddenException('Un agent ne peut voir que ses propres statistiques');
    }
    
    return this.interventionsService.getAgentStats(agentId);
  }

  @Get('report/:reportId')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Interventions d\'un signalement',
    description: 'Retourne les interventions pour un signalement spécifique'
  })
  @ApiParam({ name: 'reportId', description: 'ID du signalement' })
  @ApiResponse({ status: 200, description: 'Interventions du signalement récupérées avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement non trouvé' })
  async findByReport(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.interventionsService.findByReport(reportId);
  }

  @Get('agent/:agentId')
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Interventions d\'un agent',
    description: 'Retourne les interventions assignées à un agent spécifique'
  })
  @ApiParam({ name: 'agentId', description: 'ID de l\'agent' })
  @ApiResponse({ status: 200, description: 'Interventions de l\'agent récupérées avec succès' })
  @ApiResponse({ status: 404, description: 'Agent non trouvé' })
  async findByAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query() filters?: FilterInterventionsDto
  ) {
    return this.interventionsService.findByAgent(agentId, filters);
  }

  @Get(':id')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Détails d\'une intervention',
    description: 'Retourne les détails complets d\'une intervention spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Intervention récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interventionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Mettre à jour une intervention',
    description: 'Permet de modifier les informations d\'une intervention existante'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Intervention mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInterventionDto: UpdateInterventionDto,
  ) {
    return this.interventionsService.update(id, updateInterventionDto);
  }

  @Patch(':id/status')
  @Roles('AGENT', 'SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Mettre à jour le statut d\'une intervention',
    description: 'Permet de changer le statut d\'une intervention (EN_ATTENTE, EN_COURS, RESOLU, ANNULE)'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: InterventionStatus,
    @Body('photoUrl') photoUrl?: string,
    @Body('comment') comment?: string,
  ) {
    return this.interventionsService.updateStatus(id, status, photoUrl, comment);
  }

  @Post('report/:reportId/assign')
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Assigner une intervention',
    description: 'Permet d\'assigner un agent à un signalement pour créer une intervention'
  })
  @ApiParam({ name: 'reportId', description: 'ID du signalement' })
  @ApiResponse({ status: 201, description: 'Intervention assignée avec succès' })
  @ApiResponse({ status: 404, description: 'Signalement ou agent non trouvé' })
  @ApiResponse({ status: 409, description: 'Intervention déjà existante' })
  async assignIntervention(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() assignDto: AssignInterventionDto,
  ) {
    return this.interventionsService.assignIntervention(reportId, assignDto);
  }

  @Delete(':id')
  @Roles('SUPERVISOR', 'ADMIN')
  @ApiOperation({ 
    summary: 'Supprimer une intervention',
    description: 'Supprime une intervention existante'
  })
  @ApiParam({ name: 'id', description: 'ID de l\'intervention' })
  @ApiResponse({ status: 200, description: 'Intervention supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Intervention non trouvée' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.interventionsService.remove(id);
  }
}


// route pour avoir les stats d'interventions d'un agent
// @Get('agent/:agentId/stats')
// @Roles('SUPERVISOR', 'ADMIN')
// @ApiOperation({ 
//   summary: 'Stats d\'interventions d\'un agent',
//   description: 'Récupère les statistiques d\'interventions pour un agent spécifique'
// })
// @ApiParam({ name: 'agentId', description: 'ID de l\'agent' })
// @ApiResponse({ status: 200, description: 'Stats récupérées avec succès' })
// @ApiResponse({ status: 404, description: 'Agent non trouvé' })
// async getAgentStats(@Param('agentId', ParseUUIDPipe) agentId: string) {
//   return this.interventionsService.getAgentStats(agentId);
// }
