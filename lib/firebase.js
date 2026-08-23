import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ignoreUndefinedProperties evita que um campo `undefined` em qualquer
// objeto salvo quebre a escrita inteira no Firestore (que não aceita
// esse valor nativamente). Em hot-reload (dev) o Firestore já pode ter
// sido inicializado antes, então cai no getFirestore normal.
let db;
try {
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  db = getFirestore(app);
}
export { db };
export default app;
