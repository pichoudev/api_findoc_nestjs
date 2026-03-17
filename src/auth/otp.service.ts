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
      name: 'Cleaner App',
      issuer: 'Cleaner',
      length: 32,
    });

    const code = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 600, // 10 minutes
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 5 minutes

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
        subject: '🔐 Code de vérification - Cleaner App',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code de vérification - Cleaner App</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f7fa;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
              }
              .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="30" cy="20" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="70" cy="25" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="15" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
              }
              .logo {
                font-size: 48px;
                margin-bottom: 10px;
                display: block;
              }
              .title {
                font-size: 28px;
                font-weight: 600;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .subtitle {
                font-size: 16px;
                opacity: 0.9;
                margin: 5px 0 0 0;
                font-weight: 300;
              }
              .content {
                padding: 40px 30px;
              }
              .section-title {
                font-size: 24px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                text-align: center;
              }
              .section-text {
                font-size: 16px;
                line-height: 1.6;
                color: #666;
                margin-bottom: 30px;
                text-align: center;
              }
              .code-container {
                background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%);
                border: 2px solid #0066cc;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
                position: relative;
                overflow: hidden;
              }
              .code-container::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(0, 102, 204, 0.05), transparent);
                animation: shimmer 3s infinite;
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
              }
              .code-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
              }
              .code {
                font-size: 36px;
                font-weight: 700;
                color: #0066cc;
                letter-spacing: 8px;
                margin: 15px 0;
                font-family: 'Courier New', monospace;
                text-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);
              }
              .expiry {
                font-size: 14px;
                color: #ff6b6b;
                margin-top: 15px;
                font-weight: 500;
              }
              .features {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 30px 0;
              }
              .feature {
                text-align: center;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
              }
              .feature-icon {
                font-size: 24px;
                margin-bottom: 10px;
                display: block;
              }
              .feature-title {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
              }
              .feature-text {
                font-size: 12px;
                color: #666;
                line-height: 1.4;
              }
              .security-note {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .security-note-title {
                font-weight: 600;
                color: #856404;
                margin-bottom: 5px;
                font-size: 14px;
              }
              .security-note-text {
                color: #856404;
                font-size: 13px;
                line-height: 1.4;
              }
              .footer {
                background-color: #2c3e50;
                color: white;
                padding: 30px;
                text-align: center;
                font-size: 14px;
              }
              .footer-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
              }
              .footer-brand {
                font-weight: 600;
                font-size: 16px;
              }
              .footer-links {
                display: flex;
                gap: 20px;
                font-size: 12px;
              }
              .footer-links a {
                color: #95a5a6;
                text-decoration: none;
              }
              .footer-links a:hover {
                color: white;
              }
              .footer-copyright {
                border-top: 1px solid #34495e;
                padding-top: 20px;
                font-size: 12px;
                opacity: 0.8;
              }
              .support-info {
                background-color: #e8f5e8;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
              }
              .support-info-title {
                font-weight: 600;
                color: #27ae60;
                margin-bottom: 5px;
                font-size: 14px;
              }
              .support-info-text {
                color: #27ae60;
                font-size: 13px;
              }
              @media (max-width: 600px) {
                .container {
                  margin: 10px;
                  border-radius: 8px;
                }
                .header {
                  padding: 30px 20px;
                }
                .content {
                  padding: 30px 20px;
                }
                .features {
                  grid-template-columns: 1fr;
                  gap: 15px;
                }
                .footer-content {
                  flex-direction: column;
                  gap: 15px;
                }
                .code {
                  font-size: 28px;
                  letter-spacing: 6px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <span class="logo">🗑️</span>
                <h1 class="title">Cleaner App</h1>
                <p class="subtitle">Plateforme de gestion des déchets - Douala</p>
              </div>
              
              <div class="content">
                <h2 class="section-title">🔐 Code de vérification</h2>
                <p class="section-text">
                  Bonjour et bienvenue dans Cleaner App !<br>
                  Pour finaliser votre inscription et accéder à votre compte, veuillez utiliser le code de vérification ci-dessous :
                </p>
                
                <div class="code-container">
                  <div class="code-label">VOTRE CODE DE VÉRIFICATION</div>
                  <div class="code">${code}</div>
                  <div class="expiry">⏰ Ce code expirera dans 5 minutes</div>
                </div>
                
                <div class="features">
                  <div class="feature">
                    <span class="feature-icon">🔒</span>
                    <div class="feature-title">Sécurité</div>
                    <div class="feature-text">Votre code est unique et sécurisé</div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">⚡</span>
                    <div class="feature-title">Rapide</div>
                    <div class="feature-text">Activation instantanée de votre compte</div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🌍</span>
                    <div class="feature-title">Écologique</div>
                    <div class="feature-text">Contribuez à un Douala plus propre</div>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">📱</span>
                    <div class="feature-title">Mobile</div>
                    <div class="feature-text">Accès depuis n'importe où</div>
                  </div>
                </div>
                
                <div class="security-note">
                  <div class="security-note-title">🛡️ Important : Sécurité</div>
                  <div class="security-note-text">
                    - Ne partagez jamais ce code avec d'autres personnes<br>
                    - Notre équipe ne vous demandera jamais ce code par téléphone<br>
                    - Ce code ne peut être utilisé qu'une seule fois
                  </div>
                </div>
                
                <div class="support-info">
                  <div class="support-info-title">💬 Besoin d'aide ?</div>
                  <div class="support-info-text">
                    Contactez notre support : support@cleaner.cm<br>
                    Ou appelez-nous au : +237 123 456 789
                  </div>
                </div>
                
                <p class="section-text" style="margin-top: 30px;">
                  Si vous n'avez pas demandé ce code, veuillez ignorer cet email.<br>
                  Merci de faire confiance à Cleaner App pour une ville plus propre !
                </p>
              </div>
              
              <div class="footer">
                <div class="footer-content">
                  <div class="footer-brand">Cleaner App</div>
                  <div class="footer-links">
                    <a href="#">À propos</a>
                    <a href="#">Services</a>
                    <a href="#">Contact</a>
                    <a href="#">Mentions légales</a>
                  </div>
                </div>
                <div class="footer-copyright">
                  © 2026 Cleaner App. Tous droits réservés.<br>
                  Plateforme de gestion des déchets pour la ville de Douala<br>
                  Faisons de Douala une ville plus propre, ensemble ! 🌱
                </div>
              </div>
            </div>
          </body>
          </html>
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
