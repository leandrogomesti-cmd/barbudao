// src/middleware.ts - Edge Runtime Compatible (FIXED)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('firebase-session-token');
    const { pathname } = request.nextUrl;

    // Auth pages that should be accessible without login
    const isAuthPage = pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/forgot-password');

    // API routes handle their own authentication
    const isApiRoute = pathname.startsWith('/api');

    // Public assets and Next.js internals
    const isPublicAsset = pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('.')

        ; // files with extensions

    // Skip middleware for API routes and public assets
    if (isApiRoute || isPublicAsset) {
        return NextResponse.next();
    }

    // If no cookie exists and not on auth page, redirect to login
    if (!sessionCookie && !isAuthPage) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If has cookie and is on auth page, redirect to dashboard
    // (full validation happens in Server Components/API routes)
    if (sessionCookie && isAuthPage) {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
}

// Simplified matcher - let the middleware logic handle exclusions
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
