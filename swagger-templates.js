#!/usr/bin/env node

// Script pour mettre à jour Swagger avec des formats de réponses détaillés
const fs = require('fs');
const path = require('path');

// Templates pour les réponses Swagger
const swaggerTemplates = {
  // Template pour les réponses paginées
  paginatedResponse: (entityName, exampleFields) => ({
    status: 200,
    description: `Liste des ${entityName} récupérée avec succès`,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: exampleFields
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 }
          }
        }
      }
    }
  }),

  // Template pour les réponses d'entité unique
  singleResponse: (entityName, exampleFields) => ({
    status: 200,
    description: `${entityName} récupéré avec succès`,
    schema: {
      example: exampleFields
    }
  }),

  // Template pour les réponses de création
  createResponse: (entityName, exampleFields) => ({
    status: 201,
    description: `${entityName} créé avec succès`,
    schema: {
      example: exampleFields
    }
  }),

  // Template pour les réponses d'erreur
  errorResponse: (message, statusCode = 400) => ({
    status: statusCode,
    description: message,
    schema: {
      example: {
        message: message,
        error: statusCode === 400 ? 'Bad Request' : statusCode === 404 ? 'Not Found' : statusCode === 409 ? 'Conflict' : 'Error',
        statusCode: statusCode
      }
    }
  })
};

// Exemples de champs pour chaque entité
const entityExamples = {
  bin: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    refCode: "BAC-001",
    binType: "MENAGER",
    status: "ACTIVE",
    statusReport: "NORMAL",
    capacityM3: 2.5,
    localisation: "POINT(9.7043 4.0483)",
    latitude: 4.0483,
    longitude: 9.7043,
    neighborhoodId: "uuid-quartier-bonaberi",
    isActive: true,
    createdAt: "2026-04-03T06:30:00.000Z",
    updatedAt: "2026-04-03T06:30:00.000Z"
  },
  
  report: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    bacId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "e487b5cc-1df4-4650-a1f7-a799859be221",
    reportType: "PLEIN",
    description: "Le bac déborde depuis 2 jours",
    severity: "HIGH",
    status: "PENDING",
    photoUrl: "https://example.com/photo.jpg",
    createdAt: "2026-04-03T06:30:00.000Z",
    updatedAt: "2026-04-03T06:30:00.000Z"
  },

  intervention: {
    id: "550e8400-e29b-41d4-a716-446655440002",
    reportId: "550e8400-e29b-41d4-a716-446655440001",
    agentId: "e487b5cc-1df4-4650-a1f7-a799859be221",
    status: "PENDING",
    description: "Intervention planifiée",
    estimatedDuration: 30,
    createdAt: "2026-04-03T06:30:00.000Z",
    updatedAt: "2026-04-03T06:30:00.000Z"
  },

  neighborhood: {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Bonaberi",
    cityId: "550e8400-e29b-41d4-a716-446655440004",
    isActive: true,
    createdAt: "2026-04-03T06:30:00.000Z",
    updatedAt: "2026-04-03T06:30:00.000Z"
  },

  city: {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Douala",
    region: "LITTORAL",
    isActive: true,
    createdAt: "2026-04-03T06:30:00.000Z",
    updatedAt: "2026-04-03T06:30:00.000Z"
  },

  notification: {
    id: "550e8400-e29b-41d4-a716-446655440005",
    userId: "e487b5cc-1df4-4650-a1f7-a799859be221",
    type: "REPORT_RECEIVED",
    title: "Nouveau signalement",
    body: "Un nouveau signalement a été créé",
    isRead: false,
    createdAt: "2026-04-03T06:30:00.000Z"
  }
};

console.log('📚 Swagger Response Templates Generator');
console.log('Templates générés pour mettre à jour la documentation Swagger');
console.log('\n🎯 Utilisation:');
console.log('1. Copiez les templates appropriés dans vos controllers');
console.log('2. Adaptez les exemples selon vos DTOs');
console.log('3. Testez avec Swagger UI');

console.log('\n✅ Templates disponibles:');
Object.keys(entityExamples).forEach(entity => {
  console.log(`- ${entity}: ${Object.keys(entityExamples[entity]).length} champs`);
});

console.log('\n📝 Exemple d\'utilisation:');
console.log(`
@ApiResponse(swaggerTemplates.paginatedResponse('bacs', entityExamples.bin))
@ApiResponse(swaggerTemplates.createResponse('bac', entityExamples.bin))
@ApiResponse(swaggerTemplates.errorResponse('Données invalides', 400))
`);
