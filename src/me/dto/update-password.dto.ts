import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel de l\'utilisateur',
    example: 'OldPassword123!'
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  ancien_mot_de_passe: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial'
  })
  nouveau_mot_de_passe: string;
}
