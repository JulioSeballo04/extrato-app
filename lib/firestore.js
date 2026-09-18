import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

// Acompanha em tempo real o documento de outra pessoa (parceiro vinculado).
// Só funciona se existir um vínculo em `links` — ver firestore.rules.
export function subscribeUserData(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? snap.data() : null),
    onError,
  );
}

export async function saveUserData(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: false });
}
