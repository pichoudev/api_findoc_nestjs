import { Controller, Post, Body, Get, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

// Interface pour le profil utilisateur Google
interface GoogleUserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  picture: string;
  accessToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private otpService: OtpService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur (email + mot de passe)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.authService.login(user);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Inscription utilisateur' })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 400, description: 'Données invalides ou email déjà utilisé' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rafraîchir le token d\'accès' })
  @ApiResponse({ status: 200, description: 'Nouveau token généré' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(@Body('refresh_token') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.userId);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Authentification Google' })
  async googleAuth() {
    // Redirection vers Google OAuth2
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback Google OAuth2' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;
      
      if (!user) {
        throw new UnauthorizedException('Échec de l\'authentification Google');
      }

      const tokens = await this.authService.login(user);
      
      // Rediriger vers le frontend avec les tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const redirectUrl = `${frontendUrl}/auth/success?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`;
      
      console.log(`✅ Connexion Google réussie pour: ${user.email}`);
      console.log(`🔄 Redirection vers: ${redirectUrl}`);
      
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Erreur callback Google:', error.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('Authentication failed')}`);
    }
  }

  @Public()
  @Post('send-otp')
  @ApiOperation({ summary: 'Envoyer un code OTP' })
  @ApiResponse({ status: 200, description: 'Code OTP envoyé' })
  @ApiResponse({ status: 400, description: 'Erreur lors de l\'envoi' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.emailOrPhone);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Vérifier un code OTP' })
  @ApiResponse({ status: 200, description: 'Code OTP valide' })
  @ApiResponse({ status: 400, description: 'Code OTP invalide' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto.emailOrPhone, verifyOtpDto.code, verifyOtpDto.purpose);
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({ 
    summary: 'Demander la réinitialisation du mot de passe',
    description: 'Envoie un code de réinitialisation par email ou SMS'
  })
  @ApiResponse({ status: 200, description: 'Code de réinitialisation envoyé' })
  @ApiResponse({ status: 400, description: 'Erreur lors de l\'envoi' })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.emailOrPhone);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec le code reçu'
  })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé avec succès' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  @ApiResponse({ status: 401, description: 'Code de réinitialisation invalide' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.emailOrPhone,
      resetPasswordDto.code,
      resetPasswordDto.newPassword
    );
  }
}
