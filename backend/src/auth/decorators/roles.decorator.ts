import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'ORGANIZADOR' | 'STAFF_PORTA'>) => SetMetadata(ROLES_KEY, roles);
