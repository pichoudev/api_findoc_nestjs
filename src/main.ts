import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Request, Response } from 'express';
import { AppModule } from './app.module';

import sharp from 'sharp';
sharp.cache(false);
sharp.concurrency(1);

async function bootstrap() {
  try {
    console.log('🚀 Starting application...');
    console.log('📦 Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : '***NOT SET***'
    });

    const app = await NestFactory.create<NestExpressApplication>(AppModule ,{
      bufferLogs: true
    });

    console.log('✅ NestJS application created successfully');

    // Validation globale
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: process.env.NODE_ENV === 'production',
      transform: true,
    }));

    console.log('✅ Global validation pipe configured');

    // Servir les fichiers statiques (uploads depuis la racine du projet)
    app.useStaticAssets(join(__dirname, '..', 'uploads/compressed'), {
      prefix: '/uploads',
    });

    console.log('✅ Static assets configured');

    // Configuration Swagger
    const config = new DocumentBuilder()
      .setTitle('Cleaner App API')
      .setDescription('API pour l\'application Cleaner App - Gestion des déchets à Douala')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    console.log('✅ Swagger documentation configured');

    // CORS
    app.enableCors();
    console.log('✅ CORS enabled');

    // Health check endpoint (avant le préfixe global)
    app.use('/health', (req: Request, res: Response) => {
      console.log('🏥 Health check accessed');
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
    console.log('✅ Health check endpoint configured');

    // Préfixe global pour toutes les routes
    app.setGlobalPrefix('api/v1');
    console.log('✅ Global prefix set to /api/v1');

    const port = process.env.PORT ?? 3000;
    const host = '0.0.0.0';
    
    console.log(`🌐 Starting server on ${host}:${port}...`);
    await app.listen(port, host);
    
    const serverUrl = await app.getUrl();
    console.log(`✅ Application is running on: ${serverUrl}`);
    console.log(`📚 API endpoints available at: ${serverUrl}/api/v1/`);
    console.log(`📖 Swagger documentation available at: ${serverUrl}/api`);
    console.log(`🏥 Health check available at: ${serverUrl}/health`);
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
