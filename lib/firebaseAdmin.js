// Firebase Admin: só no servidor (rotas em app/api). Usa a chave da conta de
// serviço guardada em FIREBASE_SERVICE_ACCOUNT (o JSON inteiro, numa linha).
// Sem a variável, `adminReady` fica false e quem chama cai no plano B.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

export const adminReady = Boolean(raw);

function app() {
  if (getApps().length) return getApps()[0];
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
