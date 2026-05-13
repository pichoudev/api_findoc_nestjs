import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post,   Request } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaiementsService } from './paiements.service';
import { CreatePaiementDto } from './dto/create.dto';
import { UpdatePaiementDto } from './dto/update.dto';

@ApiTags('paiements')
@Controller('paiements')
@UseGuards(JwtAuthGuard)
export class PaiementsController {

    // CONSTRUCTEUR
    constructor(
        private readonly servicePaiement: PaiementsService
    ) {}

    // @Get : pour recuperer les paiements
    @Get()
    @ApiOperation({ 
      summary: 'Obtenir tous les paiements',
      description: 'Retourne la liste de tous les paiements'
    })
    async findAll() {
        return this.servicePaiement.getAllPaiements();
    }

    // @Get : pour recuperer un paiement par son id
    @Get(':id')
    @ApiOperation({ 
      summary: 'Obtenir un paiement par son id',
      description: 'Retourne un paiement par son id'
    })
    async findOne(@Param('id') id: string) {
        return this.servicePaiement.getPaiementById(id);
    }

    // @Post : pour creer un paiement
    @Post()
    @ApiOperation({ 
      summary: 'Créer un paiement',
      description: 'Crée un nouveau paiement'
    })
    @HttpCode(HttpStatus.OK)
    async create(@Request() req: any,
                @Body() body: CreatePaiementDto) {

        if (!req || !req.user) {
            throw new Error('Utilisateur non authentifié');
        }
        const utilisateur = req.user;
        // console.log(`utilisateur ${utilisateur?.userId}`);
        return this.servicePaiement.createPaiement(body, utilisateur?.userId);
    }

    // @Patch()
    @Patch(":paiement_id")
    @ApiOperation({ 
      summary: 'Mettre à jour un paiement',
      description: 'Met à jour un paiement'
    })
    @HttpCode(HttpStatus.OK)
    async update(@Param('paiement_id') paiementId: string,
                @Body() body: UpdatePaiementDto) {

        return this.servicePaiement.updatePaiement(paiementId, body);
    }

    // @Delete()
    @Delete(":paiement_id")
    @ApiOperation({ 
      summary: 'Supprimer un paiement',
      description: 'Supprime un paiement'
    })
    @HttpCode(HttpStatus.OK)
    async delete(@Request() req: any, @Param('paiement_id') paiementId: string) {

        if (!req || !req.user) {
            throw new Error('Utilisateur non authentifié');
        }
        return this.servicePaiement.deletePaiement(paiementId);
    }


    // @Get('/:commandeId')
    @Get(':paiement_id')
    @ApiOperation({ 
      summary: 'Obtenir les paiements par commande',
      description: 'Retourne les paiements par commande'
    })
    async findByCommande(@Param('paiement_id') paiementId: string) {
        return this.servicePaiement.getPaiementById(paiementId);
    }

}


