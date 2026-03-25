import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(OtpService.name);

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
      const mailFromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Cleaner App';

      const mailOptions = {
        from: `"${mailFromName}" <${mailFrom}>`,
        to: email,
        subject: 'Code de vérification — Cleaner App',
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code de vérification — Cleaner App</title>
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

              /* ── Header ── */
              .header {
                background-color: #0a3d62;
                padding: 36px 40px;
              }

              .header-brand {
                font-size: 13px;
                font-weight: 600;
                color: #ffffff;
                letter-spacing: 2px;
                text-transform: uppercase;
              }

              .header-tagline {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.55);
                margin-top: 4px;
                letter-spacing: 0.5px;
              }

              /* ── Body ── */
              .body {
                padding: 44px 40px;
              }

              .greeting {
                font-size: 22px;
                font-weight: 600;
                color: #0a3d62;
                margin-bottom: 14px;
                line-height: 1.3;
              }

              .intro {
                font-size: 14px;
                color: #555555;
                line-height: 1.75;
                margin-bottom: 36px;
              }

              /* ── Code block ── */
              .code-block {
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 32px 24px;
                text-align: center;
                margin-bottom: 36px;
                background-color: #fafafa;
              }

              .code-label {
                font-size: 11px;
                font-weight: 600;
                color: #999999;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 18px;
              }

              .code-value {
                font-size: 38px;
                font-weight: 700;
                color: #0a3d62;
                letter-spacing: 10px;
                font-family: 'Courier New', 'Lucida Console', monospace;
                line-height: 1;
              }

              .code-expiry {
                font-size: 12px;
                color: #999999;
                margin-top: 18px;
              }

              .code-expiry strong {
                color: #c0392b;
                font-weight: 600;
              }

              /* ── Divider ── */
              .divider {
                height: 1px;
                background-color: #eeeeee;
                margin: 32px 0;
              }

              /* ── Security note ── */
              .security {
                border-left: 3px solid #0a3d62;
                padding: 14px 18px;
                background-color: #f0f5f9;
                border-radius: 0 4px 4px 0;
                margin-bottom: 32px;
              }

              .security-title {
                font-size: 12px;
                font-weight: 700;
                color: #0a3d62;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }

              .security ul {
                list-style: none;
                padding: 0;
              }

              .security ul li {
                font-size: 13px;
                color: #555555;
                line-height: 1.7;
                padding-left: 14px;
                position: relative;
              }

              .security ul li::before {
                content: '—';
                position: absolute;
                left: 0;
                color: #0a3d62;
                font-weight: 700;
              }

              /* ── Disclaimer ── */
              .disclaimer {
                font-size: 13px;
                color: #888888;
                line-height: 1.7;
              }

              /* ── Footer ── */
              .footer {
                background-color: #f9f9f9;
                border-top: 1px solid #eeeeee;
                padding: 28px 40px;
              }

              .footer-support {
                font-size: 13px;
                color: #777777;
                line-height: 1.7;
                margin-bottom: 16px;
              }

              .footer-support a {
                color: #0a3d62;
                text-decoration: none;
                font-weight: 500;
              }

              .footer-copy {
                font-size: 11px;
                color: #bbbbbb;
                letter-spacing: 0.3px;
              }

              .provider-info {
                background-color: #e8f4f8;
                border: 1px solid #d1e7f0;
                border-radius: 4px;
                padding: 12px 16px;
                margin-bottom: 24px;
                font-size: 12px;
                color: #2c5282;
              }

              @media (max-width: 600px) {
                .body { padding: 32px 24px; }
                .footer { padding: 24px; }
                .header { padding: 28px 24px; }
                .code-value { font-size: 30px; letter-spacing: 6px; }
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="container">

                <div class="header">
                  <div class="header-brand">Cleaner App</div>
                  <div class="header-tagline">Gestion des déchets — Douala</div>
                </div>

                <div class="body">
                  <div class="provider-info">
                    📧 Email envoyé via Brevo SMTP (smtp-relay.brevo.com)
                  </div>

                  <p class="greeting">Code de vérification</p>
                  <p class="intro">
                    Bienvenue sur Cleaner App. Pour finaliser votre inscription et activer votre compte, veuillez saisir le code ci-dessous dans l'application.
                  </p>

                  <div class="code-block">
                    <div class="code-label">Votre code</div>
                    <div class="code-value">${code}</div>
                    <div class="code-expiry">
                      Expire dans <strong>10 minutes</strong>
                    </div>
                  </div>

                  <div class="security">
                    <div class="security-title">Sécurité</div>
                    <ul>
                      <li>Ne communiquez jamais ce code à un tiers</li>
                      <li>Notre équipe ne vous demandera jamais ce code par téléphone</li>
                      <li>Ce code est à usage unique</li>
                    </ul>
                  </div>

                  <div class="divider"></div>

                  <p class="disclaimer">
                    Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité. Aucune action ne sera effectuée sur votre compte.
                  </p>
                </div>

                <div class="footer">
                  <p class="footer-support">
                    Une question ? Contactez notre support à l'adresse
                    <a href="mailto:support@cleaner.cm">support@cleaner.cm</a>
                    ou au <a href="tel:+237123456789">+237 123 456 789</a>.
                  </p>
                  <p class="footer-copy">
                    &copy; 2026 Cleaner App — Tous droits réservés.<br>
                    Plateforme de gestion des déchets pour la ville de Douala.
                  </p>
                </div>

              </div>
            </div>
          </body>
          </html>
        `,
      };

      // Ajout d'un timeout pour éviter que l'envoi ne bloque trop longtemps
      const emailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout SMTP après 30 secondes')), 30000);
      });

      await Promise.race([emailPromise, timeoutPromise]);
      this.logger.log(`Email OTP envoyé avec succès via Brevo à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email OTP via Brevo: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error.message}`);
    }
  }

  async verifyBrevoConnection(): Promise<void> {
    try {
      this.logger.log('Vérification de la connexion Brevo SMTP...');
      
      // Tenter de vérifier la connexion
      await this.transporter.verify();
      
      this.logger.log('✅ Connexion Brevo SMTP vérifiée avec succès');
    } catch (error) {
      this.logger.error(`❌ Erreur de connexion Brevo: ${error.message}`);
      throw new Error(`Erreur de connexion Brevo: ${error.message}`);
    }
  }

  async sendSimpleTestEmail(to: string, subject: string, message: string): Promise<void> {
    try {
      this.logger.log(`Envoi d'email test à ${to} via Brevo SMTP`);

      const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
      const mailFromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Cleaner App';

      const mailOptions = {
        from: `"${mailFromName}" <${mailFrom}>`,
        to: to,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background-color: #0a3d62;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                padding: 20px;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🧪 Test Email - Cleaner App</h2>
                <p>Powered by Brevo SMTP</p>
              </div>
              <div class="content">
                <p>${message}</p>
                <hr>
                <p><strong>Détails de la configuration:</strong></p>
                <ul>
                  <li>Fournisseur: Brevo (smtp-relay.brevo.com)</li>
                  <li>Port: 587</li>
                  <li>Encryption: TLS</li>
                  <li>Destinataire: ${to}</li>
                </ul>
              </div>
              <div class="footer">
                <p>&copy; 2026 Cleaner App - Plateforme de gestion des déchets</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email test envoyé avec succès via Brevo. ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email test via Brevo: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de l'envoi de l'email test: ${error.message}`);
    }
  }

  async generateOtp(): Promise<string> {
    // Générer un code OTP à 6 chiffres
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOtp(userId: string, code: string, purpose: string = 'VERIFY_EMAIL'): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire après 10 minutes

    // Supprimer les anciens OTP pour cet utilisateur et ce but
    await this.prisma.otpToken.deleteMany({
      where: {
        userId,
        purpose,
      },
    });

    // Créer le nouvel OTP
    await this.prisma.otpToken.create({
      data: {
        userId,
        code,
        purpose,
        expiresAt,
      },
    });

    this.logger.log(`OTP ${code} sauvegardé pour l'utilisateur ${userId}, but: ${purpose}`);
  }

  async verifyOtp(userId: string, code: string, purpose: string = 'VERIFY_EMAIL'): Promise<boolean> {
    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        userId,
        code,
        purpose,
        usedAt: null,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!otpRecord) {
      this.logger.warn(`OTP invalide ou expiré pour l'utilisateur ${userId}`);
      return false;
    }

    // Marquer l'OTP comme utilisé
    await this.prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`OTP ${code} vérifié avec succès pour l'utilisateur ${userId}`);
    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    const deleted = await this.prisma.otpToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Nettoyage de ${deleted.count} OTP expirés`);
    }
  }
}
