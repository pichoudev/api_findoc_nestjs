const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserOneSignal() {
  try {
    const userId = 'e487b5cc-1df4-4650-a1f7-a799859be221';
    
    console.log('🔍 Vérification de l\'utilisateur:', userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        fcmToken: true,
        oneSignalAppId: true,
        createdAt: true,
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:');
    console.log('- Email:', user.email);
    console.log('- Nom:', user.firstName, user.lastName);
    console.log('- Rôle:', user.role);
    console.log('- Actif:', user.isActive);
    console.log('- FCM Token:', user.fcmToken ? '✅ Présent' : '❌ Absent');
    console.log('- OneSignal App ID:', user.oneSignalAppId ? '✅ Présent' : '❌ Absent');
    
    if (user.oneSignalAppId) {
      console.log('- App ID Value:', user.oneSignalAppId);
    }
    
    // Vérifier tous les utilisateurs avec des App ID
    const usersWithAppId = await prisma.user.findMany({
      where: {
        oneSignalAppId: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        oneSignalAppId: true,
        role: true
      }
    });
    
    console.log('\n📱 Utilisateurs avec OneSignal App ID:', usersWithAppId.length);
    usersWithAppId.forEach(user => {
      console.log(`- ${user.email} (${user.role}): ${user.oneSignalAppId}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserOneSignal();
