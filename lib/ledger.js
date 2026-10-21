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
  // Só pontos separando grupos de 3 dígitos: é milhar ("1.234" = mil duzentos e trinta e quatro).
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
// Número → texto do campo de valor ("1.234,50"); zero vira campo vazio.
export function amountInput(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return n ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
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
// Um fixo vale do mês em que começou até `endMonth` (inclusive), se houver.
export function matchesMonth(item, month) {
  if (!item?.date || !month) return false;
  const itemMonth = item.date.slice(0, 7);
  if (itemMonth === month) return true;
  return isRecurring(item) && itemMonth < month && (!item.endMonth || month <= item.endMonth);
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

// "Cartão" do tipo pessoa a pagar (ex.: a mãe, quando se usa o cartão dela).
export function isPayee(card) {
  return card?.kind === 'payee';
}

// Fatura do cartão: as compras do mês M vencem no dia de vencimento do mês M+1
// (ex.: compras de outubro, vencimento dia 8 → fatura vence em 8 de novembro).
// Pessoa a pagar: acerta no próprio mês, no dia combinado.
// A fatura é identificada (e marcada como paga) pelo mês das compras.
export function invoiceDueDate(card, purchaseMonth) {
  if (!card.dueDay) return null;
  const dueMonth = isPayee(card) ? purchaseMonth : shiftMonth(purchaseMonth, 1);
  const [y, m] = dueMonth.split('-').map(Number);
  return `${dueMonth}-${String(Math.min(card.dueDay, daysInMonth(y, m - 1))).padStart(2, '0')}`;
}
// Situação da fatura das compras de `purchaseMonth`, para mostrar no cartão.
export function invoiceInfo(card, purchaseMonth, amount) {
  const date = invoiceDueDate(card, purchaseMonth);
  const paid = isInvoicePaid(card, purchaseMonth);
  if (paid && amount > 0) return { date, paid, status: 'paid', text: isPayee(card) ? 'Pago' : 'Fatura paga', urgent: false };
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
  const bills = [
    ...cards.map(c => {
      const payee = isPayee(c);
      // Cartão: fatura com as compras do mês anterior. Pessoa: o que se deve no próprio mês.
      const purchaseMonth = payee ? month : shiftMonth(month, -1);
      const date = invoiceDueDate(c, purchaseMonth);
      const amount = sumAmounts(cardTransactions.filter(t => entryInInvoice(c, t, purchaseMonth) && inScope(t)));
      const paid = isInvoicePaid(c, purchaseMonth);
      return {
        kind: 'card', payee, id: `card-${c.id}`, refId: c.id, invoiceMonth: purchaseMonth,
        title: payee ? `Pagar ${c.name}` : `Fatura ${c.name}`,
        tag: payee ? null : `compras de ${MONTH_NAMES_PT[Number(purchaseMonth.slice(5, 7)) - 1]}`,
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

// Divide um valor em `n` partes de centavos inteiros que somam exatamente o total
// (R$ 100 em 3x → 33,34 + 33,33 + 33,33). Os centavos que sobram vão para as primeiras.
export function splitAmount(total, n) {
  const cents = Math.round((Number(total) || 0) * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rest ? 1 : 0)) / 100);
}

// Divide um valor na proporção de `weights`, em centavos inteiros que somam
// exatamente o total (os que sobram vão para as maiores frações). Sem pesos, igual.
export function splitByWeights(total, weights) {
  const cents = Math.round((Number(total) || 0) * 100);
  const w = weights.map(x => Math.max(0, Number(x) || 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return splitAmount(total, weights.length);
  const raw = w.map(x => (cents * x) / sum);
  const out = raw.map(Math.floor);
  let rest = cents - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0; k++, rest--) out[order[k % order.length][1]]++;
  return out.map(c => c / 100);
}

// Como fica uma compra: a parte de cada pessoa (`shares` informadas ou partes
// iguais), quanto de cada parte já saiu na entrada (na mesma proporção) e o
// resto de cada uma em parcelas (`parts[pessoa][parcela]`).
export function purchasePlan({ amount, people = 1, shares, installments = 1, down = 0 }) {
  const toCents = v => Math.round((Number(v) || 0) * 100);
  const own = shares?.length ? shares : splitAmount(amount, people);
  const downShares = toCents(down) > 0 ? splitByWeights(down, own) : own.map(() => 0);
  const restShares = own.map((s, i) => (toCents(s) - toCents(downShares[i])) / 100);
  return { shares: own, downShares, restShares, parts: restShares.map(r => splitAmount(r, installments)) };
}

// Ao editar ou apagar um lançamento que faz parte de algo maior, a quem a
// mudança vale. Devolve [] quando não há o que perguntar (lançamento avulso).
//  - fixo visto depois do mês em que começou: "a partir deste mês" ou "todos os meses"
//  - parcela: "só esta", "esta e as próximas" ou "a compra inteira"
//  - compra dividida sem parcelas: "só esta parte" ou "todas as partes"
export function changeScopes(item, month, action) {
  const startMonth = item.date.slice(0, 7);
  const monthName = MONTH_NAMES_PT[Number(month.slice(5, 7)) - 1];
  if (isRecurring(item) && month > startMonth) {
    return action === 'delete'
      ? [{ key: 'from', label: `Encerrar a partir de ${monthName}` }, { key: 'all', label: 'Apagar de todos os meses' }]
      : [{ key: 'from', label: `A partir de ${monthName}` }, { key: 'all', label: 'Todos os meses' }];
  }
  if (item.installmentGroupId || item.installmentTotal > 1) {
    const scopes = [{ key: 'one', label: 'Só esta parcela' }];
    if (item.installmentNumber < item.installmentTotal) scopes.push({ key: 'next', label: 'Esta e as próximas' });
    scopes.push({ key: 'all', label: 'A compra inteira' });
    return scopes;
  }
  if (item.splitGroupId) return [{ key: 'one', label: 'Só esta parte' }, { key: 'all', label: 'Todas as partes' }];
  return [];
}

// Lançamentos atingidos por uma mudança com o alcance escolhido (ver changeScopes).
// Parcelas de compras antigas (de versões do app sem installmentGroupId): são
// reconhecidas pelos dados — mesma descrição, cartão/lista, nº de parcelas,
// pessoa (ou divisão) e mês em que a compra começou.
function sameLegacyPurchase(x, item) {
  return !x.installmentGroupId && x.installmentTotal > 1 && x.installmentTotal === item.installmentTotal
    && x.description === item.description && (x.cardId || '') === (item.cardId || '') && (x.groupId || '') === (item.groupId || '')
    && purchaseStartDate(x).slice(0, 7) === purchaseStartDate(item).slice(0, 7)
    && (item.splitGroupId ? x.splitGroupId === item.splitGroupId : x.personId === item.personId);
}

export function entriesInScope(list, item, scope) {
  const legacy = !item.installmentGroupId && item.installmentTotal > 1;
  if (scope === 'next') {
    if (legacy) return list.filter(x => sameLegacyPurchase(x, item) && x.installmentNumber >= item.installmentNumber);
    return list.filter(x => x.installmentGroupId === item.installmentGroupId && x.installmentNumber >= item.installmentNumber);
  }
  if (scope === 'all' && legacy) {
    return list.filter(x => sameLegacyPurchase(x, item) || (item.splitGroupId && x.splitGroupId === item.splitGroupId));
  }
  if (scope === 'all' && (item.installmentGroupId || item.splitGroupId)) {
    return list.filter(x => (item.installmentGroupId && x.installmentGroupId === item.installmentGroupId)
      || (item.splitGroupId && x.splitGroupId === item.splitGroupId));
  }
  return [item];
}

// Texto do campo de dinheiro enquanto a pessoa digita, como numa calculadora:
// os dígitos são reais (5000 → "5.000"); a vírgula (ou o ponto) começa os
// centavos (12,5 → "12,5"), no máximo 2. Ao sair do campo, moneyOnBlur completa
// para "5.000,00". Texto vindo de colar/ditado é lido como número.
export function moneyTyping(prev, raw) {
  const prevText = prev || '';
  let text = String(raw ?? '');
  // Ponto digitado no fim vira vírgula (teclados que só têm ponto).
  if (text.length === prevText.length + 1 && text.startsWith(prevText) && text.endsWith('.')) text = `${text.slice(0, -1)},`;
  // Colado/ditado inteiro (não é digitação no fim): lê como número.
  if (text.length > prevText.length + 1 && !text.startsWith(prevText)) {
    const n = Math.abs(parseAmount(text));
    return n ? amountInput(n) : '';
  }
  const comma = text.indexOf(',');
  const intDigits = (comma >= 0 ? text.slice(0, comma) : text).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
  if (comma < 0) return intDigits ? Number(intDigits).toLocaleString('pt-BR') : '';
  const cents = text.slice(comma + 1).replace(/\D/g, '').slice(0, 2);
  return `${Number(intDigits || '0').toLocaleString('pt-BR')},${cents}`;
}
// Ao sair do campo: "5.000" → "5.000,00"; "12,5" → "12,50"; vazio continua vazio.
export function moneyOnBlur(text) {
  const n = parseAmount(text);
  return n ? amountInput(n) : '';
}

// Limite do cartão como no banco: uma compra parcelada ocupa o limite pelo
// total, e cada fatura paga libera a sua parte. Conta como "em aberto" toda
// fatura que ainda não foi marcada como paga E ainda não venceu (a fatura das
// compras do mês M vence no mês M+1). Faturas já vencidas contam como pagas,
// para o limite não aparecer estourado por esquecimento de marcar.
// Um gasto fixo no cartão conta só nas faturas abertas até o mês atual (não
// ocupa limite de meses futuros). Devolve { used, available, future, pct, over }.
export function cardLimitUsage(card, cardTransactions, today = todayStr()) {
  const limit = Number(card.limitValue) || 0;
  const thisMonth = today.slice(0, 7);
  const dueOf = month => {
    const d = invoiceDueDate(card, month);
    if (d) return d;
    // Sem dia de vencimento: considera o último dia do mês seguinte.
    const next = shiftMonth(month, 1);
    const [y, m] = next.split('-').map(Number);
    return `${next}-${String(daysInMonth(y, m - 1)).padStart(2, '0')}`;
  };
  const open = month => !isInvoicePaid(card, month) && dueOf(month) >= today;
  let used = 0;
  let future = 0; // parte do usado que é de faturas de meses seguintes (parcelas a vir)
  for (const t of cardTransactions) {
    if (t.cardId !== card.id) continue;
    const amount = Number(t.amount || 0);
    if (isRecurring(t)) {
      // Fixo: conta as cobranças que caem em faturas abertas até a fatura atual.
      // Inclui a do mês seguinte quando ela entra na fatura atual (ex.: cobrança
      // no dia 1 num cartão que fecha no dia 5 — a de 01/11 está na fatura que
      // fecha em 05/11). Faturas futuras de fixos ainda não ocupam limite.
      const currentKey = invoiceKeyOf(card, today);
      for (const month of [shiftMonth(thisMonth, -1), thisMonth, shiftMonth(thisMonth, 1)]) {
        if (!matchesMonth(t, month)) continue;
        const key = invoiceKeyOf(card, dueDateIn(t, month));
        if (key <= currentKey && open(key)) used += amount;
      }
      continue;
    }
    const month = invoiceKeyOf(card, t.date);
    // Só a fatura decide: parcelas marcadas como "pagas" uma a uma (versão antiga
    // do app) continuam ocupando o limite enquanto a fatura delas estiver aberta.
    if (!open(month)) continue;
    used += amount;
    if (month > thisMonth) future += amount;
  }
  used = Math.round(used * 100) / 100;
  return {
    used,
    future: Math.round(future * 100) / 100,
    available: Math.round((limit - used) * 100) / 100,
    pct: limit > 0 ? Math.min(100, (used / limit) * 100) : 0,
    over: limit > 0 && used > limit,
  };
}

// ---------------------------------------------------------------------------
// Fatura do cartão com dia de fechamento.
// Cada fatura é identificada pelo "mês da fatura" K (a mesma chave de
// paidInvoices) e vence no dia de vencimento do mês K+1 (ver invoiceDueDate).
// Sem dia de fechamento: a fatura K tem as compras do mês K (como sempre foi).
// Com fechamento no dia C: a fatura fecha no dia C (do mês K+1 se C < vencimento,
// senão do mês K) e compras feitas a partir do fechamento vão para a seguinte.
export function invoiceKeyOf(card, dateStr) {
  const month = dateStr.slice(0, 7);
  const close = Number(card?.closeDay) || 0;
  if (!close || isPayee(card)) return month;
  const [y, m] = month.split('-').map(Number);
  const day = Number(dateStr.slice(8, 10)) || 1;
  const closeInMonth = Math.min(close, daysInMonth(y, m - 1));
  const due = Number(card.dueDay) || 0;
  if (due && close < due) return day < closeInMonth ? shiftMonth(month, -1) : month;
  return day < closeInMonth ? month : shiftMonth(month, 1);
}

// O lançamento entra na fatura K deste cartão? (Fixo: a cobrança de cada mês.)
export function entryInInvoice(card, t, key) {
  if (t.cardId !== card.id) return false;
  if (!isRecurring(t)) return invoiceKeyOf(card, t.date) === key;
  return [shiftMonth(key, -1), key, shiftMonth(key, 1)].some(m => matchesMonth(t, m) && invoiceKeyOf(card, dueDateIn(t, m)) === key);
}

// Dia em que a fatura K fecha (para mostrar), ou null sem dia de fechamento.
export function invoiceCloseDate(card, key) {
  const close = Number(card?.closeDay) || 0;
  if (!close) return null;
  const due = Number(card.dueDay) || 0;
  const month = due && close < due ? shiftMonth(key, 1) : key;
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(Math.min(close, daysInMonth(y, m - 1))).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Gastos fora do cartão: forma de pagamento e lista (ex.: "Outros gastos", "Casa").
export const PAYMENT_METHODS = [
  { key: 'pix', label: 'Pix' },
  { key: 'debito', label: 'Débito' },
  { key: 'boleto', label: 'Boleto' },
  { key: 'dinheiro', label: 'Dinheiro' },
  { key: 'transferencia', label: 'Transferência' },
];
export const methodLabel = key => PAYMENT_METHODS.find(m => m.key === key)?.label || null;

// Lista padrão: os gastos sem lista (e os de uma lista apagada) ficam nela.
export const DEFAULT_GROUP = 'default';
export const groupOf = (e, groupIds) => (e.groupId && e.groupId !== DEFAULT_GROUP && (!groupIds || groupIds.has(e.groupId)) ? e.groupId : DEFAULT_GROUP);

// "Onde" no formulário: id do cartão, ou 'outside' / 'outside:<lista>' para fora do cartão.
export const outsideTarget = groupId => (groupId && groupId !== DEFAULT_GROUP ? `outside:${groupId}` : 'outside');
export function parseTarget(target) {
  if (target === 'outside' || String(target).startsWith('outside:')) {
    return { outside: true, groupId: String(target).split(':')[1] || DEFAULT_GROUP };
  }
  return { outside: false, cardId: target };
}

// Data em que a compra começou: a da parcela menos as parcelas anteriores
// (a 3/10 de 10/12 começou em 10/10). Avulso e fixo: a própria data.
export function purchaseStartDate(t) {
  const n = Number(t.installmentNumber) || 1;
  return t.installmentTotal > 1 && n > 1 ? monthsLaterDate(t.date, -(n - 1)) : t.date;
}

// Ordem da lista do cartão: compra mais recente primeiro (uma 1/9 de agora
// antes de uma 2/3 do mês passado), fixos no fim; empate pela data e descrição.
export function byRecentPurchase(a, b) {
  // Gastos fixos (assinatura, consórcio) sempre no fim da lista.
  if (isRecurring(a) !== isRecurring(b)) return isRecurring(a) ? 1 : -1;
  const pa = purchaseStartDate(a);
  const pb = purchaseStartDate(b);
  if (pa !== pb) return pa < pb ? 1 : -1;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return String(a.description).localeCompare(String(b.description), 'pt-BR');
}
