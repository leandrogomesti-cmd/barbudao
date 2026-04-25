import 'server-only';

import admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Storage } from 'firebase-admin/storage';
import serviceAccount from '../../../firebase-admin.json';

const serviceAccountParams = {
  projectId: serviceAccount.project_id,
  privateKey: serviceAccount.private_key,
  clientEmail: serviceAccount.client_email,
};

interface FirebaseAdmin {
  auth: Auth;
  db: Firestore;
  storage: Storage;
}

let firebaseAdmin: FirebaseAdmin | null = null;

// Esta função garante que o Firebase Admin seja inicializado apenas uma vez.
function initializeFirebaseAdmin(): FirebaseAdmin {
  if (admin.apps.length > 0) {
    // Se já foi inicializado, retorna o app existente.
    const app = admin.app();
    return {
      auth: app.auth(),
      db: app.firestore(),
      storage: app.storage(),
    };
  }

  // Se não foi inicializado, cria um novo app.
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountParams),
    storageBucket: 'ronaldo-amanae.firebasestorage.app'
  });

  const db = app.firestore();
  // A configuração do banco de dados SÓ PODE ser chamada uma vez.
  // Fazemos isso aqui, logo após a inicialização, e nunca mais.
  db.settings({ databaseId: 'disparador' });

  return {
    auth: app.auth(),
    db: db,
    storage: app.storage(),
  };
}

// getFirebaseAdmin agora usa a função de inicialização garantida.
function getFirebaseAdmin(): FirebaseAdmin {
  if (!firebaseAdmin) {
    firebaseAdmin = initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

export { getFirebaseAdmin };
