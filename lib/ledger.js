// Regras e formatação dos lançamentos (sem React nem Firebase).

export const CATEGORIES = ['Alimentação', 'Compras', 'Mercado', 'Lazer', 'Contas fixas', 'Transporte', 'Saúde', 'Educação', 'Assinaturas', 'Outros'];
export const DEFAULT_CATEGORY = 'Outros';

export function money(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Valor digitado como no Brasil: "12,50", "1.234,56", "R$ 30" ou "12.5".
export function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  let s = String(raw ?? '').replace(/[^\d,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
// Número → texto para editar ("12,5"), sem separador de milhar.
export function amountInput(v) {
  const n = Number(v) || 0;
  return n ? String(Math.round(n * 100) / 100).replace('.', ',') : '';
}

export function fmtDate(d) {
  if (!d) return '';
  const parts = d.slice(5).split('-');
  return parts.length === 2 ? `${parts[1]}/${parts[0]}` : d;
}

const MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES_PT[m - 1]} de ${y}`;
}
export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Data padrão de um lançamento novo: hoje, se o mês escolhido for o atual; senão, dia 1.
export function defaultDateFor(month) {
  return month === currentMonth() ? todayStr() : `${month}-01`;
}
export function monthsLaterDate(dateStr, n) {
  const [y, m, day] = dateStr.split('-').map(Number);
  const targetMonth = m - 1 + n;
  // Preserva o dia original (ex.: parcela sempre no dia 10), mas o limita
  // ao último dia do mês de destino quando ele for mais curto (ex.: dia 31
  // não vira dia 3 do mês seguinte, vira o último dia daquele mês).
  const daysInTargetMonth = new Date(y, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day || 1, daysInTargetMonth);
  const d = new Date(y, targetMonth, clampedDay);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Um lançamento "fixo" permanece valendo em todo mês a partir da data em
// que foi criado (ex.: aluguel, assinatura), não só no mês em que foi lançado.
// Parcelas nunca se repetem: cada uma já tem o seu mês. (Dados antigos podem ter
// parcelas marcadas como fixas; elas contariam em dobro a cada mês seguinte.)
export function isRecurring(item) {
  return !!item?.fixed && !(item.installmentTotal > 1);
}
// Pago/pendente em um mês. Um gasto fixo é um único registro que vale todo mês,
// então guarda os meses pagos (`paidMonths`); os demais têm um `paid` só.
export function isPaidIn(item, month) {
  return isRecurring(item) ? (item.paidMonths || []).includes(month) : !!item.paid;
}
// Fatura do cartão: marcada como paga por mês, no próprio cartão.
export function isInvoicePaid(card, month) {
  return (card.paidInvoices || []).includes(month);
}
export function matchesMonth(item, month) {
  if (!item?.date || !month) return false;
  const itemMonth = item.date.slice(0, 7);
  if (itemMonth === month) return true;
  return isRecurring(item) && itemMonth < month;
}
// Data em que o item vence no mês exibido (um fixo repete o dia todo mês).
export function dueDateIn(item, month) {
  if (!isRecurring(item)) return item.date;
  const [y, m] = month.split('-').map(Number);
  const day = Math.min(Number(item.date.slice(8, 10)) || 1, daysInMonth(y, m - 1));
  return `${month}-${String(day).padStart(2, '0')}`;
}
// 'paid' | 'overdue' (passou da data e não foi pago) | 'pending'.
export function entryStatus(paid, dateStr) {
  if (paid) return 'paid';
  return dateStr && dateStr < todayStr() ? 'overdue' : 'pending';
}

// Dia de vencimento da fatura: inteiro de 1 a 31, ou 0 quando não informado.
export function parseDueDay(v) {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 31 ? n : 0;
}
export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
// Próximo vencimento (hoje conta). Dia 31 em mês de 30 dias vence no último dia.
function nextDueDate(dueDay, from = new Date()) {
  if (!dueDay) return null;
  const today = startOfDay(from);
  for (let i = 0; i < 2; i++) {
    const y = today.getFullYear();
    const m = today.getMonth() + i;
    const d = new Date(y, m, Math.min(dueDay, daysInMonth(y, m)));
    if (d >= today) return d;
  }
  return null;
}
function daysUntil(date, from = new Date()) {
  return Math.round((startOfDay(date) - startOfDay(from)) / 86400000);
}
export function dueLabel(dueDay) {
  const next = nextDueDate(dueDay);
  if (!next) return null;
  const n = daysUntil(next);
  const when = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`;
  return { day: String(next.getDate()).padStart(2, '0'), when, text: `Vence dia ${String(next.getDate()).padStart(2, '0')} · ${when}`, urgent: n <= 3 };
}

export const sumAmounts = list => list.reduce((s, t) => s + Number(t.amount || 0), 0);

// Texto da confirmação de exclusão: avisa quantos lançamentos vão junto.
export function entriesNote(n) {
  return n === 0 ? '' : n === 1 ? ' e 1 lançamento' : ` e ${n} lançamentos`;
}

// Contas do mês para marcar como pagas: a fatura de cada cartão (no dia de
// vencimento, se houver) e cada gasto fora do cartão. `inScope` filtra por pessoa.
// Com `includeEmptyInvoices`, entram também as faturas sem gasto (para o calendário).
export function buildMonthBills({ cards, cardTransactions, otherExpenses }, month, inScope, includeEmptyInvoices = false) {
  const [y, m] = month.split('-').map(Number);
  const dim = daysInMonth(y, m - 1);
  const dateOf = day => (day ? `${month}-${String(day).padStart(2, '0')}` : null);
  const bills = [
    ...cards.map(c => {
      const day = c.dueDay ? Math.min(c.dueDay, dim) : null;
      const amount = sumAmounts(cardTransactions.filter(t => t.cardId === c.id && matchesMonth(t, month) && inScope(t)));
      const paid = isInvoicePaid(c, month);
      return {
        kind: 'card', id: `card-${c.id}`, refId: c.id, title: `Fatura ${c.name}`, day, amount, paid,
        status: amount > 0 ? entryStatus(paid, dateOf(day)) : null,
      };
    }).filter(b => b.amount > 0 || (includeEmptyInvoices && b.day)),
    ...otherExpenses.filter(e => matchesMonth(e, month) && inScope(e)).map(e => {
      const date = dueDateIn(e, month);
      const paid = isPaidIn(e, month);
      return {
        kind: 'expense', id: e.id, refId: e.id, title: e.description, personId: e.personId,
        day: Number(date.slice(8, 10)) || null, amount: Number(e.amount || 0), paid, status: entryStatus(paid, date),
        tag: e.installmentTotal > 1 ? `${e.installmentNumber}/${e.installmentTotal}` : isRecurring(e) ? 'fixo' : null,
      };
    }),
  ];
  return bills.sort((a, b) => (a.day || 99) - (b.day || 99));
}
