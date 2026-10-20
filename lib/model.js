// Formato dos dados gravados no Firestore (ver firestore.rules, que valida
// exatamente estes campos). Funções puras, sem Firebase: testáveis isoladamente.

// Saneamento: tudo que é gravado passa por aqui, no formato exato que as
// regras aceitam (também limpa dados antigos na migração).

export const str = (v, max) => String(v ?? '').trim().slice(0, max);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const int = (v, min, max, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const monthList = (v) => (Array.isArray(v) ? [...new Set(v.filter(m => typeof m === 'string' && MONTH_RE.test(m)))].slice(-240) : []);
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sanitizePerson(p) {
  return {
    name: str(p.name, 80) || 'Sem nome', salary: Math.max(0, num(p.salary)), order: num(p.order),
    // Conta (membro do espaço) ligada a esta pessoa.
    ...(p.uid ? { uid: str(p.uid, 128) } : {}),
  };
}

export function sanitizeCard(c) {
  return {
    name: str(c.name, 60) || 'Cartão',
    limitValue: Math.max(0, num(c.limitValue)),
    color: str(c.color, 20),
    dueDay: int(c.dueDay, 0, 31, 0),
    closeDay: int(c.closeDay, 0, 31, 0), // dia em que a fatura fecha (0 = sem)
    paidInvoices: monthList(c.paidInvoices),
    order: num(c.order),
    // `bank` é de cartões antigos: só serve para escolher a cor equivalente.
    ...(c.bank ? { bank: str(c.bank, 30) } : {}),
    // Pessoa a quem se deve (ex.: compras no cartão da mãe); sem o campo, é cartão.
    ...(c.kind === 'payee' ? { kind: 'payee' } : {}),
  };
}

// Lançamento no cartão (withCard) ou gasto fora do cartão.
export function sanitizeEntry(t, withCard) {
  const out = {
    personId: str(t.personId, 64),
    description: str(t.description, 200) || 'Sem descrição',
    amount: num(t.amount),
    date: typeof t.date === 'string' && DATE_RE.test(t.date) ? t.date : todayStr(),
    fixed: !!t.fixed,
    category: str(t.category, 40) || 'Outros',
    installmentNumber: int(t.installmentNumber, 1, 480, 1),
    installmentTotal: int(t.installmentTotal, 1, 480, 1),
    paid: !!t.paid,
  };
  if (withCard) out.cardId = str(t.cardId, 64);
  else out.paidMonths = monthList(t.paidMonths);
  // Fixo encerrado: último mês em que ainda vale.
  if (typeof t.endMonth === 'string' && MONTH_RE.test(t.endMonth)) out.endMonth = t.endMonth;
  // Quem lançou (uid), para mostrar em espaços com mais de um membro.
  if (t.createdBy) out.createdBy = str(t.createdBy, 128);
  if (t.installmentGroupId) out.installmentGroupId = str(t.installmentGroupId, 64);
  if (t.splitGroupId) {
    out.splitGroupId = str(t.splitGroupId, 64);
    out.splitCount = int(t.splitCount, 2, 20, 2);
  }
  return out;
}

// Lançamento oculto de algum membro (ex.: presente): fica em hiddenEntries, com
// a coleção de origem (`coll`) e quem pode vê-lo (`visibleTo`, lista de uids).
export function sanitizeHiddenEntry(t) {
  const onCard = t.coll === 'cardTransactions';
  const visibleTo = Array.isArray(t.visibleTo) ? [...new Set(t.visibleTo.filter(u => typeof u === 'string' && u))].slice(0, 10) : [];
  return { ...sanitizeEntry(t, onCard), coll: onCard ? 'cardTransactions' : 'otherExpenses', visibleTo };
}

export const SANITIZERS = {
  people: sanitizePerson,
  cards: sanitizeCard,
  cardTransactions: (t) => sanitizeEntry(t, true),
  otherExpenses: (t) => sanitizeEntry(t, false),
  hiddenEntries: sanitizeHiddenEntry,
};

