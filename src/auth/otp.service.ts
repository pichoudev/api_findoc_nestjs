import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(OtpService.name);
  private otpStorage: Map<string, { code: string; expiresAt: Date; purpose: string }> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    // Configuration SMTP pour l'envoi d'emails
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = parseInt(this.configService.get<string>('MAIL_PORT') || '587');
    const mailUser = this.configService.get<string>('MAIL_USERNAME');
    const mailPass = this.configService.get<string>('MAIL_PASSWORD');
    const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
    const mailFromName = this.configService.get<string>('MAIL_FROM_NAME');

    if (!mailHost || !mailUser || !mailPass || !mailFrom) {
      this.logger.error('Configuration SMTP manquante');
      throw new Error('Configuration SMTP requise');
    }

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465, // true pour 465, false pour 587
      auth: {
        user: mailUser,
        pass: mailPass,
      },
      tls: {
        rejectUnauthorized: false, // Important pour Brevo
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });

    this.logger.log(`Service OTP initialisé avec SMTP: ${mailHost}:${mailPort}`);
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      this.logger.log(`Envoi du code OTP ${code} à ${email} via Brevo SMTP`);

      const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
      const mailFromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Findoc App';

      const mailOptions = {
        from: `"${mailFromName}" <${mailFrom}>`,
        to: email,
        subject: 'Code de vérification — Findoc App',
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code de vérification — Findoc App</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                background-color: #f4f4f4;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 15px;
                color: #1a1a1a;
                -webkit-font-smoothing: antialiased;
              }
              .wrapper {
                width: 100%;
                padding: 48px 16px;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 560px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 4px;
                overflow: hidden;
              }
              .header {
                background-color: #0a3d62;
                padding: 36px 40px;
              }
              .header-brand {
                font-size: 13px;
                font-weight: 600;
                color: #ffffff;
              }
              .content {
                padding: 40px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #1a1a1a;
              }
              .text {
                margin-bottom: 32px;
                line-height: 1.6;
                color: #666666;
              }
              .code-container {
                background-color: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                padding: 24px;
                text-align: center;
                margin: 32px 0;
              }
              .code {
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                color: #0a3d62;
                font-family: 'Courier New', monospace;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 24px 40px;
                text-align: center;
                color: #666666;
                font-size: 13px;
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="container">
                <div class="header">
                  <div class="header-brand">Findoc App</div>
                </div>
                <div class="content">
                  <h1 class="title">Code de vérification</h1>
                  <p class="text">
                    Votre code de vérification temporaire est ci-dessous. 
                    Ce code expirera dans 10 minutes pour des raisons de sécurité.
                  </p>
                  <div class="code-container">
                    <div class="code">${code}</div>
                  </div>
                  <p class="text">
                    Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.
                  </p>
                </div>
                <div class="footer">
                  <p>© 2024 Findoc App. Tous droits réservés.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email OTP envoyé avec succès: ${info.messageId}`);
      
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email OTP:', error);
      throw new Error('Impossible d\'envoyer l\'email de vérification');
    }
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOtp(utilisateurId: string, code: string, purpose: string = 'VERIFY_EMAIL'): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire après 10 minutes

    // Stocker l'OTP en mémoire (car le modèle OtpToken n'existe plus)
    const key = `${utilisateurId}_${purpose}`;
    this.otpStorage.set(key, {
      code,
      expiresAt,
      purpose,
    });

    this.logger.log(`OTP ${code} sauvegardé pour l'utilisateur ${utilisateurId}, but: ${purpose}`);
  }

  async verifyOtp(utilisateurId: string, code: string, purpose: string = 'VERIFY_EMAIL'): Promise<boolean> {
    const key = `${utilisateurId}_${purpose}`;
    const otpData = this.otpStorage.get(key);

    if (!otpData) {
      this.logger.warn(`OTP non trouvé pour l'utilisateur ${utilisateurId}`);
      return false;
    }

    if (otpData.expiresAt < new Date()) {
      this.logger.warn(`OTP expiré pour l'utilisateur ${utilisateurId}`);
      this.otpStorage.delete(key);
      return false;
    }

    if (otpData.code !== code) {
      this.logger.warn(`OTP invalide pour l'utilisateur ${utilisateurId}`);
      return false;
    }

    // Marquer l'OTP comme utilisé en le supprimant du stockage
    this.otpStorage.delete(key);
    this.logger.log(`OTP ${code} vérifié avec succès pour l'utilisateur ${utilisateurId}`);
    return true;
  }

  async sendOtpToUser(email: string, purpose: string = 'VERIFY_EMAIL'): Promise<void> {
    // Vérifier si l'utilisateur existe
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email },
    });

    if (!utilisateur) {
      throw new Error('Utilisateur non trouvé');
    }

    // Générer et sauvegarder l'OTP
    const otpCode = this.generateOtp();
    await this.saveOtp(utilisateur.id, otpCode, purpose);

    // Envoyer l'OTP par email
    await this.sendOtpEmail(email, otpCode);
  }

  // Nettoyer les OTP expirés (appel périodiquement)
  cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [key, otpData] of this.otpStorage.entries()) {
      if (otpData.expiresAt < now) {
        this.otpStorage.delete(key);
      }
    }
  }
}
