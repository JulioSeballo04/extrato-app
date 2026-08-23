import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Cada usuário logado tem um único documento em users/{uid} com todos os
// dados do app (pessoas, cartões, lançamentos, gastos avulsos e paleta).
// Isso mantém a mesma estrutura que já existia no armazenamento local,
// só trocando onde os dados moram.

export async function getUserData(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveUserData(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: false });
}
