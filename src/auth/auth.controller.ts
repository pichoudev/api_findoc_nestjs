import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { SendVerificationCodeDto, VerifyAccountDto } from './dto/verification.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService, 
    private otpService: OtpService,
    private prisma: PrismaService
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ 
    summary: 'Inscription utilisateur',
    description: 'Crée un nouveau compte et envoie un code de vérification par email'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Compte créé avec succès. Un code de vérification a été envoyé par email.'
  })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.createUtilisateur(registerDto);
  }

  @Public()
  @Post('send-verification')
  @ApiOperation({ 
    summary: 'Envoyer code de vérification',
    description: 'Envoie un code OTP par email pour vérifier le compte'
  })
  @ApiBody({ type: SendVerificationCodeDto })
  async sendVerification(@Body() sendVerificationDto: SendVerificationCodeDto) {
    await this.otpService.sendOtpToUser(sendVerificationDto.email, 'VERIFY_EMAIL');
    return { message: 'Code de vérification envoyé par email' };
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ 
    summary: 'Vérifier le compte',
    description: 'Vérifie le code OTP et active le compte utilisateur'
  })
  @ApiBody({ type: VerifyAccountDto })
  async verifyEmail(@Body() verifyAccountDto: VerifyAccountDto) {
    return await this.authService.verifyEmailWithOtp(verifyAccountDto.email, verifyAccountDto.code);
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ 
    summary: 'Renvoyer code de vérification',
    description: 'Renvoie un nouveau code de vérification par email'
  })
  @ApiBody({ type: SendVerificationCodeDto })
  async resendVerification(@Body() sendVerificationDto: SendVerificationCodeDto) {
    return await this.authService.resendVerificationOtp(sendVerificationDto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Connexion utilisateur',
    description: 'Authentifie un utilisateur avec ses identifiants et retourne les tokens JWT'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        user: { type: 'object' }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    const utilisateur = await this.authService.validateUser(loginDto.email, loginDto.mot_de_passe);
    return await this.authService.login(utilisateur);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Rafraîchir le token',
    description: 'Génère un nouveau access token à partir du refresh token'
  })
  async refreshToken(@Body() body: { refresh_token: string }) {
    return await this.authService.refreshToken(body.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Déconnexion',
    description: 'Révoque le refresh token de l\'utilisateur'
  })
  async logout(@CurrentUser() user: any) {
    return await this.authService.logout(user.id);
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({ 
    summary: 'Demander réinitialisation mot de passe',
    description: 'Envoie un code OTP par email pour réinitialiser le mot de passe'
  })
  @ApiBody({ type: RequestPasswordResetDto })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return await this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Réinitialiser mot de passe',
    description: 'Réinitialise le mot de passe avec le code OTP reçu par email'
  })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPasswordWithOtp(
      resetPasswordDto.email, 
      resetPasswordDto.code, 
      resetPasswordDto.nouveau_mot_de_passe
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Profil utilisateur',
    description: 'Retourne les informations de l\'utilisateur connecté'
  })
  async getProfile(@CurrentUser() user: any) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        telephone: true,
        role: true,
        est_verifie: true,
        est_actif: true,
        photo: true,
        cree_le: true,
        mis_a_jour_le: true
      }
    });
    return utilisateur;
  }

  @Post('activate/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Activer un utilisateur (ADMIN)',
    description: 'Active un compte utilisateur'
  })
  async activateUser(@Req() req: Request) {
    const userId = (req.params as any).userId;
    return await this.authService.activateUser(userId);
  }

  @Post('deactivate/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Désactiver un utilisateur (ADMIN)',
    description: 'Désactive un compte utilisateur et révoque ses tokens'
  })
  async deactivateUser(@Req() req: Request) {
    const userId = (req.params as any).userId;
    return await this.authService.deactivateUser(userId);
  }
}
