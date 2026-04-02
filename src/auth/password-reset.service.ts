import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationEventType } from '../notifications/types/notification.types';

@Injectable()
export class PasswordResetService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {
    // Configuration SMTP pour l'envoi d'emails de réinitialisation
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = parseInt(this.configService.get<string>('MAIL_PORT') || '587');
    const mailUser = this.configService.get<string>('MAIL_USERNAME');
    const mailPass = this.configService.get<string>('MAIL_PASSWORD');
    const mailFrom = this.configService.get<string>('MAIL_FROM_ADDRESS');
    const mailFromName = this.configService.get<string>('MAIL_FROM_NAME');

    if (!mailHost || !mailUser || !mailPass || !mailFrom) {
      this.logger.error('Configuration SMTP manquante pour PasswordResetService');
      throw new Error('Configuration SMTP requise pour PasswordResetService');
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

    this.logger.log(`PasswordResetService initialisé avec SMTP: ${mailHost}:${mailPort}`);
  }

  async sendPasswordResetCode(emailOrPhone: string, code: string, method: 'EMAIL' | 'SMS'): Promise<void> {
    try {
      this.logger.log(`Envoi code reset password pour ${emailOrPhone} avec code: ${code}, méthode: ${method}`);
      
      if (method === 'EMAIL') {
        await this.sendEmailResetCode(emailOrPhone, code);
      } else {
        await this.sendSmsResetCode(emailOrPhone, code);
      }

      // Sauvegarder le token dans la base de données
      await this.saveResetToken(emailOrPhone, code, 'PASSWORD_RESET');
      
      this.logger.log(`Code reset password envoyé avec succès pour ${emailOrPhone}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi du code de réinitialisation pour ${emailOrPhone}:`, error);
      throw error;
    }
  }

private async sendEmailResetCode(email: string, code: string): Promise<void> {
  const mailFrom     = this.configService.get<string>('MAIL_FROM_ADDRESS');
  const mailFromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Cleaner Cameroun';

  const digits = code.split('').map(d => `
    <td style="padding:0 4px">
      <div style="width:44px;height:52px;background:#ffffff;border-radius:8px;
        border:1px solid #5DCAA5;font-size:28px;font-weight:700;
        color:#085041;font-family:monospace;text-align:center;line-height:52px">
        ${d}
      </div>
    </td>
  `).join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Réinitialisation — Cleaner Cameroun</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif">

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:32px 16px">

    <table width="480" cellpadding="0" cellspacing="0" border="0"
      style="background:#ffffff;border-radius:16px;overflow:hidden;
             border:1px solid #e0e0da;max-width:480px;width:100%">

      <!-- HEADER -->
      <tr>
        <td style="background:#085041;padding:32px 24px;text-align:center">
          <div style="width:56px;height:56px;background:#1D9E75;border-radius:50%;
                      margin:0 auto 16px;line-height:56px;font-size:26px;text-align:center">
            🔒
          </div>
          <p style="margin:0;font-size:20px;font-weight:700;color:#E1F5EE;
                    font-family:Arial,sans-serif">
            Cleaner Cameroun
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:#5DCAA5;
                    font-family:Arial,sans-serif">
            Réinitialisation de mot de passe
          </p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:32px 24px">

          <p style="margin:0 0 12px;font-size:14px;color:#666;
                    font-family:Arial,sans-serif">Bonjour,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#1a1a1a;line-height:1.6;
                    font-family:Arial,sans-serif">
            Vous avez demandé la réinitialisation de votre mot de passe sur
            <strong style="color:#0F6E56">Cleaner Cameroun</strong>.
            Utilisez le code ci-dessous pour continuer.
          </p>

          <!-- CODE BOX -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#E1F5EE;border-radius:12px;border:1px solid #9FE1CB;
                   margin-bottom:20px">
            <tr>
              <td style="padding:24px;text-align:center">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;
                          letter-spacing:0.08em;color:#0F6E56;
                          font-family:Arial,sans-serif;text-transform:uppercase">
                  Code de sécurité
                </p>
                <table cellpadding="0" cellspacing="0" border="0"
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
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#FAEEDA;border-radius:8px;border:1px solid #FAC775;
                   margin-bottom:20px">
            <tr>
              <td style="padding:14px 16px;font-size:12px;color:#633806;
                         line-height:1.6;font-family:Arial,sans-serif">
                &#9888;&#65039; Si vous n'avez pas demandé cette réinitialisation,
                ignorez cet email et sécurisez votre compte immédiatement.
              </td>
            </tr>
          </table>

          <!-- SECURITY TIPS -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="border:1px solid #e0e0da;border-radius:8px">
            <tr>
              <td style="padding:14px 16px">
                <p style="margin:0 0 10px;font-size:12px;font-weight:700;
                          color:#1a1a1a;font-family:Arial,sans-serif">
                  Rappels de sécurité
                </p>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="12" valign="top" style="padding-top:2px">
                      <div style="width:6px;height:6px;border-radius:50%;
                                  background:#1D9E75;margin-top:3px"></div>
                    </td>
                    <td style="font-size:12px;color:#555;font-family:Arial,sans-serif;
                               padding-bottom:6px;padding-left:6px">
                      Ne partagez jamais ce code avec qui que ce soit
                    </td>
                  </tr>
                  <tr>
                    <td width="12" valign="top" style="padding-top:2px">
                      <div style="width:6px;height:6px;border-radius:50%;
                                  background:#1D9E75;margin-top:3px"></div>
                    </td>
                    <td style="font-size:12px;color:#555;font-family:Arial,sans-serif;
                               padding-bottom:6px;padding-left:6px">
                      Les employés Cleaner ne vous demanderont jamais ce code
                    </td>
                  </tr>
                  <tr>
                    <td width="12" valign="top">
                      <div style="width:6px;height:6px;border-radius:50%;
                                  background:#1D9E75;margin-top:3px"></div>
                    </td>
                    <td style="font-size:12px;color:#555;font-family:Arial,sans-serif;
                               padding-left:6px">
                      Ce code ne peut être utilisé qu'une seule fois
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="border-top:1px solid #eeede8;padding:16px 24px;text-align:center">
          <p style="margin:0;font-size:11px;color:#999;font-family:Arial,sans-serif">
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
    subject: 'Code de réinitialisation — Cleaner Cameroun',
    html:    htmlContent,
  });
}

  private async sendSmsResetCode(phone: string, code: string): Promise<void> {
    // Intégration avec un service SMS (Orange MTN, etc.)
    this.logger.log(`Simulation d'envoi SMS au ${phone}: Votre code de réinitialisation Cleaner est ${code}. Valide 10 min.`);
    
    // TODO: Intégrer avec un vrai service SMS
    // Exemple:
    // await this.smsService.send({
    //   to: phone,
    //   message: `Cleaner: Code de réinitialisation mot de passe: ${code}. Valide 10 min. Ne partagez pas.`
    // });
  }

  private async saveResetToken(emailOrPhone: string, code: string, purpose: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire dans 10 minutes

    this.logger.log(`Sauvegarde token pour ${emailOrPhone}, code: ${code}, purpose: ${purpose}, expires: ${expiresAt}`);

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
      this.logger.error(`Utilisateur non trouvé pour la sauvegarde du token: ${emailOrPhone}`);
      throw new Error('Utilisateur non trouvé');
    }

    this.logger.log(`Utilisateur trouvé pour token: ${user.id}`);

    // Supprimer les anciens tokens pour cet utilisateur/purpose
    const deleteResult = await this.prisma.otpToken.deleteMany({
      where: {
        userId: user.id,
        purpose,
      },
    });

    this.logger.log(`Anciens tokens supprimés: ${deleteResult.count}`);

    // Créer le nouveau token
    const newToken = await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        code,
        purpose,
        expiresAt,
      },
    });

    this.logger.log(`Nouveau token créé: ${newToken.id} pour user ${user.id}`);
  }

  async verifyResetCode(emailOrPhone: string, code: string): Promise<boolean> {
    try {
      this.logger.log(`Début vérification code reset pour ${emailOrPhone} avec code: ${code}`);
      
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
        this.logger.warn(`Utilisateur non trouvé pour ${emailOrPhone}`);
        return false;
      }

      this.logger.log(`Utilisateur trouvé: ${user.id}`);

      const token = await this.prisma.otpToken.findFirst({
        where: {
          userId: user.id,
          code: code,
          purpose: 'PASSWORD_RESET',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!token) {
        this.logger.warn(`Token non trouvé pour user ${user.id}, code ${code}, purpose PASSWORD_RESET`);
        
        // Vérifier si des tokens existent pour cet utilisateur
        const allTokens = await this.prisma.otpToken.findMany({
          where: {
            userId: user.id,
            purpose: 'PASSWORD_RESET',
          },
        });
        
        this.logger.log(`Tokens trouvés pour cet utilisateur: ${allTokens.length}`);
        allTokens.forEach(t => {
          this.logger.log(`Token: ${t.id}, code: ${t.code}, expires: ${t.expiresAt}, attempts: ${t.attemptsCount}`);
        });
        
        return false;
      }

      this.logger.log(`Token trouvé: ${token.id}, attempts: ${token.attemptsCount}`);

      // Vérifier si le nombre de tentatives est dépassé
      if (token.attemptsCount >= 3) {
        // Supprimer le token après 3 tentatives échouées
        await this.prisma.otpToken.delete({
          where: { id: token.id },
        });
        this.logger.warn(`Token de réinitialisation supprimé après 3 tentatives échouées pour ${emailOrPhone}`);
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

      // Le code est correct (déjà vérifié dans la requête), ne pas supprimer le token ici
      // Il sera supprimé dans resetPassword après la mise à jour du mot de passe
      this.logger.log(`Code de réinitialisation vérifié avec succès pour ${emailOrPhone}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du code de réinitialisation pour ${emailOrPhone}:`, error);
      return false;
    }
  }

  async resetPassword(emailOrPhone: string, code: string, newPassword: string): Promise<boolean> {
    try {
      this.logger.log(`Début resetPassword pour ${emailOrPhone} avec code: ${code}`);
      
      // Vérifier d'abord le code
      const isCodeValid = await this.verifyResetCode(emailOrPhone, code);
      this.logger.log(`Résultat verifyResetCode: ${isCodeValid}`);
      
      if (!isCodeValid) {
        this.logger.warn(`Code invalide pour resetPassword: ${emailOrPhone}`);
        return false;
      }

      this.logger.log(`Code valide, recherche utilisateur pour ${emailOrPhone}`);

      // Trouver l'utilisateur
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: emailOrPhone },
            { phone: emailOrPhone },
          ],
        },
      });

      if (!user) {
        this.logger.warn(`Utilisateur non trouvé pour la réinitialisation: ${emailOrPhone}`);
        return false;
      }

      this.logger.log(`Utilisateur trouvé pour reset: ${user.id}`);

      // Hasher le mot de passe avant de le sauvegarder
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      this.logger.log(`Mot de passe hashé pour ${user.id}`);

      // Mettre à jour le mot de passe
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      this.logger.log(`Mot de passe mis à jour pour ${user.id}`);

      // Supprimer le token après utilisation réussie
      await this.prisma.otpToken.deleteMany({
        where: {
          userId: user.id,
          purpose: 'PASSWORD_RESET',
        },
      });

      this.logger.log(`Token supprimé après reset pour ${user.id}`);

      // Envoyer une notification de réinitialisation réussie
      await this.notificationService.createNotification({
        userId: user.id,
        type: NotificationEventType.USER_PASSWORD_RESET,
        title: 'Mot de passe réinitialisé',
        body: 'Votre mot de passe a été réinitialisé avec succès. Si vous n\'êtes pas à l\'origine de cette action, veuillez contacter le support.',
        entityType: 'USER',
        entityId: user.id
      });

      this.logger.log(`Notification envoyée pour ${user.id}`);
      this.logger.log(`Mot de passe réinitialisé avec succès pour l'utilisateur ${emailOrPhone}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de la réinitialisation du mot de passe pour ${emailOrPhone}:`, error);
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
        this.logger.log(`Nettoyage: ${result.count} tokens de réinitialisation expirés supprimés`);
      }
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des tokens de réinitialisation expirés:', error);
    }
  }
}
