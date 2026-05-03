
'use server';

import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/client';
import { redirect } from 'next/navigation';

export async function signup(formData: FormData, idToken: string) {
  if (!idToken) {
    return { success: false, message: 'ID Token não fornecido.' };
  }

  try {
    const { auth: adminAuth } = getFirebaseAdmin();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    // Use setDoc com merge: true para criar ou atualizar o documento do usuário de forma segura
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: email,
        planId: 'gratis',
        planStatus: 'active',
        dailySendLimit: 50,
        hasUnlimitedSends: false,
        subscriptionsEnabled: false, // Default to false for new users
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return { success: true, userId: uid };
  } catch (error: any) {
    console.error("Signup Error:", error);
    return { success: false, message: "Falha ao criar usuário no Firestore: " + error.message };
  }
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string;
  // A lógica real de envio de e-mail de redefinição deve ser feita no cliente
  // Esta action serve como um placeholder
  try {
    // A função sendPasswordResetEmail do SDK do cliente deve ser usada na página do formulário
    return { success: true, message: 'Se o e-mail estiver correto, um link será enviado.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function logout() {
  // A lógica de logout (sign out) deve ser feita preferencialmente no cliente para limpar o cache do Firebase SDK.
  // Esta action pode redirecionar se necessário.
  redirect('/login');
}
