// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Garante que esta rota seja executada no ambiente Node.js.
export const runtime = 'nodejs';

// GET: chamado via redirect() nos Server Components quando o cookie expira
// Apaga o cookie e redireciona para /login (sem loop, pois o cookie some)
export async function GET() {
  try {
    (await cookies()).set({
      name: 'firebase-session-token',
      value: '',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error: any) {
    console.error('Erro ao limpar cookie de sessão (GET):', error);
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}

// POST: chamado pelo cliente via fetch() no botão de logout
export async function POST() {
  try {
    (await cookies()).set({
      name: 'firebase-session-token',
      value: '',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.json({ success: true, message: 'Logout bem-sucedido.' });
  } catch (error: any) {
    console.error('Erro ao limpar cookie de sessão:', error);
    return new NextResponse('Falha ao fazer logout: ' + error.message, { status: 500 });
  }
}
