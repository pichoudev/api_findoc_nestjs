import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'IsRequiredIfProprietaire', async: false })
export class IsRequiredIfProprietaire implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const typeUserId = (args.object as any).type_user_id;
    
    // Si proprietaire, pieces_identite est requis
    if (typeUserId === 'proprietaire') {
      return value !== undefined && value !== null && value.trim() !== '';
    }
    
    // Si locataire, pas besoin de validation
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Les pièces d\'identité sont requises pour les propriétaires';
  }
}
