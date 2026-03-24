import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Logger personnalisé pour la production
export class ProductionLogger extends Logger {
  constructor(context?: string) {
    super(context || 'App');
  }

  log(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [LOG] ${context || 'App'}: ${message}`;
    console.log(logMessage);
  }

  error(message: string, trace?: string, context?: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ERROR] ${context || 'App'}: ${message}`;
    if (trace) {
      console.error(`${logMessage}\nStack trace:\n${trace}`);
    } else {
      console.error(logMessage);
    }
  }

  warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [WARN] ${context || 'App'}: ${message}`;
    console.warn(logMessage);
  }

  debug(message: string, context?: string) {
    // En production, n'afficher debug que si DEBUG=true
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [DEBUG] ${context || 'App'}: ${message}`;
      console.debug(logMessage);
    }
  }
}
