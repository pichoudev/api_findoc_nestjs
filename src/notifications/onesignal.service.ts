import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID') || '';
    this.apiKey = this.configService.get<string>('ONESIGNAL_API_KEY') || '';
    
    if (!this.appId || !this.apiKey) {
      this.logger.warn('⚠️ Configuration OneSignal manquante');
    }
    
  }

  /**
   * Envoyer une notification push via OneSignal
   */
  async sendNotification({
    title,
    message,
    data,
    segments,
    includePlayerIds,
    imageUrl,
    url,
    buttons,
  }: {
    title: string;
    message: string;
    data?: Record<string, any>;
    segments?: string[];
    includePlayerIds?: string[];
    imageUrl?: string;
    url?: string;
    buttons?: Array<{
      id: string;
      text: string;
      icon?: string;
      url?: string;
    }>;
  }) {
    try {

      const payload: any = {
        app_id: this.appId,
        contents: {
          en: message,
          fr: message,
        },
        headings: {
          en: title,
          fr: title,
        },
        data: data || {},
      };

      // Ajouter l'image si fournie
      if (imageUrl) {
        payload.big_picture = imageUrl;
        payload.ios_attachments = {
          id1: imageUrl,
        };
      }

      // Ajouter l'URL de redirection
      if (url) {
        payload.url = url;
      }

      // Ajouter les boutons
      if (buttons && buttons.length > 0) {
        payload.buttons = buttons.map(button => ({
          id: button.id,
          text: button.text,
          icon: button.icon,
          url: button.url,
        }));
      }

      // Ciblage par segments ou IDs spécifiques
      if (segments && segments.length > 0) {
        payload.included_segments = segments;
      } else if (includePlayerIds && includePlayerIds.length > 0) {
        payload.include_player_ids = includePlayerIds;
      } else {
        // Envoyer à tous les utilisateurs
        payload.included_segments = ['All'];
      }

      const response = await this.httpService.post(
        'https://onesignal.com/api/v1/notifications',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.apiKey}`,
            'Accept': 'application/json',
          },
        }
      ).toPromise();

      const result = response?.data;
      
      this.logger.log(`✅ Notification OneSignal envoyée: ${result.id}`);
      
      return {
        success: true,
        notificationId: result.id,
        recipients: result.recipients,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi OneSignal:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async sendNotificationToUser(
    playerId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    imageUrl?: string,
    url?: string,
  ) {
    return this.sendNotification({
      title,
      message,
      data,
      includePlayerIds: [playerId],
      imageUrl,
      url,
    });
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  async sendNotificationToMultipleUsers(
    playerIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>,
    imageUrl?: string,
    url?: string,
  ) {
    return this.sendNotification({
      title,
      message,
      data,
      includePlayerIds: playerIds,
      imageUrl,
      url,
    });
  }

  /**
   * Envoyer une notification à un segment d'utilisateurs
   */
  async sendNotificationToSegment(
    segment: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    imageUrl?: string,
    url?: string,
  ) {
    return this.sendNotification({
      title,
      message,
      data,
      segments: [segment],
      imageUrl,
      url,
    });
  }

  /**
   * Envoyer une notification à tous les utilisateurs
   */
  async sendNotificationToAll(
    title: string,
    message: string,
    data?: Record<string, any>,
    imageUrl?: string,
    url?: string,
  ) {
    return this.sendNotification({
      title,
      message,
      data,
      segments: ['All'],
      imageUrl,
      url,
    });
  }

  /**
   * Créer un segment personnalisé
   */
  async createSegment(
    name: string,
    filters: Array<{
      field: string;
      operator: string;
      value: string | number;
    }>,
  ) {
    try {
      const payload = {
        app_id: this.appId,
        name,
        filters,
      };

      const response = await this.httpService.post(
        'https://onesignal.com/api/v1/segments',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
          },
        }
      ).toPromise();

      const result = response?.data;
      
      this.logger.log(`✅ Segment OneSignal créé: ${result.id}`);
      
      return {
        success: true,
        segmentId: result.id,
        name: result.name,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur création segment OneSignal:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Obtenir les informations d'un appareil
   */
  async getDevice(playerId: string) {
    try {
      const response = await this.httpService.get(
        `https://onesignal.com/api/v1/players/${playerId}?app_id=${this.appId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
          },
        }
      ).toPromise();

      return {
        success: true,
        device: response?.data,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur récupération appareil OneSignal:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Vérifie si un appareil OneSignal est actif
   */
  async getDeviceStatus(playerId: string) {
    try {
      this.logger.log(`🔍 Vérification de l'appareil: ${playerId}`);

      // Essayer deux endpoints différents
      let response;
      
      try {
        // Endpoint 1: /players/{playerId}
        response = await this.httpService.get(
          `https://onesignal.com/api/v1/players/${playerId}?app_id=${this.appId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${this.apiKey}`,
              'Accept': 'application/json',
            },
          }
        ).toPromise();
      } catch (error1) {
        this.logger.warn(`⚠️ Endpoint /players échoué, essai /devices...`);
        
        // Endpoint 2: /devices/{playerId}
        response = await this.httpService.get(
          `https://onesignal.com/api/v1/devices/${playerId}?app_id=${this.appId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${this.apiKey}`,
              'Accept': 'application/json',
            },
          }
        ).toPromise();
      }

      return {
        success: true,
        data: response?.data,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur vérification appareil OneSignal:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Récupère tous les appareils OneSignal
   */
  async getAllDevices() {
    try {
      this.logger.log(`📱 Récupération de tous les appareils OneSignal`);

      const response = await this.httpService.get(
        `https://onesignal.com/api/v1/players?app_id=${this.appId}&limit=300`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${this.apiKey}`,
            'Accept': 'application/json',
          },
        }
      ).toPromise();

      return {
        success: true,
        data: response?.data,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur récupération appareils OneSignal:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
