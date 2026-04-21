#!/usr/bin/env node

/**
 * Script pour générer et imprimer des QR codes de bacs en masse
 * Usage: node generate-qr-batch.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = './qr-codes-print';
const TOKEN = 'YOUR_ADMIN_TOKEN'; // Remplacer par votre token admin

// Créer le répertoire de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateQrCodes() {
  try {
    console.log('🚀 Démarrage de la génération des QR codes...\n');

    // 1. Récupérer les statistiques
    console.log('📊 Récupération des statistiques...');
    const statsResponse = await axios.get(`${API_BASE_URL}/qr-codes/stats`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const stats = statsResponse.data.data;
    console.log(`📈 Statistiques:`);
    console.log(`   Total bacs: ${stats.total}`);
    console.log(`   Avec QR code: ${stats.withQrCode}`);
    console.log(`   Sans QR code: ${stats.withoutQrCode}`);
    console.log(`   Taux: ${stats.completionRate}\n`);

    // 2. Générer tous les QR codes
    console.log('🔄 Génération de tous les QR codes...');
    const generateResponse = await axios.post(`${API_BASE_URL}/qr-codes/generate-all`, 
      { outputDir: OUTPUT_DIR },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ ${generateResponse.data.message}`);
    console.log(`📁 Répertoire: ${generateResponse.data.outputDir}`);
    console.log(`⏰ Heure: ${generateResponse.data.timestamp}\n`);

    // 3. Lister les fichiers générés
    console.log('📋 Fichiers QR codes générés:');
    const files = fs.readdirSync(OUTPUT_DIR).filter(file => file.endsWith('.png'));
    
    files.forEach((file, index) => {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    console.log(`\n🎉 ${files.length} QR codes prêts à être imprimés !`);
    
    // 4. Instructions d'impression
    console.log('\n🖨️ Instructions d\'impression:');
    console.log('1. Taille recommandée: 3cm x 3cm');
    console.log('2. Papier: autocollant ou vinyle résistant');
    console.log('3. Qualité: 300 DPI minimum');
    console.log('4. Protection: plastification ou laminage');
    console.log('5. Test: scanner après impression');

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Fonction pour générer un QR code spécifique
async function generateSingleQrCode(binId, refCode) {
  try {
    console.log(`🔄 Génération du QR code pour ${refCode}...`);
    
    const response = await axios.post(`${API_BASE_URL}/qr-codes/generate/${binId}`, 
      { outputDir: OUTPUT_DIR },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ ${response.data.message}`);
    console.log(`📁 Fichier: ${response.data.filePath}`);
    
  } catch (error) {
    console.error(`❌ Erreur pour ${refCode}:`, error.response?.data || error.message);
  }
}

// Menu interactif
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🎯 Usage:');
    console.log('   node generate-qr-batch.js all          # Générer tous les QR codes');
    console.log('   node generate-qr-batch.js <binId>     # Générer un QR code spécifique');
    console.log('   node generate-qr-batch.js stats         # Afficher les statistiques');
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'all':
      await generateQrCodes();
      break;
    case 'stats':
      try {
        const response = await axios.get(`${API_BASE_URL}/qr-codes/stats`, {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        const stats = response.data.data;
        console.log('📊 Statistiques des QR codes:');
        console.log(`   Total: ${stats.total}`);
        console.log(`   Avec QR: ${stats.withQrCode}`);
        console.log(`   Sans QR: ${stats.withoutQrCode}`);
        console.log(`   Taux: ${stats.completionRate}`);
      } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
      }
      break;
    default:
      // Générer un QR code spécifique
      const binId = command;
      const refCode = args[1] || `BAC-${command}`;
      await generateSingleQrCode(binId, refCode);
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateQrCodes, generateSingleQrCode };
