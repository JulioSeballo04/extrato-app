import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Vínculo entre parceiros.
//
// Fluxo: quem quer convidar gera um código (`invites/{code}`); a outra pessoa
// digita o código e cria o vínculo (`links/{uidA_uidB}`, com os dois uids em
// ordem alfabética). Enquanto o vínculo existir, cada um pode LER o documento
// `users/{uid}` do outro (nunca escrever) — as regras estão em firestore.rules.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1
const CODE_LENGTH = 10;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatCode(code) {
  return code.length === CODE_LENGTH ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

function userLabel(user) {
  return user?.displayName || user?.email || 'Parceiro(a)';
}

function partnerError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

export function usePartners(user) {
  const uid = user?.uid;
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setPartners([]);
      return undefined;
    }
    const q = query(collection(db, 'links'), where('members', 'array-contains', uid));
    return onSnapshot(
      q,
      (snap) => {
        setError('');
        setPartners(snap.docs.map((d) => {
          const data = d.data();
          const otherUid = data.members.find((m) => m !== uid);
          return { linkId: d.id, uid: otherUid, label: data.labels?.[otherUid] || 'Parceiro(a)' };
        }));
      },
      (err) => setError(err.code || 'unknown'),
    );
  }, [uid]);

  async function createInvite(previousCode) {
    const code = randomCode();
    await setDoc(doc(db, 'invites', code), {
      owner: uid,
      ownerLabel: userLabel(user),
      expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_MS),
      createdAt: serverTimestamp(),
    });
    if (previousCode) deleteDoc(doc(db, 'invites', previousCode)).catch(() => {});
    return code;
  }

  async function acceptInvite(rawCode) {
    const code = normalizeCode(rawCode);
    if (!code) throw partnerError('invite-not-found');
    const inviteRef = doc(db, 'invites', code);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) throw partnerError('invite-not-found');
    const invite = snap.data();
    if (invite.owner === uid) throw partnerError('own-invite');
    if (invite.expiresAt.toMillis() < Date.now()) throw partnerError('invite-expired');
    if (partners.some((p) => p.uid === invite.owner)) throw partnerError('already-linked');

    const members = [uid, invite.owner].sort();
    await setDoc(doc(db, 'links', members.join('_')), {
      members,
      labels: { [uid]: userLabel(user), [invite.owner]: invite.ownerLabel || 'Parceiro(a)' },
      code,
      createdAt: serverTimestamp(),
    });
    // Convite de uso único: some assim que o vínculo é criado.
    deleteDoc(inviteRef).catch(() => {});
  }

  function removeLink(linkId) {
    return deleteDoc(doc(db, 'links', linkId));
  }

  return { partners, error, createInvite, acceptInvite, removeLink };
}
