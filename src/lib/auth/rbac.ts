'use server';

import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { supabase } from '@/lib/supabase/client';
import { AuthorizationError, type CurrentUser, type Role, RESTRICTED_PATHS_FOR_PROFISSIONAL } from '@/lib/auth/rbac-types';

/**
 * Lê a sessão Firebase do cookie e busca o staff correspondente em `profissionais`.
 * Retorna null se não autenticado ou sem registro de staff ativo.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-session-token')?.value;
    if (!sessionToken) return null;

    const decoded = await verifySessionToken(sessionToken);
    if (!decoded?.email) return null;

    const { data, error } = await supabase
      .from('profissionais')
      .select('id, nome, email, perfil_acesso, unidade_padrao')
      .eq('email', decoded.email)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !data) return null;

    return {
      uid: decoded.uid,
      email: decoded.email,
      staffId: data.id,
      nome: data.nome,
      role: (data.perfil_acesso ?? 'PROFISSIONAL') as Role,
      unidade_padrao: data.unidade_padrao ?? undefined,
    };
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
  if (user.role === 'ADMIN' || user.role === 'GERENTE') return true;
  if (user.role === 'RECEPCAO') {
    return !['/admin', '/staff', '/services', '/inventory', '/missions', '/settings'].some(p =>
      pathname.startsWith(p)
    );
  }
  return !RESTRICTED_PATHS_FOR_PROFISSIONAL.some(p => pathname.startsWith(p));
}
