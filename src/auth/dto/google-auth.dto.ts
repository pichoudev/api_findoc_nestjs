import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthResponseDto {
  @ApiProperty({ description: 'Token d\'accès JWT' })
  access_token: string;

  @ApiProperty({ description: 'Token de rafraîchissement' })
  refresh_token: string;

  @ApiProperty({ description: 'Informations de l\'utilisateur' })
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    type_user_id: string;
    photo_profil?: string;
    est_verifie: boolean;
  };
}

export class GoogleUserInfoDto {
  @ApiProperty({ description: 'Email de l\'utilisateur' })
  email: string;

  @ApiProperty({ description: 'Prénom de l\'utilisateur' })
  firstName: string;

  @ApiProperty({ description: 'Nom de l\'utilisateur' })
  lastName: string;

  @ApiProperty({ description: 'URL de la photo de profil' })
  picture: string;

  @ApiProperty({ description: 'Token d\'accès Google' })
  accessToken: string;
}
