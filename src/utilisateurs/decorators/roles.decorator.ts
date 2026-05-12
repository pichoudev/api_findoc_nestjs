import { SetMetadata } from '@nestjs/common';
import { Type_utilisateur } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Type_utilisateur[]) => SetMetadata(ROLES_KEY, roles);
