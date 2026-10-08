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
  return { name: str(p.name, 80) || 'Sem nome', salary: Math.max(0, num(p.salary)), order: num(p.order) };
}

export function sanitizeCard(c) {
  return {
    name: str(c.name, 60) || 'Cartão',
    limitValue: Math.max(0, num(c.limitValue)),
    bank: str(c.bank, 30),
    dueDay: int(c.dueDay, 0, 31, 0),
    paidInvoices: monthList(c.paidInvoices),
    order: num(c.order),
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
  if (t.installmentGroupId) out.installmentGroupId = str(t.installmentGroupId, 64);
  if (t.splitGroupId) {
    out.splitGroupId = str(t.splitGroupId, 64);
    out.splitCount = int(t.splitCount, 2, 20, 2);
  }
  return out;
}

export const SANITIZERS = {
  people: sanitizePerson,
  cards: sanitizeCard,
  cardTransactions: (t) => sanitizeEntry(t, true),
  otherExpenses: (t) => sanitizeEntry(t, false),
};

