'use server';

import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { supabase } from '@/lib/supabase/client';
import {
  AuthorizationError,
  type CurrentUser,
  type Role,
  RESTRICTED_PATHS_FOR_PROFISSIONAL,
  BARBERCOFFEE_TENANT_ID,
} from '@/lib/auth/rbac-types';

function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Emails com role de plataforma super_admin (gestão de todas as tenants). */
function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Indica se há sessão Firebase válida (sem exigir registro em profissionais).
 * Útil para distinguir "não autenticado" de "autenticado sem perfil".
 */
export async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-session-token')?.value;
    if (!sessionToken) return null;
    const decoded = await verifySessionToken(sessionToken);
    return decoded?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Lê a sessão Firebase do cookie e busca o staff correspondente em `profissionais`.
 * Retorna null se não autenticado.
 *
 * Se autenticado mas sem registro em `profissionais`:
 *   - email listado em OWNER_EMAILS → role ADMIN sintético (acesso de dono).
 *   - caso contrário → null (chamador decide redirecionar para /access-denied).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-session-token')?.value;
    if (!sessionToken) return null;

    const decoded = await verifySessionToken(sessionToken);
    if (!decoded?.email) return null;

    const normalizedEmail = decoded.email.toLowerCase();

    // 1. Super-admin de plataforma tem precedência (sem registro em profissionais necessário)
    if (superAdminEmails().includes(normalizedEmail)) {
      return {
        uid: decoded.uid,
        email: decoded.email,
        staffId: '',
        nome: decoded.email,
        role: 'super_admin' as Role,
        tenant_id: undefined, // super_admin acessa todas as tenants
      };
    }

    // 2. Busca registro em profissionais (inclui tenant_id)
    const { data, error } = await supabase
      .from('profissionais')
      .select('id, nome, email, perfil_acesso, unidade_padrao, tenant_id')
      .eq('email', decoded.email)
      .eq('ativo', true)
      .maybeSingle();

    if (!error && data) {
      return {
        uid: decoded.uid,
        email: decoded.email,
        staffId: data.id,
        nome: data.nome,
        role: (data.perfil_acesso ?? 'PROFISSIONAL') as Role,
        unidade_padrao: data.unidade_padrao ?? undefined,
        tenant_id: data.tenant_id ?? BARBERCOFFEE_TENANT_ID,
      };
    }

    // 3. Fallback OWNER_EMAILS → ADMIN da tenant BarberCoffee
    const owners = ownerEmails();
    if (owners.includes(normalizedEmail)) {
      console.warn(
        `[RBAC] Usuário ${decoded.email} sem registro em profissionais — aplicando role ADMIN via OWNER_EMAILS (tenant BarberCoffee).`
      );
      return {
        uid: decoded.uid,
        email: decoded.email,
        staffId: '',
        nome: decoded.email,
        role: 'ADMIN' as Role,
        tenant_id: BARBERCOFFEE_TENANT_ID,
        unidade_padrao: undefined,
      };
    }

    return null;
  } catch (err) {
    console.error('[RBAC] getCurrentUser falhou:', err);
    return null;
  }
}

/**
 * Garante que o usuário atual esteja em um dos roles permitidos.
 * Lança AuthorizationError caso contrário. Use no início de server actions sensíveis.
 */
export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('[RBAC] Acesso negado: sem sessão.');
    throw new AuthorizationError('Não autenticado.');
  }
  if (!allowed.includes(user.role)) {
    console.warn(`[RBAC] Acesso negado: role=${user.role}, exigido=${allowed.join(',')}, user=${user.email}`);
    throw new AuthorizationError(`Permissão insuficiente (${user.role}).`);
  }
  return user;
}

export async function checkRole(allowed: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return allowed.includes(user.role) ? user : null;
}

export async function canAccessPath(pathname: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === 'super_admin') return true; // super_admin acessa tudo
  if (user.role === 'ADMIN' || user.role === 'GERENTE') return true;
  if (user.role === 'RECEPCAO') {
    return !['/admin', '/staff', '/services', '/inventory', '/missions', '/settings'].some(p =>
      pathname.startsWith(p)
    );
  }
  return !RESTRICTED_PATHS_FOR_PROFISSIONAL.some(p => pathname.startsWith(p));
}

/**
 * Retorna o tenant_id do usuário atual.
 * super_admin recebe undefined (sem restrição de tenant).
 * Útil para filtrar queries no padrão tenant-aware.
 */
export async function getCurrentTenantId(): Promise<string | undefined> {
  const user = await getCurrentUser();
  return user?.tenant_id;
}
