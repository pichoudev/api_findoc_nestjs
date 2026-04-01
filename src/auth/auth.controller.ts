import { Controller, Post, Body, Get, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AccountVerificationService } from './account-verification.service';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RequestPasswordResetDto as OldRequestPasswordResetDto, ResetPasswordDto as OldResetPasswordDto } from './dto/reset-password.dto';
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
  constructor(
    private authService: AuthService, 
    private otpService: OtpService,
    private accountVerificationService: AccountVerificationService,
    private passwordResetService: PasswordResetService,
    private prisma: PrismaService
  ) {}

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
    const { emailOrPhone, purpose = 'VERIFY_EMAIL' } = sendOtpDto;
    
    // Déterminer si c'est un email ou un téléphone
    const isEmail = emailOrPhone.includes('@');
    const method = isEmail ? 'EMAIL' : 'SMS';
    
    // Générer un code de 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    if (purpose === 'VERIFY_EMAIL') {
      // Utiliser le service de vérification de compte
      await this.accountVerificationService.sendVerificationCode(emailOrPhone, code, method);
      return {
        message: 'Code de vérification envoyé avec succès',
        expiresIn: '15 minutes'
      };
    } else if (purpose === 'RESET_PASSWORD') {
      // Utiliser le service de réinitialisation de mot de passe
      await this.passwordResetService.sendPasswordResetCode(emailOrPhone, code, method);
      return {
        message: 'Code de réinitialisation envoyé avec succès',
        expiresIn: '10 minutes'
      };
    } else {
      // Utiliser l'ancien service pour les autres purposes
      return this.authService.sendOtp(emailOrPhone, purpose);
    }
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Vérifier un code OTP' })
  @ApiResponse({ status: 200, description: 'Code OTP valide' })
  @ApiResponse({ status: 400, description: 'Code OTP invalide' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const { emailOrPhone, code, purpose } = verifyOtpDto;
      
      if (purpose === 'VERIFY_EMAIL') {
        // Utiliser le service de vérification de compte
        const isValid = await this.accountVerificationService.verifyCode(emailOrPhone, code, purpose);
        
        // Vérifier si le token existe encore pour déterminer le message approprié
        const user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: emailOrPhone },
              { phone: emailOrPhone },
            ],
          },
        });

        if (user) {
          const token = await this.prisma.otpToken.findFirst({
            where: {
              userId: user.id,
              purpose,
              expiresAt: { gt: new Date() },
            },
          });

          if (!token && !isValid) {
            return {
              success: false,
              message: 'Token supprimé après 3 tentatives échouées. Veuillez demander un nouveau code.',
              requiresNewCode: true
            };
          } else if (token && token.attemptsCount > 0 && !isValid) {
            const remainingAttempts = 3 - token.attemptsCount;
            return {
              success: false,
              message: `Code incorrect. Il vous reste ${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''}.`,
              remainingAttempts
            };
          }
        }
        
        return {
          success: true,
          message: isValid ? 'Compte vérifié avec succès' : 'Code de vérification invalide ou expiré',
          isValid
        };
      } else if (purpose === 'RESET_PASSWORD') {
        // Utiliser le service de réinitialisation de mot de passe
        const isValid = await this.passwordResetService.verifyResetCode(emailOrPhone, code);
        
        // Vérifier si le token existe encore pour déterminer le message approprié
        const user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: emailOrPhone },
              { phone: emailOrPhone },
            ],
          },
        });

        if (user) {
          const token = await this.prisma.otpToken.findFirst({
            where: {
              userId: user.id,
              purpose: 'PASSWORD_RESET',
              expiresAt: { gt: new Date() },
            },
          });

          if (!token && !isValid) {
            return {
              success: false,
              message: 'Token supprimé après 3 tentatives échouées. Veuillez demander un nouveau code.',
              requiresNewCode: true
            };
          } else if (token && token.attemptsCount > 0 && !isValid) {
            const remainingAttempts = 3 - token.attemptsCount;
            return {
              success: false,
              message: `Code incorrect. Il vous reste ${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''}.`,
              remainingAttempts
            };
          }
        }
        
        return {
          success: true,
          message: isValid ? 'Code de réinitialisation valide' : 'Code de réinitialisation invalide ou expiré',
          isValid
        };
      } else {
        // Utiliser l'ancien service pour les autres purposes
        const result = await this.authService.verifyOtp(emailOrPhone, code, purpose);
        return {
          success: true,
          message: result.message,
          isValid: result.isValid
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({ 
    summary: 'Demander la réinitialisation du mot de passe',
    description: 'Envoie un code de réinitialisation par email ou SMS'
  })
  @ApiResponse({ status: 200, description: 'Code de réinitialisation envoyé' })
  @ApiResponse({ status: 400, description: 'Erreur lors de l\'envoi' })
  async requestPasswordReset(@Body() requestPasswordResetDto: OldRequestPasswordResetDto) {
    const { emailOrPhone } = requestPasswordResetDto;
    
    // Déterminer si c'est un email ou un téléphone
    const isEmail = emailOrPhone.includes('@');
    const method = isEmail ? 'EMAIL' : 'SMS';
    
    // Générer un code de 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Utiliser le nouveau service de réinitialisation
    await this.passwordResetService.sendPasswordResetCode(emailOrPhone, code, method);
    
    return {
      message: 'Code de réinitialisation envoyé avec succès',
      method,
      expiresIn: '10 minutes'
    };
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
  async resetPassword(@Body() resetPasswordDto: OldResetPasswordDto) {
    const { emailOrPhone, code, newPassword, confirmPassword } = resetPasswordDto;
    
    // Valider que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      throw new UnauthorizedException('Les mots de passe ne correspondent pas');
    }
    
    // Utiliser le nouveau service de réinitialisation
    const success = await this.passwordResetService.resetPassword(emailOrPhone, code, newPassword);
    
    if (!success) {
      throw new UnauthorizedException('Code de réinitialisation invalide ou expiré');
    }
    
    return {
      message: 'Mot de passe réinitialisé avec succès',
      success: true
    };
  }
}
