import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcryptjs';
import { ProductionLogger } from '../common/logger';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger: Logger;

  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {
    this.logger = new Logger('AuthService');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, loginData?: { oneSignalAppId?: string }) {
    console.log('🔐 LOGIN - Configuration JWT:');
    console.log('JWT_EXPIRATION from env:', this.configService.get<string>('JWT_EXPIRATION'));
    
    const payload = { 
      sub: user.id, 
      email: user.email, 
      phone: user.phone,
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(access_token);
    
    console.log('🎫 TOKEN GÉNÉRÉ:');
    console.log('Émis (iat):', new Date(decoded.iat * 1000));
    console.log('Expire (exp):', new Date(decoded.exp * 1000));
    console.log('Temps actuel:', new Date());
    console.log('Heures jusqu\'expiration:', (decoded.exp - Math.floor(Date.now()/1000)) / 3600);
    
    const refresh_token = randomBytes(40).toString('hex');
    
    console.log(`🔄 Tentative de sauvegarde du refresh token pour l'utilisateur ${user.id}`);
    console.log(`📝 Refresh token généré: ${refresh_token.substring(0, 10)}...`);
    
    // Préparer les données de mise à jour
    const updateData: any = { refreshToken: refresh_token };
    
    // Ajouter l'App ID OneSignal si fourni
    if (loginData?.oneSignalAppId) {
      updateData.oneSignalAppId = loginData.oneSignalAppId;
      console.log('📢 OneSignal App ID mis à jour lors de la connexion');
    }
    
    // Sauvegarder le refresh token et les tokens de notification dans le modèle User
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    console.log(`✅ Refresh token sauvegardé: ${updatedUser.refreshToken ? 'OUI' : 'NON'}`);
    console.log(`📊 Valeur dans la base: ${updatedUser.refreshToken?.substring(0, 10)}...`);
    
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        quartier: user.neighborhood,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    console.log(`🔍 Recherche de l'utilisateur avec refresh token: ${refreshToken.substring(0, 10)}...`);
    
    const user = await this.prisma.user.findFirst({
      where: { 
        refreshToken: refreshToken,
        isActive: true
      },
    });
    
    console.log(`👤 Utilisateur trouvé: ${user ? 'OUI' : 'NON'}`);
    if (user) {
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔄 Token dans la base: ${user.refreshToken?.substring(0, 10)}...`);
    }

    if (!user) {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      phone: user.phone,
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.user.updateMany({
      where: { refreshToken: refreshToken },
      data: { refreshToken: null },
    });
    return { message: 'Déconnexion réussie' };
  }

  async getMe(userId: string) {
    // Compter les signalements de l'utilisateur
    const reportCount = await this.prisma.report.count({
      where: { userId: userId }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        neighborhoodId: true,
        neighborhood: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        neighborhoodRelation: {
          select: {
            id: true,
            name: true,
            city: {
              select: {
                id: true,
                name: true,
                region: true
              }
            }
          }
        }
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Ajouter le nombre de signalements à la réponse
    return {
      ...user,
      reportCount
    };
  }

  async register(createUserDto: any) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    
    if (existingUser) {
      throw new UnauthorizedException('Cet email est déjà utilisé');
    }

    // Vérifier si le téléphone existe déjà
    if (createUserDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: createUserDto.phone },
      });
      
      if (existingPhone) {
        throw new UnauthorizedException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // Valider le rôle
    const validRoles = ['CITIZEN', 'AGENT', 'SUPERVISOR', 'ADMIN'];
    const role = createUserDto.role || 'CITIZEN';
    
    if (!validRoles.includes(role)) {
      throw new UnauthorizedException('Rôle invalide. Choisissez: CITIZEN, AGENT, SUPERVISOR, ADMIN');
    }

    // Si aucun neighborhood n'est fourni, assigner un quartier par défaut à Douala
    let neighborhoodName = createUserDto.neighborhood;
    let neighborhoodId: string | null = null;
    
    if (neighborhoodName) {
      // Chercher le quartier par nom
      const neighborhood = await this.prisma.neighborhood.findFirst({
        where: {
          name: {
            contains: neighborhoodName,
            mode: 'insensitive'
          }
        }
      });
      
      if (neighborhood) {
        neighborhoodId = neighborhood.id;
      }
    } else {
      // Chercher un quartier par défaut à Douala
      const defaultNeighborhood = await this.prisma.neighborhood.findFirst({
        where: {
          city: {
            name: 'Douala',
            region: 'LITTORAL'
          }
        }
      });
      
      if (defaultNeighborhood) {
        neighborhoodId = defaultNeighborhood.id;
        neighborhoodName = defaultNeighborhood.name;
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    // Supprimer confirmPassword avant de créer
    const { confirmPassword, ...userData } = createUserDto;
    
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName || 'Citoyen',
        lastName: userData.lastName || 'Cleaner',
        passwordHash: hashedPassword,
        role: role,
        isActive: false, // Nécessite une verification OTP/email
        isVerified: false,
        neighborhoodId: neighborhoodId,
        neighborhood: neighborhoodName,
        oneSignalAppId: userData.oneSignalAppId || null, // Ajouter OneSignal App ID si fourni
      },
    });

    const { passwordHash, ...result } = user;
    
    // Envoyer un OTP pour vérifier l'email
    await this.sendOtp(user.email, 'VERIFY_EMAIL');
    
    return {
      message: 'Compte créé avec succès. Un code de vérification a été envoyé à votre email.',
      user: {
        id: result.id,
        email: result.email,
        phone: result.phone,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        isActive: result.isActive,
        isVerified: result.isVerified,
      }
    };
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string) {
    return await this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async createGoogleUser(googleUser: any) {
    // Créer un utilisateur avec les données Google
    const user = await this.prisma.user.create({
      data: {
        firstName: googleUser.firstName || 'Google',
        lastName: googleUser.lastName || 'User',
        email: googleUser.email,
        phone: `+237${Math.random().toString().slice(2, 11)}`, // Générer un téléphone temporaire
        passwordHash: '', // Pas de mot de passe pour les utilisateurs Google
        role: 'CITIZEN',
        isVerified: true, // Les utilisateurs Google sont considérés comme vérifiés
        isActive: true,
      },
    });

    return user;
  }

  async sendOtp(emailOrPhone: string, purpose: string = 'VERIFY_EMAIL') {
    this.logger.log(`=== DÉBUT SEND OTP ===`);
    this.logger.log(`Email/Phone: ${emailOrPhone}`);
    this.logger.log(`Purpose: ${purpose}`);
    
    const isEmail = emailOrPhone.includes('@');
    this.logger.log(`Is Email: ${isEmail}`);
    
    let user;
    if (isEmail) {
      this.logger.log('Recherche par email...');
      user = await this.findByEmail(emailOrPhone);
    } else {
      this.logger.log('Recherche par téléphone...');
      user = await this.findByPhone(emailOrPhone);
    }
    
    this.logger.log(`User found: ${user ? 'YES' : 'NO'}`);
    
    // 🛡️ SÉCURITÉ: Ne pas révéler si l'utilisateur existe (comme requestPasswordReset)
    if (!user) {
      this.logger.warn('Utilisateur non trouvé - retour silencieux pour sécurité');
      return {
        message: 'Si cet utilisateur existe, un code de vérification a été envoyé',
        expiresIn: 600,
      };
    }

    this.logger.log(`User ID: ${user.id}`);
    
    try {
      // Générer et stocker l'OTP dans la base de données
      const code = await this.otpService.generateOtp();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      this.logger.log(`OTP généré: ${code}`);
      this.logger.log(`Expires à: ${expiresAt}`);
      
      // Supprimer les anciens OTP pour cet utilisateur et ce purpose
      this.logger.log('Suppression des anciens OTP...');
      const deleteResult = await this.prisma.otpToken.deleteMany({
        where: {
          userId: user.id,
          purpose: purpose
        }
      });
      this.logger.log(`Anciens OTP supprimés: ${deleteResult.count}`);
      
      // Créer le nouvel OTP
      this.logger.log('Création du nouvel OTP...');
      const newOtp = await this.prisma.otpToken.create({
        data: {
          userId: user.id,
          code: code,
          purpose: purpose,
          expiresAt: expiresAt
        }
      });
      this.logger.log(`Nouvel OTP créé avec ID: ${newOtp.id}`);

      // Envoyer l'OTP avec timeout
      this.logger.log('Envoi de l\'OTP...');
      const emailPromise = this.otpService.sendOtpEmail(emailOrPhone, code);
      
      // 🕐 Timeout de 30 secondes pour l'envoi email
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout envoi email')), 30000);
      });
      
      await Promise.race([emailPromise, timeoutPromise]);
      this.logger.log('✅ OTP envoyé par email');

      this.logger.log('=== FIN SEND OTP ===');
      return {
        message: 'Code OTP envoyé avec succès',
        expiresIn: 600, // 10 minutes
      };
    } catch (error) {
      this.logger.error(`❌ Erreur dans sendOtp: ${error.message}`, error.stack);
      
      // 🛡️ En cas d'erreur SMTP, retourner un message générique
      if (error.message.includes('Timeout') || error.message.includes('SMTP')) {
        return {
          message: 'Code OTP généré mais erreur lors de l\'envoi. Veuillez réessayer.',
          expiresIn: 600,
        };
      }
      
      throw error;
    }
  }

  async verifyOtp(emailOrPhone: string, code: string, purpose: string = 'VERIFY_EMAIL') {
    const isEmail = emailOrPhone.includes('@');
    
    let user;
    if (isEmail) {
      user = await this.findByEmail(emailOrPhone);
    } else {
      user = await this.findByPhone(emailOrPhone);
    }
    
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Récupérer l'OTP le plus récent pour cet utilisateur et ce purpose
    const otpToken = await this.prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        purpose: purpose,
        usedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!otpToken) {
      throw new UnauthorizedException('Code OTP expiré ou invalide');
    }
    
    // Vérifier si l'OTP a expiré
    if (new Date() > otpToken.expiresAt) {
      await this.prisma.otpToken.delete({
        where: { id: otpToken.id }
      });
      throw new UnauthorizedException('Code OTP expiré');
    }

    // Vérifier le code
    if (otpToken.code !== code) {
      throw new UnauthorizedException('Code OTP invalide');
    }

    // Marquer l'OTP comme utilisé
    await this.prisma.otpToken.update({
      where: { id: otpToken.id },
      data: { usedAt: new Date() }
    });

    // Si c'est une vérification d'email, activer le compte
    if (purpose === 'VERIFY_EMAIL') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          isVerified: true,
          isActive: true
        }
      });
    }

    return {
      message: 'Code OTP vérifié avec succès',
      isValid: true,
    };
  }

  async verifySessionToken(sessionToken: string): Promise<boolean> {
    if (!global.sessionStore || !global.sessionStore.has(sessionToken)) {
      return false;
    }

    const sessionData = global.sessionStore.get(sessionToken);
    
    // Vérifier si la session a expiré
    if (new Date() > sessionData.expiresAt) {
      global.sessionStore.delete(sessionToken);
      return false;
    }

    return sessionData.verified;
  }

  async requestPasswordReset(emailOrPhone: string): Promise<{ message: string }> {
    // Trouver l'utilisateur par email ou téléphone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone }
        ]
      }
    });

    if (!user) {
      // Pour des raisons de sécurité, ne pas révéler si l'utilisateur existe
      return { message: 'Si cet utilisateur existe, un code de réinitialisation a été envoyé' };
    }

    // Utiliser la méthode sendOtp pour générer et envoyer le code
    await this.sendOtp(emailOrPhone, 'RESET_PASSWORD');
    
    return { 
      message: 'Un code de réinitialisation a été envoyé à votre adresse email ou numéro de téléphone' 
    };
  }

  async resetPassword(emailOrPhone: string, code: string, newPassword: string): Promise<{ message: string }> {
    // Trouver l'utilisateur par email ou téléphone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone }
        ]
      }
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Vérifier l'OTP en utilisant la méthode verifyOtp
    await this.verifyOtp(emailOrPhone, code, 'RESET_PASSWORD');

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword }
    });

    // Invalider le refresh token de l'utilisateur
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null }
    });

    return { 
      message: 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.' 
    };
  }
}
