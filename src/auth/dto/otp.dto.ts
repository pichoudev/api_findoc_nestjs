import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Email de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Purpose de l\'OTP: VERIFY_EMAIL ou RESET_PASSWORD', enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['VERIFY_EMAIL', 'RESET_PASSWORD'])
  purpose: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email de l\'utilisateur' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Code OTP reçu' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Purpose de l\'OTP: VERIFY_EMAIL ou RESET_PASSWORD', enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['VERIFY_EMAIL', 'RESET_PASSWORD'])
  purpose: string;
}

export class OtpResponseDto {
  @ApiProperty({ description: 'Message de succès' })
  message: string;

  @ApiProperty({ description: 'Indique si l\'OTP est valide' })
  isValid: boolean;
}
