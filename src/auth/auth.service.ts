import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcryptjs';
import { ProductionLogger } from '../common/logger';
import { randomBytes } from 'crypto';
import { Type_utilisateur } from '@prisma/client';

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
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email },
    });

    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isPasswordValid = await bcrypt.compare(password, utilisateur.mot_de_passe_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    if (!utilisateur.est_actif) {
      throw new UnauthorizedException('Compte non activé. Veuillez vérifier votre email.');
    }

    const { mot_de_passe_hash, ...result } = utilisateur;
    return result;
  }

  async login(user: any, loginData?: { oneSignalId?: string }) {
    console.log('🔐 LOGIN - Configuration JWT:');
    console.log('JWT_EXPIRATION from env:', this.configService.get<string>('JWT_EXPIRATION'));
    
    const payload = { 
      sub: user.id, 
      email: user.email, 
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
    
    console.log(`🔄 Refresh token généré: ${refresh_token.substring(0, 10)}...`);

  
    
    // Sauvegarder le refresh token dans la base de données
    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { 
        refresh_token: refresh_token,
        one_signal_id:loginData?.oneSignalId,
        est_actif: true
      }
    });
    
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        ville:user.ville,
        region:user.region,
        est_verifie: user.est_verifie,
        est_actif: user.est_actif,
        photo: user.photo,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    console.log(`🔍 Recherche de l'utilisateur avec refresh token: ${refreshToken.substring(0, 10)}...`);
    
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: { 
        refresh_token: refreshToken,
        est_actif: true
      },
    });
    
    if (!utilisateur) {
      throw new UnauthorizedException('Refresh token invalide ou utilisateur inactif');
    }
    
    // Générer un nouveau access token
    const payload = { 
      sub: utilisateur.id, 
      email: utilisateur.email, 
      role: utilisateur.role 
    };
    
    const access_token = this.jwtService.sign(payload);
    
    // Générer un nouveau refresh token
    const new_refresh_token = randomBytes(40).toString('hex');
    
    // Mettre à jour le refresh token dans la base de données
    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { refresh_token: new_refresh_token }
    });
    
    return {
      access_token,
      refresh_token: new_refresh_token,
      user: {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        telephone: utilisateur.telephone,
        role: utilisateur.role,
        est_verifie: utilisateur.est_verifie,
        est_actif: utilisateur.est_actif,
        photo: utilisateur.photo,
      },
    };
  }

  async findByEmail(email: string) {
    return await this.prisma.utilisateur.findUnique({
      where: { email },
    });
  }

  async createUtilisateur(userData: {
    prenom: string;
    nom: string;
    email: string;
    telephone?: string;
    mot_de_passe: string;
    role?: Type_utilisateur;
    ville?: string;
    one_signal_id?: string;
  }) {
    const hashedPassword = await bcrypt.hash(userData.mot_de_passe, 10);
    
    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        prenom: userData.prenom,
        nom: userData.nom,
        email: userData.email,
        telephone: userData.telephone,
        mot_de_passe_hash: hashedPassword,
        role: userData.role || Type_utilisateur.UTILISATEUR,
        ville: userData.ville,
        one_signal_id: userData.one_signal_id,
        est_actif: false // Inactif jusqu'à vérification email
      },
    });

    // Envoyer un OTP pour vérifier l'email
    await this.otpService.sendOtpToUser(userData.email, 'VERIFY_EMAIL');
    
    return utilisateur;
  }

  async createGoogleUser(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }) {
    // Générer un mot de passe aléatoire pour les utilisateurs Google
    const randomPassword = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    return await this.prisma.utilisateur.create({
      data: {
        prenom: googleUser.firstName,
        nom: googleUser.lastName,
        email: googleUser.email,
        mot_de_passe_hash: hashedPassword,
        photo: googleUser.picture,
        est_verifie: true, // Les utilisateurs Google sont considérés comme vérifiés
        role: Type_utilisateur.UTILISATEUR,
      },
    });
  }

  async verifyEmailWithOtp(email: string, otpCode: string) {
    // Vérifier l'OTP
    const utilisateur = await this.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isOtpValid = await this.otpService.verifyOtp(utilisateur.id, otpCode, 'VERIFY_EMAIL');
    if (!isOtpValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    // Activer le compte et marquer comme vérifié
    return await this.prisma.utilisateur.update({
      where: { email },
      data: { 
        est_verifie: true,
        est_actif: true
      },
    });
  }

  async verifyEmail(email: string) {
    return await this.prisma.utilisateur.update({
      where: { email },
      data: { est_verifie: true },
    });
  }

  async requestPasswordReset(email: string) {
    const utilisateur = await this.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Envoyer un OTP pour réinitialiser le mot de passe
    await this.otpService.sendOtpToUser(email, 'RESET_PASSWORD');
    
    return { message: 'Code de réinitialisation envoyé par email' };
  }

  async resetPasswordWithOtp(email: string, otpCode: string, newPassword: string) {
    // Vérifier l'OTP
    const utilisateur = await this.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isOtpValid = await this.otpService.verifyOtp(utilisateur.id, otpCode, 'RESET_PASSWORD');
    if (!isOtpValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    // Mettre à jour le mot de passe
    return await this.updatePassword(utilisateur.id, newPassword);
  }

  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { mot_de_passe_hash: hashedPassword },
    });
  }

  async activateUser(userId: string) {
    return await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { est_actif: true },
    });
  }

  async deactivateUser(userId: string) {
    return await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { 
        est_actif: false,
        refresh_token: null // Révoquer tous les tokens
      },
    });
  }

  async resendVerificationOtp(email: string) {
    const utilisateur = await this.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (utilisateur.est_verifie) {
      throw new UnauthorizedException('Ce compte est déjà vérifié');
    }

    // Renvoyer un OTP pour vérifier l'email
    await this.otpService.sendOtpToUser(email, 'VERIFY_EMAIL');
    
    return { message: 'Code de vérification renvoyé par email' };
  }

  async logout(userId: string) {
    return await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
  }
}
