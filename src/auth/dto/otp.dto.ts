import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Email ou téléphone de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiPropertyOptional({ description: 'Purpose de l\'OTP: VERIFY_EMAIL ou RESET_PASSWORD', enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'] })
  @IsString()
  @IsOptional()
  @IsIn(['VERIFY_EMAIL', 'RESET_PASSWORD'])
  purpose?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email ou téléphone de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ description: 'Code OTP reçu' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Purpose de l\'OTP: VERIFY_EMAIL ou RESET_PASSWORD', enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'] })
  @IsString()
  @IsOptional()
  @IsIn(['VERIFY_EMAIL', 'RESET_PASSWORD'])
  purpose?: string;
}

export class OtpResponseDto {
  @ApiProperty({ description: 'Message de succès' })
  message: string;

  @ApiProperty({ description: 'Indique si l\'OTP est valide' })
  isValid: boolean;
}
