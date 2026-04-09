export enum NotificationEventType {
  // Report events
  REPORT_CREATED = 'REPORT_CREATED',
  REPORT_ASSIGNED = 'REPORT_ASSIGNED',
  REPORT_STATUS_CHANGED = 'REPORT_STATUS_CHANGED',
  REPORT_COMPLETED = 'REPORT_COMPLETED',
  REPORT_CANCELLED = 'REPORT_CANCELLED',
  
  // Intervention events
  INTERVENTION_ASSIGNED = 'INTERVENTION_ASSIGNED',
  INTERVENTION_STARTED = 'INTERVENTION_STARTED',
  INTERVENTION_COMPLETED = 'INTERVENTION_COMPLETED',
  
  // User events
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  USER_EMAIL_VERIFIED = 'USER_EMAIL_VERIFIED',
  
  // System events
  CRITICAL_ZONE_ALERT = 'CRITICAL_ZONE_ALERT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  WELCOME_MESSAGE = 'WELCOME_MESSAGE',
}

export interface NotificationEvent {
  type: NotificationEventType;
  userId?: string;
  data: any;
  timestamp: Date;
}

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}

export interface NotificationTemplate {
  type: NotificationEventType;
  title: string;
  body: string;
  getRecipients: (data: any) => string[];
  getEntityInfo: (data: any) => { entityType?: string; entityId?: string };
}
