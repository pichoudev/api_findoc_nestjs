#!/usr/bin/env node

// Script pour diagnostiquer l'expiration des tokens JWT
require('dotenv').config();
const { JwtService } = require('@nestjs/jwt');

console.log('🔍 DIAGNOSTIC TOKEN JWT EXPIRATION\n');

// Configuration
const jwtService = new JwtService({
  secret: process.env.JWT_SECRET || 'default-secret',
  signOptions: { expiresIn: process.env.JWT_EXPIRATION || '24h' }
});

console.log('📋 CONFIGURATION:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configuré' : '❌ Non configuré');
console.log('JWT_EXPIRATION:', process.env.JWT_EXPIRATION || '24h (par défaut)');

// Simulation de login comme dans AuthService
const mockUser = {
  id: 'test-user-uuid',
  email: 'test@example.com',
  phone: '+237123456789',
  role: 'CITIZEN'
};

const payload = { 
  sub: mockUser.id, 
  email: mockUser.email, 
  phone: mockUser.phone,
  role: mockUser.role 
};

console.log('\n👤 UTILISATEUR TEST:');
console.log('ID:', mockUser.id);
console.log('Email:', mockUser.email);
console.log('Rôle:', mockUser.role);

// Génération du token
const token = jwtService.sign(payload);
const decoded = jwtService.decode(token);

console.log('\n🎫 TOKEN GÉNÉRÉ:');
console.log('Token:', token.substring(0, 50) + '...');

console.log('\n⏰ DÉTAILS D\'EXPIRATION:');
console.log('Émis (iat):', new Date(decoded.iat * 1000).toISOString());
console.log('Expire (exp):', new Date(decoded.exp * 1000).toISOString());
console.log('Temps actuel:', new Date().toISOString());

const now = Math.floor(Date.now() / 1000);
const timeUntilExpiry = decoded.exp - now;
const hoursUntilExpiry = timeUntilExpiry / 3600;
const daysUntilExpiry = hoursUntilExpiry / 24;

console.log('\n⏱️ TEMPS RESTANT:');
console.log('Secondes:', timeUntilExpiry);
console.log('Heures:', hoursUntilExpiry.toFixed(2));
console.log('Jours:', daysUntilExpiry.toFixed(2));

// Test de validation
console.log('\n🔐 TEST DE VALIDATION:');
try {
  const isValid = jwtService.verify(token);
  console.log('✅ Token valide:', isValid ? 'Oui' : 'Non');
} catch (error) {
  console.log('❌ Erreur de validation:', error.message);
}

// Simulation d'expiration dans 2 heures (votre problème)
console.log('\n🧪 SIMULATION EXPIRATION 2H:');
const jwtService2h = new JwtService({
  secret: process.env.JWT_SECRET || 'default-secret',
  signOptions: { expiresIn: '2h' }
});

const token2h = jwtService2h.sign(payload);
const decoded2h = jwtService2h.decode(token2h);

console.log('Token 2h:', token2h.substring(0, 50) + '...');
console.log('Expire dans 2h:', new Date(decoded2h.exp * 1000).toISOString());

console.log('\n🔍 ANALYSE:');
if (daysUntilExpiry >= 20) {
  console.log('✅ La configuration est correcte (21 jours)');
  console.log('🔍 Le problème vient probablement:');
  console.log('   - Du côté client (stockage/rafraîchissement)');
  console.log('   - D\'un middleware qui invalide le token');
  console.log('   - D\'une configuration différente en production');
} else if (hoursUntilExpiry <= 2) {
  console.log('❌ Le token expire effectivement rapidement (≤ 2h)');
  console.log('🔍 Vérifiez la variable JWT_EXPIRATION');
} else {
  console.log('⚠️ Configuration anormale');
}

console.log('\n💡 RECOMMANDATIONS:');
console.log('1. Vérifiez que le .env est bien chargé au démarrage');
console.log('2. Ajoutez des logs dans AuthService.login() pour voir la configuration réelle');
console.log('3. Vérifiez côté client comment le token est stocké et utilisé');
console.log('4. Testez avec Postman/Insomnia pour isoler le problème');
