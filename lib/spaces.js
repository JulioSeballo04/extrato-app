import { useEffect, useState } from 'react';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot,
  query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { SANITIZERS, str } from './model';

// Modelo de dados por espaço.
//
// spaces/{spaceId}            nome, dono, membros e papel de cada um
//   people/{id}               pessoas que dividem as contas (não são usuários)
//   cards/{id}                cartões de crédito
//   cardTransactions/{id}     um documento por lançamento/parcela no cartão
//   otherExpenses/{id}        um documento por gasto fora do cartão
// spaceInvites/{code}         convite de uso único para entrar num espaço
// users/{uid}                 preferências do usuário (espaço ativo, paleta)
//
// Cada lançamento é um documento próprio: não há limite de tamanho por espaço
// e cada edição grava só o item alterado (sem uma edição sobrescrever outra).
// As regras em firestore.rules validam todos os campos abaixo.

export const COLLECTIONS = ['people', 'cards', 'cardTransactions', 'otherExpenses'];
export const ROLES = { owner: 'Dono', editor: 'Pode editar', viewer: 'Só visualiza' };
export const MAX_MEMBERS = 10;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1
const CODE_LENGTH = 10;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 400; // o Firestore aceita até 500 operações por lote

export function newId() {
  return doc(collection(db, 'spaces')).id;
}

// ---------------------------------------------------------------------------
// Escrita em lotes. Os lotes são disparados juntos (sem esperar um pelo outro):
// a tela já reflete a mudança na hora e, offline, tudo fica na fila.

function commitInChunks(ops) {
  const commits = [];
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach(op => op(batch));
    commits.push(batch.commit());
  }
  return Promise.all(commits);
}

function itemRef(spaceId, coll, id) {
  return doc(db, 'spaces', spaceId, coll, id);
}

// Operações sobre os itens de um espaço. Cada função devolve a Promise da
// gravação; quem chama trata o erro (a tela desfaz sozinha se for negada).
export function spaceStore(spaceId) {
  return {
    set(coll, id, data) {
      return setDoc(itemRef(spaceId, coll, id), SANITIZERS[coll](data));
    },
    setMany(coll, items) {
      return commitInChunks(items.map(it => (b) => b.set(itemRef(spaceId, coll, it.id), SANITIZERS[coll](it))));
    },
    // `current` é o item como está agora: o resultado completo é saneado, para
    // gravar só os campos de `patch` já no formato aceito pelas regras.
    update(coll, current, patch) {
      const full = SANITIZERS[coll]({ ...current, ...patch });
      const fields = Object.fromEntries(Object.keys(patch).filter(k => k in full).map(k => [k, full[k]]));
      return updateDoc(itemRef(spaceId, coll, current.id), fields);
    },
    toggleMonth(coll, id, field, month, on) {
      return updateDoc(itemRef(spaceId, coll, id), { [field]: on ? arrayUnion(month) : arrayRemove(month) });
    },
    remove(coll, id) {
      return deleteDoc(itemRef(spaceId, coll, id));
    },
    // refs: [[coll, id], ...]
    removeMany(refs) {
      return commitInChunks(refs.map(([coll, id]) => (b) => b.delete(itemRef(spaceId, coll, id))));
    },
  };
}

// Acompanha em tempo real os quatro tipos de item de um espaço. Só chama
// onData depois que todos chegaram, para a tela não aparecer pela metade.
export function subscribeSpaceData(spaceId, onData, onError) {
  const state = {};
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1);
  const unsubs = COLLECTIONS.map(coll => onSnapshot(
    collection(db, 'spaces', spaceId, coll),
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state[coll] = coll === 'people' || coll === 'cards' ? items.sort(byOrder) : items;
      if (COLLECTIONS.every(c => state[c])) onData({ ...state });
    },
    onError,
  ));
  return () => unsubs.forEach(u => u());
}

// ---------------------------------------------------------------------------
// Espaços, membros e convites.

export function userLabel(user) {
  return str(user?.displayName || user?.email || 'Usuário', 100);
}

function homeSpaceId(uid) {
  return `home_${uid}`;
}

// Primeiro acesso no modelo novo: cria o espaço "Meus gastos" e, se a pessoa
// tinha dados no formato antigo (tudo em users/{uid}), copia tudo para lá.
// É idempotente (ids fixos): se cair no meio, roda de novo sem duplicar.
// Os dados antigos continuam em users/{uid} como cópia de segurança.
export async function ensureUserSetup(user) {
  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const legacy = snap.exists() ? snap.data() : {};
  if (legacy.spacesVersion >= 1) return;

  const spaceId = homeSpaceId(uid);
  await setDoc(doc(db, 'spaces', spaceId), {
    name: 'Meus gastos',
    ownerId: uid,
    members: [uid],
    roles: { [uid]: 'owner' },
    labels: { [uid]: userLabel(user) },
    createdAt: serverTimestamp(),
  });

  const store = spaceStore(spaceId);
  const hasLegacy = ['people', 'cards', 'cardTransactions', 'otherExpenses'].some(k => Array.isArray(legacy[k]) && legacy[k].length);
  if (hasLegacy) {
    const withOrder = (list) => (list || []).filter(x => x && x.id).map((x, i) => ({ ...x, order: i }));
    await Promise.all([
      store.setMany('people', withOrder(legacy.people)),
      store.setMany('cards', withOrder(legacy.cards)),
      store.setMany('cardTransactions', (legacy.cardTransactions || []).filter(x => x && x.id)),
      store.setMany('otherExpenses', (legacy.otherExpenses || []).filter(x => x && x.id)),
    ]);
  } else {
    const firstName = str(user.displayName, 80).split(' ')[0] || 'Você';
    await store.set('people', `p_${uid}`, { name: firstName, salary: 0, order: 0 });
  }

  await setDoc(userRef, {
    spacesVersion: 1,
    activeSpaceId: spaceId,
    paletteKey: typeof legacy.paletteKey === 'string' ? legacy.paletteKey : 'gold',
    migratedAt: serverTimestamp(),
  }, { merge: true });
}

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

function spaceError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

// Estado do usuário: preferências (users/{uid}) e espaços dos quais é membro.
export function useSpaces(user) {
  const uid = user?.uid;
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'failed'
  const [profile, setProfile] = useState(null);
  const [spaces, setSpaces] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    const unsubs = [];
    setStatus('loading');
    ensureUserSetup(user).then(() => {
      if (cancelled) return;
      unsubs.push(onSnapshot(doc(db, 'users', uid), (s) => setProfile(s.data() || {}), () => setStatus('failed')));
      unsubs.push(onSnapshot(
        query(collection(db, 'spaces'), where('members', 'array-contains', uid)),
        (s) => setSpaces(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.id === homeSpaceId(uid) ? -1 : b.id === homeSpaceId(uid) ? 1 : a.name.localeCompare(b.name)))),
        () => setStatus('failed'),
      ));
    }, () => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; unsubs.forEach(u => u()); };
  }, [uid, attempt]);

  useEffect(() => {
    if (profile && spaces && status === 'loading') setStatus('ready');
  }, [profile, spaces, status]);

  // Espaço ativo: o salvo nas preferências, se a pessoa ainda for membro.
  const active = spaces?.find(s => s.id === profile?.activeSpaceId) || spaces?.find(s => s.id === homeSpaceId(uid)) || spaces?.[0] || null;
  const role = active?.roles?.[uid] || 'viewer';

  function setProfileField(fields) {
    return setDoc(doc(db, 'users', uid), fields, { merge: true });
  }

  async function createSpace(name) {
    const id = newId();
    await setDoc(doc(db, 'spaces', id), {
      name: str(name, 60) || 'Novo espaço',
      ownerId: uid,
      members: [uid],
      roles: { [uid]: 'owner' },
      labels: { [uid]: userLabel(user) },
      createdAt: serverTimestamp(),
    });
    await setProfileField({ activeSpaceId: id });
    return id;
  }

  function renameSpace(spaceId, name) {
    return updateDoc(doc(db, 'spaces', spaceId), { name: str(name, 60) || 'Espaço' });
  }

  async function createInvite(spaceId, inviteRole, previousCode) {
    const space = spaces.find(s => s.id === spaceId);
    const code = randomCode();
    await setDoc(doc(db, 'spaceInvites', code), {
      spaceId,
      spaceName: space?.name || 'Espaço',
      role: inviteRole === 'viewer' ? 'viewer' : 'editor',
      createdBy: uid,
      expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_MS),
      createdAt: serverTimestamp(),
    });
    if (previousCode) deleteDoc(doc(db, 'spaceInvites', previousCode)).catch(() => {});
    return code;
  }

  // Entrar num espaço com um código. O convite é apagado no mesmo lote em que
  // a pessoa vira membro — as regras exigem isso, então o código vale uma vez só.
  async function joinWithCode(rawCode) {
    const code = normalizeCode(rawCode);
    if (!code) throw spaceError('invite-not-found');
    const inviteRef = doc(db, 'spaceInvites', code);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) throw spaceError('invite-not-found');
    const invite = snap.data();
    if (invite.expiresAt.toMillis() < Date.now()) throw spaceError('invite-expired');
    if (spaces.some(s => s.id === invite.spaceId)) throw spaceError('already-member');

    const batch = writeBatch(db);
    batch.update(doc(db, 'spaces', invite.spaceId), {
      members: arrayUnion(uid),
      [`roles.${uid}`]: invite.role,
      [`labels.${uid}`]: userLabel(user),
      joinCode: code,
    });
    batch.delete(inviteRef);
    await batch.commit();
    await setProfileField({ activeSpaceId: invite.spaceId });
    return invite.spaceName;
  }

  function removeMember(spaceId, memberUid) {
    return updateDoc(doc(db, 'spaces', spaceId), {
      members: arrayRemove(memberUid),
      [`roles.${memberUid}`]: deleteField(),
      [`labels.${memberUid}`]: deleteField(),
    });
  }

  function setMemberRole(spaceId, memberUid, newRole) {
    return updateDoc(doc(db, 'spaces', spaceId), { [`roles.${memberUid}`]: newRole === 'viewer' ? 'viewer' : 'editor' });
  }

  async function leaveSpace(spaceId) {
    if (active?.id === spaceId) await setProfileField({ activeSpaceId: homeSpaceId(uid) });
    return removeMember(spaceId, uid);
  }

  // Apaga todos os itens e depois o próprio espaço (só o dono; nunca o pessoal).
  async function deleteSpace(spaceId) {
    if (spaceId === homeSpaceId(uid)) throw spaceError('cannot-delete-home');
    const refs = [];
    for (const coll of COLLECTIONS) {
      const snap = await getDocs(collection(db, 'spaces', spaceId, coll));
      snap.docs.forEach(d => refs.push([coll, d.id]));
    }
    await spaceStore(spaceId).removeMany(refs);
    if (active?.id === spaceId) await setProfileField({ activeSpaceId: homeSpaceId(uid) });
    await deleteDoc(doc(db, 'spaces', spaceId));
  }

  return {
    status,
    retry: () => setAttempt(n => n + 1),
    profile: profile || {},
    spaces: spaces || [],
    active,
    role,
    homeSpaceId: uid ? homeSpaceId(uid) : null,
    setActiveSpace: (spaceId) => setProfileField({ activeSpaceId: spaceId }),
    setPaletteKey: (paletteKey) => setProfileField({ paletteKey }),
    createSpace, renameSpace, createInvite, joinWithCode, removeMember, setMemberRole, leaveSpace, deleteSpace,
  };
}
