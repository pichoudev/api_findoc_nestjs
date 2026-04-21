#!/usr/bin/env node

/**
 * Script pour mettre à jour les URLs des QR codes existants
 * Passe de l'URL avec ID à l'URL avec refCode
 */

const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

async function updateQrCodeUrls() {
  try {
    console.log('🔄 Mise à jour des URLs des QR codes...\n');

    // Récupérer tous les bacs qui ont un QR code
    const bins = await prisma.bin.findMany({
      where: {
        qrCode: {
          not: null
        }
      },
      select: {
        id: true,
        refCode: true,
        qrCode: true
      }
    });

    console.log(`📊 ${bins.length} bacs trouvés avec QR code\n`);

    let updatedCount = 0;

    for (const bin of bins) {
      // Générer la nouvelle URL avec refCode
      const newQrUrl = `https://ton-app-frontend.com/scan?code=${bin.refCode}`;
      const newQrCodeDataUrl = await QRCode.toDataURL(newQrUrl);

      // Vérifier si l'URL a changé
      const oldUrlWithId = `https://ton-app-frontend.com/bins/${bin.id}`;
      const oldUrlWithParam = `https://ton-app-frontend.com/scan/${bin.refCode}`;
      const hasOldUrl = bin.qrCode.includes(oldUrlWithId) || bin.qrCode.includes(oldUrlWithParam);

      if (hasOldUrl) {
        // Mettre à jour le QR code
        await prisma.bin.update({
          where: { id: bin.id },
          data: { qrCode: newQrCodeDataUrl }
        });

        console.log(`✅ Mis à jour: ${bin.refCode}`);
        console.log(`   Ancienne URL: ${oldUrlWithId} ou ${oldUrlWithParam}`);
        console.log(`   Nouvelle URL: ${newQrUrl}\n`);
        
        updatedCount++;
      } else {
        console.log(`⏭️  Déjà à jour: ${bin.refCode}`);
        console.log(`   URL actuelle: ${newQrUrl}\n`);
      }
    }

    console.log(`🎉 Mise à jour terminée !`);
    console.log(`📈 ${updatedCount} QR codes mis à jour sur ${bins.length}`);
    console.log(`✅ Tous les QR codes utilisent maintenant le refCode`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour vérifier l'état actuel
async function checkQrStatus() {
  try {
    const totalBins = await prisma.bin.count();
    const binsWithQr = await prisma.bin.count({
      where: { qrCode: { not: null } }
    });

    const bins = await prisma.bin.findMany({
      where: { qrCode: { not: null } },
      select: { id: true, refCode: true, qrCode: true },
      take: 5
    });

    console.log('📊 État actuel des QR codes:');
    console.log(`   Total bacs: ${totalBins}`);
    console.log(`   Avec QR code: ${binsWithQr}`);
    console.log(`   Taux: ${((binsWithQr / totalBins) * 100).toFixed(2)}%\n`);

    console.log('🔍 Exemples de QR codes:');
    bins.forEach(bin => {
      const hasOldUrlWithId = bin.qrCode.includes(`/bins/${bin.id}`);
      const hasOldUrlWithParam = bin.qrCode.includes(`/scan/${bin.refCode}`);
      const hasNewUrl = bin.qrCode.includes(`/scan?code=${bin.refCode}`);
      
      let status = '❓ Inconnu';
      if (hasNewUrl) status = '🟢 Nouveau (query)';
      else if (hasOldUrlWithParam) status = '🟡 Ancien (param)';
      else if (hasOldUrlWithId) status = '🔴 Ancien (ID)';
      
      console.log(`   ${bin.refCode}: ${status}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Menu principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🎯 Usage:');
    console.log('   node update-qr-urls.js update    # Mettre à jour tous les QR codes');
    console.log('   node update-qr-urls.js check     # Vérifier l\'état actuel');
    console.log('   node update-qr-urls.js all       # Vérifier + mettre à jour');
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'check':
      await checkQrStatus();
      break;
    case 'update':
      await updateQrCodeUrls();
      break;
    case 'all':
      await checkQrStatus();
      console.log('\n' + '='.repeat(50) + '\n');
      await updateQrCodeUrls();
      break;
    default:
      console.log('❌ Commande inconnue:', command);
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateQrCodeUrls, checkQrStatus };
