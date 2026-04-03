import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

import sharp from 'sharp';
sharp.cache(false);
sharp.concurrency(1);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule ,{
    bufferLogs: true
  });

  // Validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: process.env.NODE_ENV === 'production', // Plus flexible en développement
    transform: true,
  }));

  // Servir les fichiers statiques (uploads depuis la racine du projet)
  app.useStaticAssets(join(__dirname, '..', 'uploads/compressed'), {
    prefix: '/uploads',
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Cleaner App API')
    .setDescription('API pour l\'application Cleaner App - Gestion des déchets à Douala')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // CORS
  app.enableCors();

  // Préfixe global pour toutes les routes
  app.setGlobalPrefix('api/v1');
 
  await app.listen(process.env.PORT ?? 3000,'0.0.0.0');
  
 
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API endpoints available at: ${await app.getUrl()}/api/v1/`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
}
bootstrap();
