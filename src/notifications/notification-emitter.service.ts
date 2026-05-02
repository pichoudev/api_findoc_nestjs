import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';

export interface NotificationCreatedEvent {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationEmitterService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitNotificationCreated(event: NotificationCreatedEvent) {
    this.eventEmitter.emit('notification.created', event);
  }
}
