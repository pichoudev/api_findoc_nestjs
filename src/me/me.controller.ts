import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { MeService } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('me')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Obtenir mon profil',
    description: 'Retourne les informations de l\'utilisateur connecté'
  })
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.meService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ 
    summary: 'Mettre à jour mon profil',
    description: 'Met à jour les informations de l\'utilisateur connecté'
  })
  async updateProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const user = req.user as any;
    return this.meService.updateProfile(user.sub, updateProfileDto);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Mettre à jour mon mot de passe',
    description: 'Met à jour le mot de passe de l\'utilisateur connecté'
  })

  async updatePassword(
  @Req() req: Request,
  @Body() updatePasswordDto: UpdatePasswordDto
) {
  const user = req.user as any;

  return this.meService.updatePassword(user.sub, {
    ancien_mot_de_passe: updatePasswordDto.ancien_mot_de_passe,
    nouveau_mot_de_passe: updatePasswordDto.nouveau_mot_de_passe,
  });
}

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Uploader ma photo de profil',
    description: 'Upload une nouvelle photo de profil pour l\'utilisateur connecté'
  })
  async uploadPhoto(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File
  ) {
    const user = req.user as any;
    
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    return this.meService.uploadProfilePhoto(user.sub, file);
  }

  @Delete('photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer ma photo de profil',
    description: 'Supprime la photo de profil de l\'utilisateur connecté'
  })
  async removePhoto(@Req() req: Request) {
    const user = req.user as any;
    return this.meService.removeProfilePhoto(user.sub);
  }
}
