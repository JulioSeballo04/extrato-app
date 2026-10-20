// Convite aberto por link (/convite/CODIGO): o código fica guardado neste
// aparelho enquanto a pessoa entra ou cria a conta (inclusive a confirmação de
// e-mail, que pode acontecer em outra aba) e é usado assim que o app carrega.

import { normalizeCode } from './spaces';

const KEY = 'gestor-de-gastos:convite-pendente';
const TTL_MS = 24 * 60 * 60 * 1000; // o convite em si vale 24 h

export function savePendingInvite(code) {
  const clean = normalizeCode(code);
  if (!clean) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: clean, at: Date.now() })); } catch { /* sem armazenamento */ }
}

export function readPendingInvite() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw?.code || Date.now() - raw.at > TTL_MS) return null;
    return raw.code;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}

// Endereço do convite para copiar ou compartilhar.
export function inviteUrl(code) {
  return `${window.location.origin}/convite/${code}`;
}
