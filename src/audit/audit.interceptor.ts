import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const timestamp = new Date();

    // Extraire l'utilisateur si authentifié
    const user = (request as any).user;
    const userId = user?.userId || null;
    const userRole = user?.role || null;

    return next.handle().pipe(
      tap({
        next: async (response) => {
          // Enregistrer l'audit après la réussite de la requête
          await this.logAudit({
            timestamp,
            method,
            route: url,
            ip: ip || '',
            userAgent,
            userId,
            userRole,
            action: this.extractAction(method, url),
            resource: this.extractResource(url),
            status: 'SUCCESS',
            statusCode: response?.statusCode || 200,
            details: {
              responseTime: Date.now() - timestamp.getTime(),
              dataSize: JSON.stringify(response).length
            }
          });
        },
        error: async (error) => {
          // Enregistrer l'audit en cas d'erreur
          await this.logAudit({
            timestamp,
            method,
            route: url,
            ip: ip || '',
            userAgent,
            userId,
            userRole,
            action: this.extractAction(method, url),
            resource: this.extractResource(url),
            status: 'ERROR',
            statusCode: error?.status || 500,
            details: {
              responseTime: Date.now() - timestamp.getTime(),
              errorMessage: error?.message || 'Unknown error',
              errorStack: error?.stack
            }
          });
        }
      })
    );
  }

  private async logAudit(auditData: {
    timestamp: Date;
    method: string;
    route: string;
    ip: string;
    userAgent: string;
    userId: string | null;
    userRole: string | null;
    action: string;
    resource: string;
    status: string;
    statusCode: number;
    details: any;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: auditData.action,
          entityType: auditData.resource,
          userId: auditData.userId,
          payload: {
            method: auditData.method,
            route: auditData.route,
            statusCode: auditData.statusCode,
            status: auditData.status,
            responseTime: auditData.details?.responseTime,
            dataSize: auditData.details?.dataSize
          },
          ipAddress: auditData.ip,
          userAgent: auditData.userAgent
        }
      });
    } catch (error) {
      // Éviter que l'audit lui-même ne casse l'application
      console.error('Failed to log audit:', error);
    }
  }

  private extractAction(method: string, url: string): string {
    const path = url.split('?')[0]; // Ignorer les query params
    const segments = path.split('/').filter(s => s);
    
    if (segments.length === 0) return method;
    
    const resource = segments[0];
    const id = segments[1];
    
    // Mapper les actions basées sur la méthode HTTP et le pattern de l'URL
    if (id && (method === 'GET' || method === 'DELETE')) {
      return `${method}_${resource}_BY_ID`;
    }
    
    switch (method) {
      case 'GET':
        return segments.length === 1 ? `GET_${resource.toUpperCase()}` : `GET_${resource.toUpperCase()}_LIST`;
      case 'POST':
        return `CREATE_${resource.toUpperCase()}`;
      case 'PATCH':
      case 'PUT':
        return `UPDATE_${resource.toUpperCase()}`;
      case 'DELETE':
        return `DELETE_${resource.toUpperCase()}`;
      default:
        return `${method}_${resource.toUpperCase()}`;
    }
  }

  private extractResource(url: string): string {
    const path = url.split('?')[0]; // Ignorer les query params
    const segments = path.split('/').filter(s => s);
    return segments[0] || 'UNKNOWN';
  }
}
