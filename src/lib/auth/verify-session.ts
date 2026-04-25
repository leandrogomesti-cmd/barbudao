import { getFirebaseAdmin } from '@/lib/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies a Firebase session token server-side.
 * @param sessionToken - The session cookie token to verify
 * @returns DecodedIdToken if valid, null if invalid/expired
 */
export async function verifySessionToken(
    sessionToken: string
): Promise<DecodedIdToken | null> {
    try {
        const { auth } = getFirebaseAdmin();
        const decodedToken = await auth.verifySessionCookie(sessionToken, true);
        return decodedToken;
    } catch (error: any) {
        // Token is invalid, expired, or revoked
        console.warn('[AUTH] Session token verification failed:', error.code || error.message);
        return null;
    }
}
