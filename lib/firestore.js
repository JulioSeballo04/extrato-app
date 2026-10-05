import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Cada usuário logado tem um único documento em users/{uid} com todos os
// dados do app (pessoas, cartões, lançamentos, gastos avulsos e paleta).
// Isso mantém a mesma estrutura que já existia no armazenamento local,
// só trocando onde os dados moram.

// Acompanha em tempo real o documento users/{uid}: o próprio (para refletir
// edições feitas em outro aparelho) ou o de um parceiro vinculado — esse só
// funciona se existir um vínculo em `links` (ver firestore.rules).
// `fromCache` indica que o snapshot veio do cache local, sem confirmação do
// servidor: offline, um documento "inexistente" pode só não ter sido baixado.
export function subscribeUserData(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache }),
    onError,
  );
}

export async function saveUserData(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: false });
}
