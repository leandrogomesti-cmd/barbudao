import type { Staff } from '@/lib/types/staff';

/** Roles dentro de uma tenant (barbearia). */
export type TenantRole = NonNullable<Staff['perfil_acesso']>;

/**
 * 'super_admin' é um role de plataforma — não pertence a nenhuma tenant específica.
 * Tem acesso de leitura/escrita em TODAS as tenants.
 */
export type Role = TenantRole | 'super_admin';

export interface CurrentUser {
  uid: string;
  email: string;
  staffId: string;
  nome: string;
  role: Role;
  unidade_padrao?: string;
  /** UUID da tenant. undefined apenas para super_admin (acessa todas). */
  tenant_id?: string;
  /**
   * true quando um super_admin está operando dentro de uma tenant específica
   * via cookie 'sa_tenant'. Permite mostrar banner de "modo impersonação".
   */
  is_super_admin_impersonating?: boolean;
}

export class AuthorizationError extends Error {
  constructor(message = 'Acesso negado.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** UUID fixo do tenant BarberCoffee (tenant padrão / legado). */
export const BARBERCOFFEE_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const ROLE_GROUPS = {
  SUPER_ADMIN:          ['super_admin'] as Role[],
  ADMIN_OR_GERENTE:     ['ADMIN', 'GERENTE'] as Role[],
  ADMIN_GERENTE_RECEPCAO: ['ADMIN', 'GERENTE', 'RECEPCAO'] as Role[],
  ALL_TENANT_ROLES:     ['ADMIN', 'GERENTE', 'PROFISSIONAL', 'RECEPCAO'] as Role[],
  ALL:                  ['super_admin', 'ADMIN', 'GERENTE', 'PROFISSIONAL', 'RECEPCAO'] as Role[],
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
