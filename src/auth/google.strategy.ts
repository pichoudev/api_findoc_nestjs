import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    try {
      console.log(`Tentative de connexion Google avec email: ${profile.emails?.[0]?.value}`);
      
      const { emails, name, photos } = profile;
      
      const user = {
        email: emails?.[0]?.value || '',
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        phone: '', // Sera généré plus tard
        picture: photos?.[0]?.value || '',
        accessToken,
      };

      // Vérifier si l'utilisateur existe déjà
      let existingUser = await this.authService.findByEmail(user.email);
      
      if (!existingUser) {
        console.log(`Création d'un nouvel utilisateur Google: ${user.email}`);
        // Créer un nouvel utilisateur si inexistant
        const newUser = await this.authService.createGoogleUser(user);
        return done(null, newUser);
      }

      console.log(`Utilisateur Google existant connecté: ${user.email}`);
      return done(null, existingUser);
    } catch (error) {
      console.error('Erreur dans la stratégie Google:', error.message);
      return done(error, null);
    }
  }
}
