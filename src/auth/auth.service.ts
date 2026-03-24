import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

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

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      phone: user.phone,
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);
    const refresh_token = randomBytes(40).toString('hex');
    
    console.log(`🔄 Tentative de sauvegarde du refresh token pour l'utilisateur ${user.id}`);
    console.log(`📝 Refresh token généré: ${refresh_token.substring(0, 10)}...`);
    
    // Sauvegarder le refresh token dans le modèle User
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refresh_token }
    });
    
    console.log(`✅ Refresh token sauvegardé: ${updatedUser.refreshToken ? 'OUI' : 'NON'}`);
    console.log(`📊 Valeur dans la base: ${updatedUser.refreshToken?.substring(0, 10)}...`);
    
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
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

    return user;
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

    // Générer et stocker l'OTP dans la base de données
    const { code, secret, expiresAt } = this.otpService.generateOtp();
    
    // Supprimer les anciens OTP pour cet utilisateur et ce purpose
    await this.prisma.otpToken.deleteMany({
      where: {
        userId: user.id,
        purpose: purpose
      }
    });
    
    // Créer le nouvel OTP
    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        code: code,
        purpose: purpose,
        expiresAt: expiresAt
      }
    });

    // Envoyer l'OTP
    if (isEmail) {
      await this.otpService.sendOtpEmail(emailOrPhone, code);
    } else {
      await this.otpService.sendSmsOtp(emailOrPhone, code);
    }

    return {
      message: 'Code OTP envoyé avec succès',
      expiresIn: 300, // 5 minutes
    };
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
