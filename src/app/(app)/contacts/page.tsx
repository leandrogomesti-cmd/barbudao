
import { getContacts } from '@/lib/actions';
import { ContactsClient } from './contacts-client';
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

export default async function ContactsPage() {
  const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
  let userId = '';

  if (sessionCookie) {
    try {
      const { auth: adminAuth } = getFirebaseAdmin();
      const decodedToken = await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );
      userId = decodedToken.email || decodedToken.uid;
    } catch (error) {
      return redirect('/api/auth/logout');
    }
  } else {
    return redirect('/login');
  }

  const initialContacts = await getContacts(userId);

  return (
    <div className="w-full">
      <ContactsClient initialContacts={initialContacts} ownerId={userId} />
    </div>
  );
}
