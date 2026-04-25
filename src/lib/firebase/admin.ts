import 'server-only';

import admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Storage } from 'firebase-admin/storage';

// NÃO importamos firebase-admin.json estaticamente — o arquivo não existe no
// repositório (está no .gitignore) e causaria falha no build do Firebase App Hosting.
// Em produção usamos Application Default Credentials (ADC), que funciona
// automaticamente no Firebase App Hosting / Google Cloud.
// Em desenvolvimento local, o ADC lê o GOOGLE_APPLICATION_CREDENTIALS ou
// o arquivo de credenciais do gcloud (gcloud auth application-default login).

function getCredential(): admin.credential.Credential {
  // Em produção (Firebase App Hosting) usa ADC — disponível automaticamente no Google Cloud.
  // Localmente: se GOOGLE_APPLICATION_CREDENTIALS estiver setada, ADC usa esse arquivo.
  // Fallback: tenta ler firebase-admin.json via fs (sem import estático — webpack não rastreia).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const jsonPath = process.cwd() + '/firebase-admin.json';
    if (fs.existsSync(jsonPath)) {
      const sa = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      return admin.credential.cert(sa);
    }
  } catch {
    // arquivo não encontrado ou inválido — usa ADC
  }
  // Application Default Credentials: funciona automaticamente no Firebase App Hosting
  // e localmente quando GOOGLE_APPLICATION_CREDENTIALS está configurado
  return admin.credential.applicationDefault();
}

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
    credential: getCredential(),
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
