// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

// Garante que esta rota seja executada no ambiente Node.js, não no Edge runtime.
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return new NextResponse('ID token não fornecido.', { status: 400 });
    }

    const { auth } = getFirebaseAdmin();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias em milissegundos
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = {
      name: 'firebase-session-token',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    (await cookies()).set(options);

    return NextResponse.json({ success: true, message: 'Login bem-sucedido e sessão criada.' });
  } catch (error: any) {
    console.error('Erro na criação do cookie de sessão:', error);
    return new NextResponse('Autenticação falhou: ' + error.message, { status: 401 });
  }
}
