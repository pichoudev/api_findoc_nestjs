import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationEventType } from '../notifications/types/notification.types';

@Injectable()
export class AccountVerificationService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(AccountVerificationService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {
    // Configuration SMTP pour l'envoi d'emails de vérification
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = parseInt(this.configService.get<string>('MAIL_PORT') || '587');
    const mailUser = this.configService.get<string>('MAIL_USERNAME');
    const mailPass = this.configService.get<string>('MAIL_PASSWORD');
    const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
    const mailFromName = this.configService.get<string>('MAIL_FROM_NAME');

    if (!mailHost || !mailUser || !mailPass || !mailFrom) {
      this.logger.error('Configuration SMTP manquante pour AccountVerificationService');
      throw new Error('Configuration SMTP requise pour AccountVerificationService');
    }

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });

    this.logger.log(`AccountVerificationService initialisé avec SMTP: ${mailHost}:${mailPort}`);
  }

  async sendVerificationCode(emailOrPhone: string, code: string, method: 'EMAIL' | 'SMS'): Promise<void> {
    try {
      this.logger.log(`Envoi du code de vérification ${code} à ${emailOrPhone} via ${method}`);

      if (method === 'EMAIL') {
        await this.sendEmailVerification(emailOrPhone, code);
      } else {
        await this.sendSmsVerification(emailOrPhone, code);
      }

      // Sauvegarder le token OTP
      await this.saveVerificationToken(emailOrPhone, code, 'VERIFY_EMAIL');

      this.logger.log(`Code de vérification envoyé avec succès à ${emailOrPhone}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi du code de vérification à ${emailOrPhone}:`, error);
      throw new Error(`Échec de l'envoi du code de vérification: ${error.message}`);
    }
  }

private async sendEmailVerification(email: string, code: string): Promise<void> {
  const mailFrom     = this.configService.get<string>('MAIL_FROM_ADDRESS');
  const mailFromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Cleaner Cameroun';

  const digits = code.split('').map(d => `
    <td align="center" valign="middle" style="padding:0 3px">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="middle"
            style="width:44px;height:52px;background:#ffffff;
                   border-radius:8px;border:1px solid #5DCAA5;
                   font-size:28px;font-weight:700;color:#085041;
                   font-family:monospace;text-align:center;
                   line-height:52px">
            ${d}
          </td>
        </tr>
      </table>
    </td>
  `).join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Vérification — Cleaner Cameroun</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:32px 16px">

  <table cellpadding="0" cellspacing="0" border="0"
    style="background:#ffffff;border-radius:16px;overflow:hidden;
           border:1px solid #e0e0da;width:100%;max-width:480px">

    <!-- HEADER -->
    <tr>
      <td align="center" style="background:#085041;padding:32px 24px">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center"
              style="width:56px;height:56px;background:#1D9E75;
                     border-radius:50%;font-size:26px;line-height:56px;
                     text-align:center">
              ♻️
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:20px;font-weight:700;
                  color:#E1F5EE;font-family:Arial,sans-serif">
          Cleaner Cameroun
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#5DCAA5;
                  font-family:Arial,sans-serif">
          Vérification de votre compte
        </p>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style="padding:32px 24px">

        <p style="margin:0 0 12px;font-size:14px;color:#666;
                  font-family:Arial,sans-serif">
          Bonjour,
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#1a1a1a;
                  line-height:1.6;font-family:Arial,sans-serif">
          Merci de vous être inscrit sur
          <strong style="color:#0F6E56">Cleaner Cameroun</strong>.
          Utilisez le code ci-dessous pour activer votre compte.
        </p>

        <!-- CODE BOX -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#E1F5EE;border-radius:12px;
                 border:1px solid #9FE1CB;margin-bottom:24px">
          <tr>
            <td align="center" style="padding:24px">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;
                        letter-spacing:0.08em;color:#0F6E56;
                        text-transform:uppercase;font-family:Arial,sans-serif">
                Votre code de vérification
              </p>
              <table cellpadding="0" cellspacing="0" border="0" align="center"
                style="margin:0 auto">
                <tr>${digits}</tr>
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#0F6E56;
                        font-family:Arial,sans-serif">
                &#9203; Expire dans 10 minutes
              </p>
            </td>
          </tr>
        </table>

        <!-- WARNING -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-left:3px solid #5DCAA5;padding:12px 16px;
                       background:#f9f9f6">
              <p style="margin:0;font-size:12px;color:#666;
                        line-height:1.6;font-family:Arial,sans-serif">
                Si vous n'avez pas demandé cette vérification,
                ignorez cet email en toute sécurité.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td align="center"
        style="border-top:1px solid #eeede8;padding:16px 24px">
        <p style="margin:0;font-size:11px;color:#999;
                  font-family:Arial,sans-serif">
          &copy; 2026 Cleaner Cameroun &mdash; Tous droits réservés
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;

  await this.transporter.sendMail({
    from:    `"${mailFromName}" <${mailFrom}>`,
    to:      email,
    subject: 'Votre code de vérification — Cleaner Cameroun',
    html:    htmlContent,
  });
}

  private async sendSmsVerification(phone: string, code: string): Promise<void> {
    // Intégration avec un service SMS (Orange MTN, etc.)
    // Pour l'instant, nous simulons l'envoi
    this.logger.log(`Simulation d'envoi SMS au ${phone}: Votre code de vérification Cleaner est ${code}`);
    
    // TODO: Intégrer avec un vrai service SMS
    // Exemple:
    // await this.smsService.send({
    //   to: phone,
    //   message: `Votre code de vérification Cleaner est ${code}. Valide 15 min.`
    // });
  }

  private async saveVerificationToken(emailOrPhone: string, code: string, purpose: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire dans 10 minutes

    // Trouver l'utilisateur d'abord
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Supprimer les anciens tokens pour cet utilisateur/purpose
    await this.prisma.otpToken.deleteMany({
      where: {
        userId: user.id,
        purpose,
      },
    });

    // Créer le nouveau token
    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        code,
        purpose,
        expiresAt,
      },
    });
  }

  async verifyCode(emailOrPhone: string, code: string, purpose: string): Promise<boolean> {
    try {
      // Trouver l'utilisateur d'abord
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhone },
            { phone: emailOrPhone },
          ],
        },
      });

      if (!user) {
        return false;
      }

      const token = await this.prisma.otpToken.findFirst({
        where: {
          userId: user.id,
          code: code,
          purpose,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!token) {
        this.logger.warn(`Tentative de vérification échouée pour ${emailOrPhone}: code invalide ou expiré`);
        return false;
      }

      // Vérifier si le nombre de tentatives est dépassé
      if (token.attemptsCount >= 3) {
        // Supprimer le token après 3 tentatives échouées
        await this.prisma.otpToken.delete({
          where: { id: token.id },
        });
        this.logger.warn(`Token supprimé après 3 tentatives échouées pour ${emailOrPhone}`);
        return false;
      }

      // Incrémenter le compteur de tentatives
      await this.prisma.otpToken.update({
        where: { id: token.id },
        data: {
          attemptsCount: {
            increment: 1,
          },
        },
      });

      // Le code est correct (déjà vérifié dans la requête), supprimer le token et envoyer la notification
      await this.prisma.otpToken.delete({
        where: { id: token.id },
      });

      // Envoyer une notification de vérification réussie
      if (purpose === 'VERIFY_EMAIL') {
        await this.notificationService.createNotification({
          userId: user.id,
          type: NotificationEventType.USER_EMAIL_VERIFIED,
          title: 'Compte vérifié',
          body: 'Votre compte a été vérifié avec succès. Vous pouvez maintenant utiliser toutes les fonctionnalités de l\'application.',
          entityType: 'USER',
          entityId: user.id
        });
      }

      this.logger.log(`Vérification réussie pour ${emailOrPhone} avec purpose: ${purpose}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du code pour ${emailOrPhone}:`, error);
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.otpToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Nettoyage: ${result.count} tokens OTP expirés supprimés`);
      }
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des tokens OTP expirés:', error);
    }
  }
}
