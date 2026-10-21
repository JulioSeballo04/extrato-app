// Planilha Excel (.xlsx) do espaço, organizada em abas: Lançamentos, Resumo
// por mês, Por categoria e Cartões. A biblioteca (exceljs) só é carregada
// quando a pessoa pede a planilha.

import {
  DEFAULT_CATEGORY, currentMonth, shiftMonth, monthLabel, capitalize, matchesMonth, isRecurring, isPaidIn, isInvoicePaid,
  dueDateIn, entryStatus, invoiceKeyOf, entryInInvoice, invoiceDueDate, isPayee, sumAmounts, methodLabel, DEFAULT_GROUP,
} from './ledger';

const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const STATUS = { paid: 'Paga', pending: 'A pagar', overdue: 'Vencida' };
const monthName = m => capitalize(monthLabel(m));
const toDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

// Meses que aparecem nos dados (até o mês atual, para os fixos).
function monthRange(entries) {
  const months = entries.map(t => t.date.slice(0, 7));
  if (months.length === 0) return [];
  let first = months.reduce((a, b) => (a < b ? a : b));
  const last = [...months, currentMonth()].reduce((a, b) => (a > b ? a : b));
  const out = [];
  for (let m = first; m <= last; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

// Uma linha por lançamento; um fixo vira uma linha por mês em que vale.
function rows({ people, cards, cardTransactions, otherExpenses, expenseGroups = [] }, visibilityLabel) {
  // Nome da lista; gasto sem lista (ou de lista apagada) fica na lista padrão.
  const defaultName = expenseGroups.find(g => g.id === DEFAULT_GROUP)?.name || 'Outros gastos';
  const groupName = id => expenseGroups.find(g => g.id === id && id !== DEFAULT_GROUP)?.name || defaultName;
  const personName = id => people.find(p => p.id === id)?.name || '';
  const all = [...cardTransactions, ...otherExpenses];
  const months = monthRange(all);
  const out = [];
  const add = (t, date, month) => {
    const card = t.cardId && cards.find(c => c.id === t.cardId);
    let where = 'Fora do cartão';
    let list = '';
    let method = 'Crédito';
    let paid;
    let status;
    let invoice = '';
    if (card) {
      where = isPayee(card) ? `Devo para ${card.name}` : `Cartão ${card.name}`;
      if (isPayee(card)) method = 'Devo a pessoa';
      const key = invoiceKeyOf(card, date);
      paid = t.paid || isInvoicePaid(card, key);
      status = paid ? 'paid' : entryStatus(false, invoiceDueDate(card, key));
      invoice = monthName(key);
    } else {
      list = groupName(t.groupId);
      method = methodLabel(t.method) || 'Não informada';
      paid = isPaidIn(t, month);
      status = entryStatus(paid, date);
    }
    const kind = t.installmentTotal > 1 ? `Parcela ${t.installmentNumber}/${t.installmentTotal}` : isRecurring(t) ? 'Fixo' : 'Avulso';
    out.push({
      date: toDate(date), month: monthName(date.slice(0, 7)), person: personName(t.personId), description: t.description,
      category: t.category || DEFAULT_CATEGORY, where, list, method, invoice, kind, amount: Number(t.amount) || 0, status: STATUS[status],
      split: t.splitCount ? `Dividido em ${t.splitCount}` : '', hidden: visibilityLabel?.(t) || '',
      _month: date.slice(0, 7), _card: card && !isPayee(card) ? card.name : '', _personId: t.personId,
    });
  };
  for (const t of all) {
    if (isRecurring(t)) for (const m of months) { if (matchesMonth(t, m)) add(t, dueDateIn(t, m), m); }
    else add(t, t.date, t.date.slice(0, 7));
  }
  return { list: out.sort((a, b) => a.date - b.date), months };
}

function styleHeader(sheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function totalRow(sheet, label, firstValueCol) {
  const last = sheet.rowCount;
  const row = sheet.addRow([]);
  row.getCell(1).value = label;
  for (let c = firstValueCol; c <= sheet.columnCount; c++) {
    const col = sheet.getColumn(c).letter;
    row.getCell(c).value = { formula: `SUM(${col}2:${col}${last})` };
    row.getCell(c).numFmt = BRL;
  }
  row.font = { bold: true };
  row.border = { top: { style: 'thin' } };
}

export async function downloadSpaceWorkbook(data, spaceName, visibilityLabel) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestor de Gastos';
  const { list, months } = rows(data, visibilityLabel);
  const realCards = data.cards.filter(c => !isPayee(c));

  // 1. Lançamentos
  const s1 = wb.addWorksheet('Lançamentos');
  s1.columns = [
    { header: 'Data', key: 'date', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Mês', key: 'month', width: 16 },
    { header: 'Pessoa', key: 'person', width: 14 },
    { header: 'Descrição', key: 'description', width: 30 },
    { header: 'Categoria', key: 'category', width: 15 },
    { header: 'Onde', key: 'where', width: 22 },
    { header: 'Forma de pagamento', key: 'method', width: 19 },
    { header: 'Lista', key: 'list', width: 16 },
    { header: 'Fatura', key: 'invoice', width: 16 },
    { header: 'Tipo', key: 'kind', width: 14 },
    { header: 'Situação', key: 'status', width: 11 },
    { header: 'Dividido', key: 'split', width: 12 },
    { header: 'Oculto de', key: 'hidden', width: 18 },
    { header: 'Valor', key: 'amount', width: 14, style: { numFmt: BRL } },
  ];
  list.forEach(r => {
    const row = s1.addRow(r);
    const color = { Vencida: 'FFC0392B', Paga: 'FF2E7D4F' }[r.status];
    if (color) row.getCell('status').font = { color: { argb: color }, bold: true };
  });
  styleHeader(s1);
  s1.autoFilter = { from: 'A1', to: { row: 1, column: s1.columnCount } };
  totalRow(s1, 'Total', s1.columnCount);

  // 2. Resumo por mês (compras do mês)
  const people = data.people;
  const s2 = wb.addWorksheet('Resumo por mês');
  s2.columns = [
    { header: 'Mês', key: 'month', width: 16 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: BRL } },
    { header: 'No cartão', key: 'card', width: 14, style: { numFmt: BRL } },
    { header: 'Fora do cartão / pessoas', key: 'other', width: 22, style: { numFmt: BRL } },
    ...people.map(p => ({ header: p.name, key: `p_${p.id}`, width: 14, style: { numFmt: BRL } })),
  ];
  for (const m of months) {
    const inMonth = list.filter(r => r._month === m);
    if (inMonth.length === 0) continue;
    const card = sumAmounts(inMonth.filter(r => r._card).map(r => ({ amount: r.amount })));
    const total = sumAmounts(inMonth.map(r => ({ amount: r.amount })));
    s2.addRow({
      month: monthName(m), total, card, other: total - card,
      ...Object.fromEntries(people.map(p => [`p_${p.id}`, sumAmounts(inMonth.filter(r => r._personId === p.id).map(r => ({ amount: r.amount })))])),
    });
  }
  styleHeader(s2);
  totalRow(s2, 'Total', 2);

  // 3. Por categoria (linhas) x mês (colunas)
  const s3 = wb.addWorksheet('Por categoria');
  const usedMonths = months.filter(m => list.some(r => r._month === m));
  s3.columns = [
    { header: 'Categoria', key: 'category', width: 18 },
    ...usedMonths.map(m => ({ header: monthName(m), key: m, width: 15, style: { numFmt: BRL } })),
    { header: 'Total', key: 'total', width: 15, style: { numFmt: BRL } },
  ];
  const categories = [...new Set(list.map(r => r.category))].sort();
  for (const cat of categories) {
    const byMonth = Object.fromEntries(usedMonths.map(m => [m, sumAmounts(list.filter(r => r.category === cat && r._month === m).map(r => ({ amount: r.amount })))]));
    s3.addRow({ category: cat, ...byMonth, total: Object.values(byMonth).reduce((a, b) => a + b, 0) });
  }
  styleHeader(s3);
  totalRow(s3, 'Total', 2);

  // 4. Cartões: fatura de cada mês
  const s4 = wb.addWorksheet('Cartões');
  s4.columns = [
    { header: 'Cartão', key: 'card', width: 16 },
    { header: 'Fatura', key: 'month', width: 16 },
    { header: 'Vencimento', key: 'due', width: 13, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Situação', key: 'status', width: 11 },
    { header: 'Limite', key: 'limit', width: 14, style: { numFmt: BRL } },
    { header: 'Valor da fatura', key: 'amount', width: 16, style: { numFmt: BRL } },
  ];
  for (const c of realCards) {
    for (const m of months) {
      const amount = sumAmounts(data.cardTransactions.filter(t => entryInInvoice(c, t, m)));
      if (!amount) continue;
      const due = invoiceDueDate(c, m);
      const paid = isInvoicePaid(c, m);
      const row = s4.addRow({
        card: c.name, month: monthName(m), due: due ? toDate(due) : null,
        status: STATUS[paid ? 'paid' : entryStatus(false, due)], limit: Number(c.limitValue) || null, amount,
      });
      const color = { Vencida: 'FFC0392B', Paga: 'FF2E7D4F' }[row.getCell('status').value];
      if (color) row.getCell('status').font = { color: { argb: color }, bold: true };
    }
  }
  styleHeader(s4);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = String(spaceName || 'espaco').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase();
  const d = new Date();
  a.href = url;
  a.download = `gastos-${safeName}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
