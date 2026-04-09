import { Controller, Get, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './src/auth/otp.service';
import { Public } from './src/auth/public.decorator';

@Public()
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    private configService: ConfigService,
    private otpService: OtpService
  ) {}

  @Get('mail-config')
  getMailConfig() {
    return {
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      username: this.configService.get('MAIL_USERNAME'),
      hasPassword: !!this.configService.get('MAIL_PASSWORD'),
      fromName: this.configService.get('MAIL_FROM_NAME'),
      fromAddress: this.configService.get('MAIL_FROM_ADDRESS'),
      nodeEnv: this.configService.get('NODE_ENV'),
    };
  }

  @Post('test-brevo-connection')
  async testBrevoConnection() {
    try {
      this.logger.log('=== TEST CONNEXION BREVO DÉTAILLÉ ===');
      
      const mailHost = this.configService.get<string>('MAIL_HOST');
      const mailPort = this.configService.get<string>('MAIL_PORT');
      const mailUser = this.configService.get<string>('MAIL_USERNAME');
      const mailPass = this.configService.get<string>('MAIL_PASSWORD');
      
      this.logger.log(`Hôte: ${mailHost}`);
      this.logger.log(`Port: ${mailPort}`);
      this.logger.log(`Utilisateur: ${mailUser}`);
      this.logger.log(`Mot de passe: ${mailPass ? '***' + mailPass.slice(-10) : 'NON DÉFINI'}`);
      
      // Test de vérification de la connexion
      await this.otpService.verifyBrevoConnection();
      
      return {
        success: true,
        message: 'Connexion Brevo vérifiée avec succès',
        config: {
          host: mailHost,
          port: mailPort,
          user: mailUser,
          passwordLength: mailPass ? mailPass.length : 0
        }
      };
    } catch (error) {
      this.logger.error(`❌ Erreur connexion Brevo: ${error.message}`, error.stack);
      
      return {
        success: false,
        message: error.message,
        error: error.stack,
        troubleshooting: {
          possibleCauses: [
            'Clé API Brevo incorrecte ou expirée',
            'Mauvais port SMTP (essayer 587, 465 ou 2525)',
            'Compte Brevo non vérifié',
            'Limites d\'envoi dépassées'
          ],
          recommendations: [
            'Vérifier la clé API dans le dashboard Brevo',
            'Utiliser le port 587 avec TLS',
            "S'assurer que le compte est vérifié",
            'Regénérer une nouvelle clé SMTP'
          ]
        }
      };
    }
  }

  @Post('test-email-brevo')
  async testEmailBrevo(@Body() body: { to?: string; subject?: string; message?: string }) {
    try {
      this.logger.log('=== TEST ENVOI EMAIL BREVO ===');
      
      const { to, subject, message } = body;
      const testTo = to || this.configService.get('MAIL_USERNAME');
      const testSubject = subject || '🧪 Test Brevo - Cleaner App';
      const testMessage = message || 'Ceci est un test de configuration SMTP avec Brevo.';
      
      this.logger.log(`Envoi d'email de test à: ${testTo}`);
      this.logger.log(`Sujet: ${testSubject}`);
      
      // Utiliser l'OtpService pour envoyer un email simple
      await this.otpService.sendSimpleTestEmail(testTo!, testSubject!, testMessage!);
      
      this.logger.log('✅ Email de test envoyé avec succès via Brevo');
      
      return {
        success: true,
        message: 'Email de test envoyé avec succès via Brevo',
        to: testTo,
        subject: testSubject,
        provider: 'Brevo (smtp-relay.brevo.com)'
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors du test email Brevo: ${error.message}`, error.stack);
      
      return {
        success: false,
        message: error.message,
        error: error.stack,
        provider: 'Brevo'
      };
    }
  }

  @Post('test-smtp-connection')
  async testSmtpConnection() {
    try {
      this.logger.log('=== TEST DE CONNEXION SMTP BREVO ===');
      
      const mailHost = this.configService.get<string>('MAIL_HOST');
      const mailPort = this.configService.get<string>('MAIL_PORT');
      const mailUser = this.configService.get<string>('MAIL_USERNAME');
      const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
      
      this.logger.log(`Configuration SMTP: ${mailHost}:${mailPort}`);
      this.logger.log(`Utilisateur: ${mailUser}`);
      this.logger.log(`From: ${mailFrom}`);
      
      return {
        success: true,
        message: 'Configuration SMTP Brevo détectée',
        config: {
          host: mailHost,
          port: mailPort,
          user: mailUser,
          from: mailFrom,
          provider: 'Brevo'
        }
      };
    } catch (error) {
      this.logger.error(`Erreur lors du test SMTP: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  @Post('test-email-simple')
  async testEmailSimple() {
    try {
      console.log('📧 Test envoi email simple...');
      
      const username = this.configService.get('MAIL_USERNAME');
      if (!username) {
        return {
          success: false,
          message: 'MAIL_USERNAME non configuré'
        };
      }
      
      return {
        success: true,
        message: 'Utilisez plutôt /debug/test-email-brevo pour tester avec Brevo',
        note: 'Endpoint adapté pour Brevo SMTP'
      };
    } catch (error) {
      console.error('❌ Erreur test email simple:', error.message);
      
      return {
        success: false,
        message: error.message,
        stack: error.stack
      };
    }
  }

  @Post('test-otp-full')
  async testOtpFull() {
    try {
      console.log('🔐 Test complet OTP...');
      
      const testEmail = this.configService.get('MAIL_USERNAME');
      if (!testEmail) {
        return {
          success: false,
          message: 'MAIL_USERNAME non configuré'
        };
      }
      
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      return {
        success: true,
        message: 'Test OTP disponible via endpoint /auth/send-otp',
        note: 'Utiliser /auth/send-otp pour tester l\'envoi d\'OTP complet',
        testEmail,
        testCode
      };
    } catch (error) {
      console.error('❌ Erreur test OTP:', error.message);
      
      return {
        success: false,
        message: error.message,
        stack: error.stack
      };
    }
  }
}
