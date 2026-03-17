import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OtpService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('MAIL_PORT') || 587,
      secure: false, // true pour 465, false pour autres ports
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false, // Accepter les certificats auto-signés
      },
    });
  }

  generateOtp(): { code: string; secret: string; expiresAt: Date } {
    const secret = speakeasy.generateSecret({
      name: 'WASO App',
      issuer: 'WASO',
      length: 32,
    });

    const code = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 300, // 5 minutes
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    return {
      code,
      secret: secret.base32,
      expiresAt,
    };
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      // Toujours envoyer l'email (même en développement) pour tester la configuration SMTP
      console.log(`� Envoi du code OTP ${code} à ${email}`);
      console.log(`� Configuration SMTP: ${this.configService.get('MAIL_HOST')}:${this.configService.get('MAIL_PORT')}`);
      
      await this.transporter.sendMail({
        from: `"${this.configService.get<string>('MAIL_FROM_NAME', 'Cleaner App')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS')}>`,
        to: email,
        subject: 'Code de vérification - Cleaner App',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center;">
              <h1>🗑️ Cleaner App</h1>
              <p>Plateforme de gestion des déchets - Douala</p>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
              <h2>Code de vérification</h2>
              <p>Bonjour,</p>
              <p>Votre code de vérification pour finaliser votre inscription est :</p>
              <div style="background-color: #0066cc; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px;">
                ${code}
              </div>
              <p>Ce code expirera dans 5 minutes.</p>
              <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet email.</p>
            </div>
            <div style="background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2026 Cleaner App. Tous droits réservés.</p>
            </div>
          </div>
        `,
      });
      
      console.log('✅ Email OTP envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email OTP:', error.message);
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error.message}`);
    }
  }

  verifyOtp(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Permet une fenêtre de temps de 2 steps (10 minutes)
    });
  }

  async sendSmsOtp(phone: string, code: string): Promise<void> {
    // Implémentation SMS (optionnel - nécessite un service SMS comme Twilio)
    console.log(`Envoi SMS OTP vers ${phone}: ${code}`);
    // TODO: Implémenter avec un service SMS réel
  }

  async sendOtp(emailOrPhone: string): Promise<{ message: string }> {
    const { code, secret, expiresAt } = this.generateOtp();
    
    // Stocker l'OTP dans le store global
    if (!global.otpStore) {
      global.otpStore = new Map();
    }
    
    global.otpStore.set(emailOrPhone, {
      secret,
      code,
      expiresAt,
      attempts: 0,
    });

    // Détecter si c'est un email ou un téléphone
    const isEmail = emailOrPhone.includes('@');
    
    if (isEmail) {
      await this.sendOtpEmail(emailOrPhone, code);
      return { message: 'Code OTP envoyé par email' };
    } else {
      await this.sendSmsOtp(emailOrPhone, code);
      return { message: 'Code OTP envoyé par SMS' };
    }
  }
}
