import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AccountVerificationService } from './account-verification.service';
import { PasswordResetService } from './password-reset.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DebugController } from '../../debug.controller';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
        const expiresIn = configService.get<string>('JWT_EXPIRATION') || '24h';
        return {
          secret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, DebugController],
  providers: [
    AuthService, 
    OtpService, 
    AccountVerificationService,
    PasswordResetService,
    JwtStrategy, 
    GoogleStrategy, 
    JwtAuthGuard
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
