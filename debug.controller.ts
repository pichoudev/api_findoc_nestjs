import { Controller, Get, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './src/auth/otp.service';

@Controller('debug')
export class DebugController {
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

  @Post('test-smtp-connection')
  async testSmtpConnection() {
    try {
      console.log('🔍 Test de connexion SMTP...');
      
      // Test de vérification de la connexion
      const verifyResult = await this.otpService.verifyConnection();
      console.log('✅ Connexion SMTP vérifiée:', verifyResult);
      
      return { 
        success: true, 
        message: 'Connexion SMTP réussie',
        verified: verifyResult
      };
    } catch (error) {
      console.error('❌ Erreur connexion SMTP:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      
      return { 
        success: false, 
        message: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack
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
      
      const result = await this.otpService.sendSimpleEmail(
        username, // Envoyer à soi-même
        '🧪 Test SMTP - Cleaner App',
        'Ceci est un test de configuration SMTP.'
      );
      
      console.log('✅ Email simple envoyé:', result.messageId);
      
      return {
        success: true,
        message: 'Email de test envoyé avec succès',
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error('❌ Erreur envoi email simple:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      
      return {
        success: false,
        message: error.message,
        code: error.code,
        command: error.command,
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
      
      const testCode = '123456';
      
      // Test avec timeout plus long pour le diagnostic
      await this.otpService.sendOtpEmail(testEmail, testCode);
      
      console.log('✅ Test OTP complet réussi');
      
      return {
        success: true,
        message: 'Test OTP complet réussi',
        email: testEmail,
        code: testCode
      };
    } catch (error) {
      console.error('❌ Erreur test OTP complet:', {
        message: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        message: error.message,
        stack: error.stack
      };
    }
  }

  @Get('check-gmail-settings')
  checkGmailSettings() {
    const username = this.configService.get('MAIL_USERNAME');
    
    return {
      recommendations: [
        '1. Vérifiez que vous utilisez un "App Password" Gmail (16 caractères)',
        '2. Activez "Less secure app access" OU utilisez 2FA + App Password',
        '3. Vérifiez que le compte Gmail n\'a pas de restrictions',
        '4. Assurez-vous que MAIL_FROM_ADDRESS est valide',
        '5. Testez avec un autre fournisseur SMTP si nécessaire'
      ],
      currentConfig: {
        username: username,
        isGmail: username?.includes('@gmail.com'),
        appPasswordLength: this.configService.get('MAIL_PASSWORD')?.length
      }
    };
  }
}
