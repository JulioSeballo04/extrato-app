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
// 'paid' | 'overdue' | 'pending'. Só fica "vencida" o que venceu do mês passado
// para cá: contas antigas nunca marcadas não enchem a tela de vermelho.
export function entryStatus(paid, dateStr) {
  if (paid) return 'paid';
  const today = todayStr();
  const overdueFrom = `${shiftMonth(today.slice(0, 7), -1)}-01`;
  return dateStr && dateStr < today && dateStr >= overdueFrom ? 'overdue' : 'pending';
}

// Dia de vencimento da fatura: inteiro de 1 a 31, ou 0 quando não informado.
export function parseDueDay(v) {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 31 ? n : 0;
}
export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

// Fatura do cartão: as compras do mês M vencem no dia de vencimento do mês M+1
// (ex.: compras de outubro, vencimento dia 8 → fatura vence em 8 de novembro).
// A fatura é identificada (e marcada como paga) pelo mês das compras.
export function invoiceDueDate(card, purchaseMonth) {
  if (!card.dueDay) return null;
  const dueMonth = shiftMonth(purchaseMonth, 1);
  const [y, m] = dueMonth.split('-').map(Number);
  return `${dueMonth}-${String(Math.min(card.dueDay, daysInMonth(y, m - 1))).padStart(2, '0')}`;
}
// Situação da fatura das compras de `purchaseMonth`, para mostrar no cartão.
export function invoiceInfo(card, purchaseMonth, amount) {
  const date = invoiceDueDate(card, purchaseMonth);
  const paid = isInvoicePaid(card, purchaseMonth);
  if (paid && amount > 0) return { date, paid, status: 'paid', text: 'Fatura paga', urgent: false };
  if (!date) return null;
  const n = daysUntil(date);
  const ddmm = fmtDate(date);
  const text = n < 0 ? `Venceu ${ddmm}` : n === 0 ? 'Vence hoje' : n === 1 ? 'Vence amanhã'
    : n <= 31 ? `Vence ${ddmm} · em ${n} dias` : `Vence ${ddmm}`;
  const status = amount > 0 ? entryStatus(false, date) : null;
  return { date, paid, status, text, urgent: amount > 0 && (status === 'overdue' || (n >= 0 && n <= 3)) };
}

export const sumAmounts = list => list.reduce((s, t) => s + Number(t.amount || 0), 0);

// Texto da confirmação de exclusão: avisa quantos lançamentos vão junto.
export function entriesNote(n) {
  return n === 0 ? '' : n === 1 ? ' e 1 lançamento' : ` e ${n} lançamentos`;
}

// Contas que vencem no mês: a fatura de cada cartão (compras do mês anterior,
// ver invoiceDueDate) e cada gasto fora do cartão. `inScope` filtra por pessoa.
// Com `includeEmptyInvoices`, entram também as faturas sem gasto (para o calendário).
export function buildMonthBills({ cards, cardTransactions, otherExpenses }, month, inScope, includeEmptyInvoices = false) {
  const purchaseMonth = shiftMonth(month, -1);
  const bills = [
    ...cards.map(c => {
      const date = invoiceDueDate(c, purchaseMonth);
      const amount = sumAmounts(cardTransactions.filter(t => t.cardId === c.id && matchesMonth(t, purchaseMonth) && inScope(t)));
      const paid = isInvoicePaid(c, purchaseMonth);
      return {
        kind: 'card', id: `card-${c.id}`, refId: c.id, invoiceMonth: purchaseMonth, title: `Fatura ${c.name}`,
        tag: `compras de ${MONTH_NAMES_PT[Number(purchaseMonth.slice(5, 7)) - 1]}`,
        day: date ? Number(date.slice(8, 10)) : null, amount, paid,
        status: amount > 0 ? entryStatus(paid, date) : null,
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
