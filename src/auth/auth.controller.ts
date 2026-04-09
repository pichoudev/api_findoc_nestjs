import { Controller, Post, Body, Get, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: 'Connexion utilisateur (email + mot de passe)',
    description: 'Authentifie un utilisateur avec ses identifiants et retourne les tokens JWT'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDg3YjVjYy0xZGY0LTQ2NTAtYTFmNy1hNzk5ODU5YmUyMjEiLCJlbWFpbCI6Imxvb25hNzc1N0BnbWFpbC5jb20iLCJwaG9uZSI6IisyMzc2OTg3NjU0MzIiLCJyb2xlIjoiQ0lUSVpFTiIsImlhdCI6MTc3NTE5ODM1NywiZXhwIjoxNzc3MDEyNzU3fQ.TEt5N7KM-TA6Ny5dFFYin_fUdFKsSRAIaZSlLdqflxA',
          description: 'Token JWT d\'accès (valide 21 jours)'
        },
        refresh_token: {
          type: 'string',
          example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          description: 'Token de rafraîchissement pour obtenir un nouveau access_token'
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'e487b5cc-1df4-4650-a1f7-a799859be221',
              description: 'ID unique de l\'utilisateur'
            },
            email: {
              type: 'string',
              example: 'loona7757@gmail.com',
              description: 'Email de l\'utilisateur'
            },
            quartier: {
              type: 'string',
              example: 'Bonaberi',
              description: 'Quartier de l\'utilisateur'
            },
            phone: {
              type: 'string',
              example: '+237698765432',
              description: 'Téléphone de l\'utilisateur'
            },
            firstName: {
              type: 'string',
              example: 'Loona',
              description: 'Prénom de l\'utilisateur'
            },
            lastName: {
              type: 'string',
              example: 'Smith',
              description: 'Nom de l\'utilisateur'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'SUPERVISOR', 'AGENT', 'CITIZEN'],
              example: 'CITIZEN',
              description: 'Rôle de l\'utilisateur'
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Statut d\'activation du compte'
            },
            isVerified: {
              type: 'boolean',
              example: true,
              description: 'Statut de vérification du compte'
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Identifiants invalides',
    schema: {
      example: {
        message: 'Identifiants invalides',
        error: 'Unauthorized',
        statusCode: 401
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Inscription utilisateur',
    description: 'Crée un nouveau compte utilisateur et envoie un code de vérification par email'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Inscription réussie',
    schema: {
      example: {
        id: "e487b5cc-1df4-4650-a1f7-a799859be221",
        firstName: "Loona",
        lastName: "Smith",
        email: "loona7757@gmail.com",
        phone: "+237698765432",
        role: "CITIZEN",
        isActive: true,
        isVerified: false,
        neighborhoodId: "uuid-quartier",
        createdAt: "2026-04-03T06:30:00.000Z",
        updatedAt: "2026-04-03T06:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides ou email déjà utilisé',
    schema: {
      example: {
        message: "Cet email est déjà utilisé",
        error: "Bad Request",
        statusCode: 400
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ 
    summary: 'Rafraîchir le token d\'accès',
    description: 'Génère un nouveau access_token à partir d\'un refresh_token valide'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          description: 'Token de rafraîchissement valide'
        }
      },
      required: ['refresh_token']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nouveau token généré',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDg3YjVjYy0xZGY0LTQ2NTAtYTFmNy1hNzk5ODU5YmUyMjEiLCJlbWFpbCI6Imxvb25hNzc1N0BnbWFpbC5jb20iLCJwaG9uZSI6IisyMzc2OTg3NjU0MzIiLCJyb2xlIjoiQ0lUSVpFTiIsImlhdCI6MTc3NTE5ODM1NywiZXhwIjoxNzc3MDEyNzU3fQ.TEt5N7KM-TA6Ny5dFFYin_fUdFKsSRAIaZSlLdqflxA'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Refresh token invalide',
    schema: {
      example: {
        message: 'Token de rafraîchissement invalide ou expiré',
        error: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Déconnexion',
    description: 'Invalide le refresh_token pour déconnecter l\'utilisateur'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          description: 'Token de rafraîchissement à invalider'
        }
      },
      required: ['refresh_token']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Déconnexion réussie',
    schema: {
      example: {
        message: 'Déconnexion réussie'
      }
    }
  })
  async logout(@Body('refresh_token') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ 
    summary: 'Profil de l\'utilisateur connecté',
    description: 'Retourne les informations complètes de l\'utilisateur authentifié'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil récupéré avec succès',
    schema: {
      example: {
        id: "e487b5cc-1df4-4650-a1f7-a799859be221",
        firstName: "Loona",
        lastName: "Smith",
        email: "loona7757@gmail.com",
        phone: "+237698765432",
        role: "CITIZEN",
        isActive: true,
        isVerified: true,
        neighborhoodId: "uuid-quartier",
        reportCount: 5,
        neighborhoodRelation: {
          id: "uuid-quartier",
          name: "Bonaberi",
          city: {
            id: "uuid-ville",
            name: "Douala",
            region: "LITTORAL"
          }
        },
        createdAt: "2026-04-03T06:30:00.000Z",
        updatedAt: "2026-04-03T06:30:00.000Z"
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Utilisateur non authentifié',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.userId);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Authentification Google',
    description: 'Redirige vers Google OAuth2 pour l\'authentification'
  })
  async googleAuth() {
    // Redirection vers Google OAuth2
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Callback Google OAuth2',
    description: 'Callback après authentification Google. Crée ou connecte automatiquement l\'utilisateur'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Authentification Google réussie',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        user: {
          id: "e487b5cc-1df4-4650-a1f7-a799859be221",
          firstName: "Loona",
          lastName: "Smith",
          email: "loona7757@gmail.com",
          phone: "+237698765432",
          role: "CITIZEN",
          isActive: true,
          isVerified: true
        }
      }
    }
  })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUser = req.user as GoogleUserProfile;
      
      if (!googleUser) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      }
      
      // Vérifier si l'utilisateur existe déjà
      let existingUser = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!existingUser) {
        // Créer un nouvel utilisateur avec mot de passe temporaire
        const tempPassword = Math.random().toString(36).slice(-8);
        existingUser = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            phone: googleUser.phone,
            passwordHash: tempPassword, // Sera hashé automatiquement par un hook si nécessaire
            role: 'CITIZEN',
            isActive: true,
            isVerified: true,
          },
        });
      } else if (!existingUser.isActive) {
        // Réactiver l'utilisateur si inactif
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { isActive: true },
        });
      }

      // Générer les tokens
      const result = await this.authService.login(existingUser);

      // Rediriger vers le frontend avec les tokens
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${result.access_token}`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }

  @Public()
  @Post('send-otp')
  @ApiOperation({ 
    summary: 'Envoyer un code OTP',
    description: 'Envoie un code de vérification par email ou SMS'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emailOrPhone: {
          type: 'string',
          example: 'loona7757@gmail.com',
          description: 'Email ou téléphone de l\'utilisateur'
        },
        purpose: {
          type: 'string',
          enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'],
          example: 'VERIFY_EMAIL',
          description: 'Objectif de l\'envoi du code OTP'
        }
      },
      required: ['emailOrPhone', 'purpose']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Code OTP envoyé avec succès',
    schema: {
      example: {
        message: 'Code de vérification envoyé avec succès',
        expiresIn: '15 minutes'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Erreur lors de l\'envoi du code OTP',
    schema: {
      example: {
        message: 'Erreur lors de l\'envoi du code OTP',
        statusCode: 400
      }
    }
  })
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
              code: code,
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
              code: code,
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
    
    // Afficher le code OTP de manière très visible
    console.log('\n' + '='.repeat(60));
    console.log('🔐 CODE OTP DE RÉINITIALISATION DE MOT DE PASSE');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${emailOrPhone}`);
    console.log(`🔢 Code: ${code}`);
    console.log(`⏰ Valide pendant: 10 minutes`);
    console.log('='.repeat(60));
    console.log('🔐 UTILISEZ CE CODE POUR RÉINITIALISER LE MOT DE PASSE');
    console.log('='.repeat(60) + '\n');
    
    // Log du code OTP pour développement
    console.log(`🔐 [OTP DEBUG] Code de réinitialisation généré pour ${emailOrPhone}: ${code}`);
    console.log(`🔐 [OTP DEBUG] Méthode d'envoi: ${method}`);
    console.log(`🔐 [OTP DEBUG] Code expire dans: 10 minutes`);
    
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
    
    // Log du code OTP reçu pour développement
    console.log(`🔐 [OTP DEBUG] Tentative de réinitialisation pour ${emailOrPhone}`);
    console.log(`🔐 [OTP DEBUG] Code reçu: ${code}`);
    console.log(`🔐 [OTP DEBUG] Nouveau mot de passe: ${newPassword ? '***' + newPassword.slice(-4) : 'non fourni'}`);
    console.log(`🔐 [OTP DEBUG] Confirmation mot de passe: ${confirmPassword ? '***' + confirmPassword.slice(-4) : 'non fourni'}`);
    
    // Valider que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      console.log(`❌ [OTP DEBUG] Les mots de passe ne correspondent pas`);
      throw new UnauthorizedException('Les mots de passe ne correspondent pas');
    }
    
    console.log(`✅ [OTP DEBUG] Les mots de passe correspondent, tentative de réinitialisation...`);
    
    // Utiliser le nouveau service de réinitialisation
    const success = await this.passwordResetService.resetPassword(emailOrPhone, code, newPassword);
    
    if (!success) {
      console.log(`❌ [OTP DEBUG] Échec de la réinitialisation - Code invalide ou expiré`);
      throw new UnauthorizedException('Code de réinitialisation invalide ou expiré');
    }
    
    console.log(`✅ [OTP DEBUG] Mot de passe réinitialisé avec succès pour ${emailOrPhone}`);
    
    return {
      message: 'Mot de passe réinitialisé avec succès',
      success: true
    };
  }
}
