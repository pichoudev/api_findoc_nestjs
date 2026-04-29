import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private fcm: admin.messaging.Messaging;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialiser Firebase Admin SDK
      const serviceAccount = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.fcm = admin.messaging();
      this.logger.log('✅ Firebase Admin SDK initialisé avec succès');
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
    }
  }

  /**
   * Envoyer une notification push à un utilisateur spécifique
   */
  async sendNotificationToUser(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
  ) {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
          imageUrl,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.fcm.send(message);
      this.logger.log(`✅ Notification envoyée avec succès: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi de la notification:`, error);
      
      // Gérer les erreurs spécifiques
      if (error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'Token invalide ou expiré', errorCode: error.code };
      } else if (error.code === 'messaging/invalid-argument') {
        return { success: false, error: 'Argument invalide', errorCode: error.code };
      }
      
      return { success: false, error: error.message, errorCode: error.code };
    }
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  async sendNotificationToMultipleUsers(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
  ) {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
          imageUrl,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.fcm.sendEachForMulticast(message);
      
      this.logger.log(`📊 Résultat envoi multiple: ${response.successCount} succès, ${response.failureCount} échecs`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi multiple:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoyer une notification à un topic (tous les utilisateurs abonnés)
   */
  async sendNotificationToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
  ) {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
          imageUrl,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.fcm.send(message);
      this.logger.log(`✅ Notification topic envoyée: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi au topic:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * S'abonner un token à un topic
   */
  async subscribeToTopic(token: string, topic: string) {
    try {
      const response = await this.fcm.subscribeToTopic(token, topic);
      this.logger.log(`✅ Token abonné au topic ${topic}: ${response.successCount} succès`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      this.logger.error(`❌ Erreur abonnement topic:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Se désabonner d'un topic
   */
  async unsubscribeFromTopic(token: string, topic: string) {
    try {
      const response = await this.fcm.unsubscribeFromTopic(token, topic);
      this.logger.log(`✅ Token désabonné du topic ${topic}: ${response.successCount} succès`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      this.logger.error(`❌ Erreur désabonnement topic:`, error);
      return { success: false, error: error.message };
    }
  }
}
