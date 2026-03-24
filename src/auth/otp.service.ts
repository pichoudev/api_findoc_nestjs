import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OtpService {
  private transporter: nodemailer.Transporter;
  private readonly logger: Logger;

  constructor(private configService: ConfigService) {
    this.logger = new Logger('OtpService');
    
    // 🔄 Configuration différente pour production
    const isProduction = process.env.NODE_ENV === 'production';
    const port = isProduction ? 465 : 587;
    const secure = isProduction ? true : false;
    
    this.logger.log(`Configuration SMTP: ${isProduction ? 'PRODUCTION' : 'LOCAL'} - Port ${port}`);
    
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('MAIL_PORT') || port,
      secure: secure,
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      // 🕐 Timeout plus long en production
      connectionTimeout: isProduction ? 60000 : 30000,
      greetingTimeout: isProduction ? 30000 : 10000,
      socketTimeout: isProduction ? 60000 : 30000,
    });
  }

  // 🔍 Méthodes publiques pour le diagnostic
  async verifyConnection(): Promise<boolean> {
    return await this.transporter.verify();
  }

  async sendSimpleEmail(to: string, subject: string, content: string): Promise<any> {
    return await this.transporter.sendMail({
      from: `"${this.configService.get<string>('MAIL_FROM_NAME', 'Cleaner App')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS', 'noreply@cleaner.cm')}>`,
      to,
      subject,
      text: content,
      html: `<p>${content}</p>`,
    });
  }

  generateOtp(): { code: string; secret: string; expiresAt: Date } {
    const secret = speakeasy.generateSecret({
      name: 'Cleaner App',
      issuer: 'Cleaner',
      length: 32,
    });

    const code = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 600,
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
      code,
      secret: secret.base32,
      expiresAt,
    };
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    try {
      this.logger.log(`Envoi du code OTP ${code} à ${email}`);
      this.logger.log(`Configuration SMTP: ${this.configService.get('MAIL_HOST')}:${this.configService.get('MAIL_PORT')}`);

      // 🕐 Timeout différent selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const timeoutMs = isProduction ? 60000 : 30000; // 60s production, 30s local
      
      this.logger.log(`Timeout configuré: ${timeoutMs}ms (${isProduction ? 'PRODUCTION' : 'LOCAL'})`);

      // 🕐 Timeout de 30/60 secondes pour l'envoi email
      const emailPromise = this.transporter.sendMail({
        from: `"${this.configService.get<string>('MAIL_FROM_NAME', 'Cleaner App')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS')}>`,
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
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout envoi email après ${timeoutMs}ms`)), timeoutMs);
      });

      await Promise.race([emailPromise, timeoutPromise]);
      this.logger.log('Email OTP envoyé avec succès');
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email OTP: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error.message}`);
    }
  }

  verifyOtp(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async validateOtpWithAttempts(
    emailOrPhone: string,
    token: string,
  ): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
    console.log(`Validation OTP pour ${emailOrPhone} avec code: ${token}`);

    if (!global.otpStore) {
      return { success: false, message: 'Aucun code OTP trouvé pour cet utilisateur' };
    }

    const otpData = global.otpStore.get(emailOrPhone);

    if (!otpData) {
      return { success: false, message: 'Aucun code OTP trouvé pour cet utilisateur' };
    }

    if (new Date() > otpData.expiresAt) {
      global.otpStore.delete(emailOrPhone);
      return { success: false, message: 'Code OTP expiré' };
    }

    const maxAttempts = 3;

    if (otpData.attempts >= maxAttempts) {
      global.otpStore.delete(emailOrPhone);
      return {
        success: false,
        message: 'Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.',
      };
    }

    otpData.attempts++;

    const isValid = this.verifyOtp(otpData.secret, token);

    if (isValid) {
      global.otpStore.delete(emailOrPhone);
      return { success: true, message: 'Code OTP validé avec succès' };
    }

    const remainingAttempts = maxAttempts - otpData.attempts;

    if (remainingAttempts <= 0) {
      global.otpStore.delete(emailOrPhone);
      return {
        success: false,
        message: 'Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.',
      };
    }

    return {
      success: false,
      message: `Code incorrect. ${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}`,
      remainingAttempts,
    };
  }

  async sendSmsOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`Envoi SMS OTP vers ${phone}: ${code}`);
    // TODO: Implémenter avec un service SMS réel (ex: Twilio)
  }

  // 🚨 Cette méthode est dépréciée - utiliser auth.service.sendOtp à la place
  async sendOtp(emailOrPhone: string): Promise<{ message: string }> {
    this.logger.warn('⚠️ sendOtp() dans otp.service.ts est déprécié. Utiliser auth.service.sendOtp()');
    
    const { code, secret, expiresAt } = this.generateOtp();

    if (!global.otpStore) {
      global.otpStore = new Map();
    }

    global.otpStore.set(emailOrPhone, {
      secret,
      code,
      expiresAt,
      attempts: 0,
    });

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