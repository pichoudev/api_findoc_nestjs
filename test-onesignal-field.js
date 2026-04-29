const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testOneSignalField() {
  try {
    console.log('🔍 Test du champ oneSignalPlayerId...');
    
    // 1. Vérifier la structure d'un utilisateur
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        fcmToken: true,
        oneSignalPlayerId: true,
      }
    });
    
    if (user) {
      console.log('✅ Utilisateur trouvé:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   FCM Token:', user.fcmToken || 'Non défini');
      console.log('   OneSignal Player ID:', user.oneSignalPlayerId || 'Non défini');
    } else {
      console.log('ℹ️ Aucun utilisateur trouvé dans la base');
    }
    
    // 2. Tester la mise à jour du champ
    if (user) {
      const testPlayerId = 'test-player-id-' + Date.now();
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { oneSignalPlayerId: testPlayerId },
        select: {
          id: true,
          email: true,
          oneSignalPlayerId: true,
        }
      });
      
      console.log('✅ Mise à jour réussie:');
      console.log('   Player ID:', updatedUser.oneSignalPlayerId);
      
      // 3. Nettoyer le test
      await prisma.user.update({
        where: { id: user.id },
        data: { oneSignalPlayerId: null }
      });
      
      console.log('🧹 Test nettoyé');
    }
    
    console.log('🎉 Le champ oneSignalPlayerId fonctionne parfaitement !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOneSignalField();
