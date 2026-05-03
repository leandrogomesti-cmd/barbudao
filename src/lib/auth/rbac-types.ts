import type { Staff } from '@/lib/types/staff';

export type Role = NonNullable<Staff['perfil_acesso']>;

export interface CurrentUser {
  uid: string;
  email: string;
  staffId: string;
  nome: string;
  role: Role;
  unidade_padrao?: string;
}

export class AuthorizationError extends Error {
  constructor(message = 'Acesso negado.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export const ROLE_GROUPS = {
  ADMIN_OR_GERENTE: ['ADMIN', 'GERENTE'] as Role[],
  ADMIN_GERENTE_RECEPCAO: ['ADMIN', 'GERENTE', 'RECEPCAO'] as Role[],
  ALL: ['ADMIN', 'GERENTE', 'PROFISSIONAL', 'RECEPCAO'] as Role[],
};

export const RESTRICTED_PATHS_FOR_PROFISSIONAL = [
  '/finance',
  '/services',
  '/inventory',
  '/staff',
  '/campaigns',
  '/missions',
  '/secretary',
  '/subscriptions',
  '/wallet',
  '/admin',
  '/settings',
];
