'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Users, Link2, Eye, SlidersHorizontal, ListChecks, UserRound, LayoutDashboard, CreditCard, CalendarDays, Receipt, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { spaceStore, subscribeSpaceData, newId, spaceDisplayName } from '../lib/spaces';
import { readPendingInvite, clearPendingInvite } from '../lib/invite';
import { BRAND } from '../lib/brand';
import { PALETTES, AUTO_PALETTE, DEFAULT_PALETTE, resolvePaletteKey, paletteVars, writeCachedPalette, systemPrefersDark } from '../lib/theme';
import {
  DEFAULT_CATEGORY, money, monthLabel, capitalize, currentMonth, shiftMonth, monthsLaterDate, isRecurring, isPaidIn,
  isInvoicePaid, parseDueDay, sumAmounts, buildMonthBills, isPayee, DEFAULT_GROUP, groupOf, parseTarget, methodLabel, splitAmount, splitByWeights, purchasePlan, entriesInScope, dueDateIn, entryInMonth, cardFinder, entryMonthOf, invoiceName,
} from '../lib/ledger';
import { APP_CSS } from './appStyles';
import { Toast } from './ui';
import { useInstallUi } from './InstallPrompt';
import SpacePanel from './SpacePanel';
import AccountPanel from './AccountPanel';
import CustomizePanel, { DEFAULT_VISIBLE } from './CustomizePanel';
import PeopleSection from './sections/People';
import CardsSection from './sections/Cards';
import OtherExpensesSection, { NewGroupButton } from './sections/OtherExpenses';
import { PaymentsSection } from './sections/Payments';
import { EntryForm, PersonChip } from './sections/Entries';
import { CalendarSection, BillsPanel } from './sections/Calendar';
import { CategorySummarySection, SummarySection, ReportSection } from './sections/Reports';
import { Onboarding, WhoAreYou } from './sections/Overview';

const VISIBLE_SECTIONS_KEY = 'gestor-de-gastos:secoes-visiveis';
const EMPTY_DATA = { people: [], cards: [], cardTransactions: [], otherExpenses: [], expenseGroups: [] };
const SAVE_ERROR_TOAST = {
  tone: 'error', persistent: true,
  text: 'Não consegui salvar ou sincronizar agora. Verifique sua conexão.',
  action: { label: 'Recarregar', run: () => window.location.reload() },
};

// Mostra os dados do espaço ativo (ver lib/spaces.js). Cada alteração grava só
// o item mexido; o Firestore já reflete a mudança na tela na hora (e desfaz
// sozinho se a gravação for negada), então não há estado local para salvar.
export default function ExtratoApp({ spacesApi }) {
  const { user, logout } = useAuth();
  const { active: space, role, spaces, profile } = spacesApi;
  const spaceId = space?.id;
  const readOnly = role === 'viewer';

  const [openPanel, setOpenPanel] = useState(null); // 'space' | 'account' | 'customize' | 'bills' | null
  const [visible, setVisible] = useState(DEFAULT_VISIBLE);
  // 'loading' até chegarem os dados do espaço; 'failed' se a leitura falhar.
  const [syncState, setSyncState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [data, setData] = useState(EMPTY_DATA);
  const [filterPerson, setFilterPerson] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [expandedCard, setExpandedCard] = useState(null);
  const [toast, setToast] = useState(null);
  const [entryForm, setEntryForm] = useState(null); // { target } com o formulário de novo gasto aberto
  const [peopleFormOpen, setPeopleFormOpen] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(true);
  const [activeNav, setActiveNav] = useState('top');
  const installUi = useInstallUi(); // aviso de instalar o app + setinha no topo
  const { people, cards, cardTransactions, otherExpenses, expenseGroups = [] } = data;
  // Listas de gastos fora do cartão: a padrão ("Outros gastos", renomeável) + as criadas.
  const groups = [
    { id: DEFAULT_GROUP, name: expenseGroups.find(g => g.id === DEFAULT_GROUP)?.name || 'Outros gastos', order: 0 },
    ...expenseGroups.filter(g => g.id !== DEFAULT_GROUP),
  ];
  const groupIds = new Set(groups.map(g => g.id));
  // Ocultos (ex.: presente): o store manda cada um para hiddenEntries sozinho.
  const hiddenIds = new Set([...cardTransactions, ...otherExpenses].filter(x => x.visibleTo?.length).map(x => x.id));
  const store = spaceId ? spaceStore(spaceId, hiddenIds) : null;

  const paletteChoice = profile.paletteKey === AUTO_PALETTE || PALETTES[profile.paletteKey] ? profile.paletteKey : DEFAULT_PALETTE;
  const pal = PALETTES[resolvePaletteKey(paletteChoice, systemDark)];

  // Preferência de quais seções mostrar: fica só neste aparelho (localStorage).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_SECTIONS_KEY);
      if (raw) setVisible({ ...DEFAULT_VISIBLE, ...JSON.parse(raw) });
    } catch { /* sem localStorage: usa o padrão */ }
  }, []);
  function changeVisible(next) {
    setVisible(next);
    try { localStorage.setItem(VISIBLE_SECTIONS_KEY, JSON.stringify(next)); } catch { /* ignora */ }
  }
  const show = key => visible[key] !== false;
  function togglePanel(name) {
    setOpenPanel(p => (p === name ? null : name));
  }

  // Tema "Automático" acompanha o claro/escuro do aparelho.
  useEffect(() => {
    setSystemDark(systemPrefersDark());
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = e => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Barra de status do celular (e do app instalado) na cor de fundo da paleta.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', pal.bg);
    document.body.style.background = pal.bg;
    writeCachedPalette(paletteChoice);
  }, [pal.bg, paletteChoice]);

  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!spaceId) return undefined;
    loadedOnce.current = false;
    setSyncState('loading');
    setData(EMPTY_DATA);
    setFilterPerson('all');
    setExpandedCard(null);
    return subscribeSpaceData(
      spaceId, user?.uid,
      (next) => { loadedOnce.current = true; setData(next); clearErrorToast(); setSyncState('ready'); },
      // Já carregou antes: os dados na tela valem, só avisa. Senão, tela de erro.
      () => { if (loadedOnce.current) setToast(SAVE_ERROR_TOAST); else setSyncState('failed'); },
    );
  }, [spaceId, retryCount]);

  const invitePending = useRef(false);
  useEffect(() => {
    if (syncState !== 'ready' || invitePending.current) return;
    const code = readPendingInvite();
    if (!code) return;
    invitePending.current = true;
    clearPendingInvite();
    spacesApi.joinWithCode(code).then(
      name => setToast({ text: `Você entrou em “${name}”.` }),
      err => setToast({
        tone: 'error',
        text: {
          'invite-not-found': 'Esse convite não existe mais (cada um vale uma vez só). Peça um novo.',
          'invite-expired': 'Esse convite expirou. Peça um novo para quem convidou.',
          'already-member': 'Você já participa desse espaço.',
        }[err?.code] || 'Não consegui usar o convite. Tente de novo pelo código em Compartilhar.',
      }),
    );
  }, [syncState]);

  function retryLoad() {
    setSyncState('loading');
    setRetryCount(n => n + 1);
  }
  function clearErrorToast() {
    setToast(t => (t?.tone === 'error' ? null : t));
  }

  // Dispara a gravação sem esperar: a tela já mostra o resultado. Se falhar,
  // avisa (o Firestore desfaz a mudança local sozinho).
  function write(promise) {
    promise.then(clearErrorToast, () => setToast(SAVE_ERROR_TOAST));
  }

  // Barra de atalhos do celular: marca a seção que está na tela.
  useEffect(() => {
    if (syncState !== 'ready') return undefined;
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.35;
        let current = 'top';
        for (const el of document.querySelectorAll('[data-nav]')) {
          if (el.getBoundingClientRect().top <= line) current = el.dataset.nav;
        }
        setActiveNav(current);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [syncState]);

  function scrollToSection(id) {
    if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // "No cartão" conta só cartões; o que se deve a pessoas entra em "outros".
  const payeeIds = new Set(cards.filter(isPayee).map(c => c.id));
  // No cartão, o gasto do mês é a fatura (respeita o dia de fechamento).
  const cardOf = cardFinder(cards);
  function personTotal(personId, month) {
    const mine = t => t.personId === personId && (!month || entryInMonth(t, month, cardOf));
    const cardSum = sumAmounts(cardTransactions.filter(t => mine(t) && !payeeIds.has(t.cardId)));
    const otherSum = sumAmounts(otherExpenses.filter(mine)) + sumAmounts(cardTransactions.filter(t => mine(t) && payeeIds.has(t.cardId)));
    return { cardSum, otherSum, total: cardSum + otherSum };
  }
  const availableMonths = Array.from(new Set([
    selectedMonth,
    currentMonth(),
    ...cardTransactions.map(t => t.date && entryMonthOf(cardOf(t.cardId), t.date)),
    ...otherExpenses.map(t => t.date && t.date.slice(0, 7)),
  ].filter(Boolean))).sort();

  // Conta ↔ pessoa: qual pessoa da lista é quem está usando o app.
  const myPerson = people.find(p => p.uid === user?.uid) || null;
  // O topo (resumo e contas do mês) mostra só os gastos de quem usa o app: você
  // e quem entrou no espaço pelo código (pessoas ligadas a um membro). As
  // pessoas só cadastradas (sem conta) ficam de fora; "Ver gastos de" filtra
  // as listas abaixo. Sem pessoa ligada à sua conta, vale a criada junto com a
  // conta ou a que tem o primeiro nome da conta.
  const firstName = (user?.displayName || '').trim().split(/\s+/)[0].toLowerCase();
  const me = myPerson || people.find(p => p.id === `p_${user?.uid}`)
    || (firstName ? people.find(p => p.name.trim().toLowerCase() === firstName) : null);
  const topIds = new Set([
    ...(me ? [me.id] : []),
    ...people.filter(p => p.uid && (space?.members || []).includes(p.uid)).map(p => p.id),
  ]);
  const inScope = t => topIds.size === 0 || topIds.has(t.personId);
  const monthBills = buildMonthBills(data, selectedMonth, inScope);
  const calendarBills = monthBills; // só contas com valor (sem faturas de R$ 0,00)
  function toggleBill(bill) {
    if (bill.kind === 'card') toggleInvoicePaid(bill.refId, bill.invoiceMonth);
    else toggleOtherExpensePaid(bill.refId, selectedMonth);
  }
  const billsPaidCount = monthBills.filter(b => b.paid).length;
  const billsOverdue = monthBills.filter(b => b.status === 'overdue').length;

  const scopePeople = topIds.size === 0 ? people : people.filter(p => topIds.has(p.id));

  function personName(id) {
    const p = people.find(p => p.id === id);
    return p ? p.name : '—';
  }
  function personColor(id) {
    const idx = people.findIndex(p => p.id === id);
    return pal.people[idx >= 0 ? idx % pal.people.length : 0];
  }
  const nextOrder = list => list.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1;
  // Quem lançou: só aparece em espaços com mais de um membro.
  function authorName(uid) {
    if (!uid || (space?.members?.length || 0) < 2) return null;
    if (uid === user?.uid) return 'você';
    return people.find(p => p.uid === uid)?.name || (space.labels?.[uid] || '').split('@')[0] || null;
  }
  // Outros membros do espaço (para "Esconder de…"), com o nome da pessoa ligada.
  const memberName = uid => people.find(p => p.uid === uid)?.name || (space?.labels?.[uid] || '').split('@')[0] || 'membro';
  const otherMembers = (space?.members || []).filter(u => u !== user?.uid).map(uid => ({ uid, label: memberName(uid) }));
  function visibilityLabel(item) {
    if (!item.visibleTo?.length) return null;
    const from = (space?.members || []).filter(u => !item.visibleTo.includes(u)).map(memberName);
    return from.length ? `Oculto de ${from.join(', ')}` : 'Oculto de membros novos';
  }
  const visibleToFor = hideFrom => (hideFrom?.length ? (space?.members || []).filter(u => !hideFrom.includes(u)) : null);

  const memberLabel = uid => (uid === user?.uid ? 'você' : (space?.labels?.[uid] || '').split('@')[0] || 'outro membro');
  function linkMeToPerson(personId) {
    const p = people.find(x => x.id === personId);
    if (!p) return;
    write(store.update('people', p, { uid: user.uid }));
    setToast({ text: `Pronto: você é “${p.name}” neste espaço.` });
  }
  function addMeAsPerson() {
    const name = (user?.displayName || user?.email || 'Eu').split('@')[0].split(' ')[0];
    write(store.set('people', newId(), { name, salary: 0, order: nextOrder(people), uid: user.uid }));
    setToast({ text: `Você entrou na lista como “${name}”. Dá para trocar o nome em Pessoas.` });
  }

  function addPerson(name, salary) {
    if (!name.trim()) return;
    write(store.set('people', newId(), { name, salary, order: nextOrder(people) }));
  }
  function removePerson(id) {
    write(store.removeMany([
      ['people', id],
      ...cardTransactions.filter(x => x.personId === id).map(x => ['cardTransactions', x.id]),
      ...otherExpenses.filter(x => x.personId === id).map(x => ['otherExpenses', x.id]),
    ]));
    // Quem dividia com essa pessoa: atualiza o "Dividido ÷N" (ou tira a divisão
    // se sobrou uma parte só). `set` regrava o lançamento inteiro sem os campos.
    for (const coll of ['cardTransactions', 'otherExpenses']) {
      const list = entriesOf(coll);
      const groups = new Set(list.filter(x => x.personId === id && x.splitGroupId).map(x => x.splitGroupId));
      for (const g of groups) {
        const rest = list.filter(x => x.splitGroupId === g && x.personId !== id);
        const people = new Set(rest.map(x => x.personId)).size;
        for (const x of rest) {
          if (people > 1) write(store.update(coll, x, { splitCount: people }));
          else {
            const { splitGroupId, splitCount, ...alone } = x;
            write(store.set(coll, x.id, alone));
          }
        }
      }
    }
    if (filterPerson === id) setFilterPerson('all');
  }
  function updateSalary(id, salary) {
    const p = people.find(x => x.id === id);
    if (p) write(store.update('people', p, { salary }));
  }
  // kind 'payee' = pessoa a quem se deve (ex.: a mãe); sem kind, é cartão.
  function addCard(name, limitValue, color, dueDay, kind, closeDay) {
    if (!name.trim()) return;
    write(store.set('cards', newId(), {
      name, limitValue, color, dueDay: parseDueDay(dueDay), closeDay: parseDueDay(closeDay), paidInvoices: [], order: nextOrder(cards),
      ...(kind === 'payee' ? { kind } : {}),
    }));
  }
  // Editar cartão: nome, limite, cor, vencimento e fechamento da fatura.
  function updateCard(id, patch) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    const clean = { ...patch };
    if ('dueDay' in clean) clean.dueDay = parseDueDay(clean.dueDay);
    if ('closeDay' in clean) clean.closeDay = parseDueDay(clean.closeDay);
    if ('name' in clean) clean.name = clean.name.trim() || c.name;
    write(store.update('cards', c, clean));
    setToast({ text: `${c.kind === 'payee' ? '' : 'Cartão '}“${clean.name || c.name}” atualizado.` });
  }
  function removeCard(id) {
    write(store.removeMany([
      ['cards', id],
      ...cardTransactions.filter(x => x.cardId === id).map(x => ['cardTransactions', x.id]),
    ]));
    setExpandedCard(e => (e === id ? null : e));
  }
  // Gera os lançamentos de uma compra: uma linha por parcela e por pessoa.
  function buildEntries(entry, extra) {
    const total = Math.max(1, Math.floor(Number(entry.installments)) || 1);
    const paidCount = Math.min(total, Math.max(0, Math.floor(Number(entry.paidInstallments)) || 0));
    const groupId = newId();
    // Divide o valor entre o responsável principal e quem mais estiver marcado
    // em "dividir com" (ex.: consórcio dividido com a namorada): em partes iguais
    // ou com o valor de cada um (`entry.shares`, na mesma ordem).
    const participants = [entry.personId, ...((entry.splitWith || []).filter(id => id && id !== entry.personId))];
    const splitGroupId = participants.length > 1 ? newId() : undefined;
    const own = entry.shares?.length === participants.length ? entry.shares : splitAmount(entry.amount, participants.length);
    // Centavos inteiros que somam exatamente o total: por pessoa e depois por parcela.
    const shares = own.map(share => splitAmount(share, total));
    // A data informada é a da PRÓXIMA parcela a vencer (nº paidCount+1).
    // As parcelas já pagas ficam com datas retroativas; as futuras seguem em frente a partir dela.
    return participants.flatMap((personId, p) =>
      Array.from({ length: total }, (_, i) => ({
        ...extra,
        id: newId(),
        personId,
        createdBy: user?.uid,
        description: entry.description.trim(),
        amount: shares[p][i],
        date: monthsLaterDate(entry.date, i - paidCount),
        fixed: total === 1 && !!entry.fixed,
        category: entry.category || DEFAULT_CATEGORY,
        installmentNumber: i + 1,
        installmentTotal: total,
        ...(total > 1 ? { installmentGroupId: groupId } : {}),
        ...(splitGroupId ? { splitGroupId, splitCount: participants.length } : {}),
        paid: i < paidCount,
      }))
    );
  }
  function submitEntry(cardId, entry) {
    if (!entry.description.trim() || !entry.personId) return;
    const visibleTo = visibleToFor(entry.hideFrom);
    const extra = visibleTo ? { visibleTo } : {};
    // Entrada (ex.: 30 no Pix de uma compra de 130): vira um gasto já pago fora
    // do cartão, dividido na mesma proporção; o resto segue para o cartão/lista.
    const down = Number(entry.down) > 0 && Number(entry.down) < entry.amount ? Number(entry.down) : 0;
    const plan = purchasePlan({ amount: entry.amount, people: 1 + (entry.splitWith || []).length, shares: entry.shares, down });
    const rest = { ...entry, amount: Math.round((entry.amount - down) * 100) / 100, shares: plan.restShares };
    if (cardId) write(store.setMany('cardTransactions', buildEntries(rest, { cardId, ...extra })));
    else write(store.setMany('otherExpenses', buildEntries(rest, { ...extra, groupId: entry.groupId || DEFAULT_GROUP, ...(entry.method ? { method: entry.method } : {}) })));
    if (down) {
      write(store.setMany('otherExpenses', buildEntries({
        ...entry, description: `${entry.description.trim()} (entrada)`, amount: down, shares: plan.downShares,
        fixed: false, installments: 1, paidInstallments: 0,
      }, { ...extra, groupId: DEFAULT_GROUP, ...(entry.downMethod ? { method: entry.downMethod } : {}) }).map(x => ({ ...x, paid: true }))));
    }
    setEntryForm(null);
    // No cartão, o mês segue a fatura (ex.: compra depois do fechamento vai para a seguinte).
    const card = cardId ? cardOf(cardId) : null;
    const entryMonth = entryMonthOf(card, entry.date);
    const what = down ? `Gasto lançado, com entrada de ${money(down)}` : 'Gasto lançado';
    const where = card && !isPayee(card) ? ` na fatura de ${invoiceName(card, entryMonth)} do ${card.name}` : '';
    setToast(entryMonth === selectedMonth
      ? { text: `${what}${where}.` }
      : { text: `${what}${where}, nos gastos de ${monthLabel(entryMonth)}.`, action: { label: 'Ir para o mês', run: () => setSelectedMonth(entryMonth) } });
  }
  const entriesOf = coll => (coll === 'cardTransactions' ? cardTransactions : otherExpenses);

  // Apagar não pede confirmação (dá para desfazer pelo aviso). `scope` vem de
  // changeScopes: só esta / esta e as próximas / a compra inteira; num fixo,
  // 'from' encerra a partir do mês exibido em vez de apagar o histórico.
  // Num fixo dividido (ex.: aluguel entre duas pessoas), "a partir deste mês"
  // vale para todas as partes, não só para a de quem clicou.
  const fixedParts = (coll, item) => (item.splitGroupId
    ? entriesOf(coll).filter(x => x.splitGroupId === item.splitGroupId && isRecurring(x))
    : [item]);
  // Para desfazer: só recria com o autor original se for quem está desfazendo
  // (as regras não deixam gravar um lançamento em nome de outra pessoa).
  const ownAuthor = x => (x.createdBy && x.createdBy !== user?.uid ? { ...x, createdBy: undefined } : x);

  function removeEntry(coll, item, scope = 'one') {
    if (scope === 'from') {
      const endMonth = shiftMonth(selectedMonth, -1);
      const parts = fixedParts(coll, item);
      for (const x of parts) write(store.update(coll, x, { endMonth }));
      setToast({
        text: `“${item.description}” encerrado a partir de ${monthLabel(selectedMonth)}.`,
        // As partes ainda existem: regravar como estavam (mesmo autor) tira o encerramento.
        action: { label: 'Desfazer', run: () => write(store.setMany(coll, parts)) },
      });
      return;
    }
    const items = entriesInScope(entriesOf(coll), item, scope);
    write(store.removeMany(items.map(x => [coll, x.id])));
    setToast({
      text: items.length > 1 ? `“${item.description}” apagado (${items.length} lançamentos).` : `“${item.description}” apagado.`,
      action: { label: 'Desfazer', run: () => write(store.setMany(coll, items.map(ownAuthor))) },
    });
  }

  // Edição. Descrição, categoria e valor valem para todo o alcance escolhido;
  // data, pessoa e "fixo" só para o lançamento editado (senão as partes de uma
  // compra dividida virariam da mesma pessoa).
  // A compra inteira a que um lançamento pertence (todas as parcelas e as partes
  // de quem divide) e os números dela, para "Corrigir parcelamento".
  function purchaseInfo(item) {
    const coll = item.cardId ? 'cardTransactions' : 'otherExpenses';
    const all = entriesInScope(entriesOf(coll), item, 'all');
    const people = [...new Set([item.personId, ...all.map(x => x.personId)])];
    // Quanto é de cada pessoa (a divisão pode ser com valores diferentes).
    const personTotals = people.map(id => Math.round(sumAmounts(all.filter(x => x.personId === id)) * 100) / 100);
    return {
      total: Math.round(sumAmounts(all) * 100) / 100,
      count: item.installmentTotal > 1 ? item.installmentTotal : 1,
      current: item.installmentTotal > 1 ? item.installmentNumber : 1,
      people, personTotals,
      start: all.map(x => x.date).sort()[0] || item.date, // data da 1ª parcela
      uneven: personTotals.some(v => Math.abs(v - personTotals[0]) > 0.01 * people.length),
    };
  }

  // Refaz a compra com outro parcelamento: apaga as parcelas antigas e gera as
  // novas (esta linha vira a parcela `current`, na mesma data; as anteriores
  // ficam como já pagas). Mantém quem divide (na mesma proporção), cartão/lista,
  // forma e ocultação. Um fixo (ex.: consórcio lançado como fixo) vira parcelado
  // do mesmo jeito; se o mês da parcela atual já estava pago, ela fica paga.
  // Virar fixo (`rebuild.fixed`): começa na data da 1ª parcela, para os meses
  // passados continuarem lá (fora do cartão, os já pagos seguem pagos).
  function rebuildPurchase(coll, item, patch) {
    const old = entriesInScope(entriesOf(coll), item, 'all');
    const info = purchaseInfo(item);
    const toFixed = !!patch.rebuild.fixed;
    const count = toFixed ? 1 : Math.max(1, Math.min(480, Math.floor(Number(patch.rebuild.count)) || 1));
    const current = toFixed ? 1 : Math.max(1, Math.min(count, Math.floor(Number(patch.rebuild.current)) || 1));
    const total = Number(patch.rebuild.total) || info.total;
    const extra = {
      ...(item.cardId ? { cardId: item.cardId } : { groupId: item.groupId || DEFAULT_GROUP, ...(item.method ? { method: item.method } : {}) }),
      ...(item.visibleTo?.length ? { visibleTo: item.visibleTo } : {}),
    };
    const fresh = buildEntries({
      description: patch.description?.trim() || item.description,
      amount: total,
      personId: info.people[0],
      splitWith: info.people.slice(1),
      ...(info.uneven ? { shares: splitByWeights(total, info.personTotals) } : {}),
      date: toFixed ? info.start : patch.date || item.date,
      category: patch.category || item.category,
      fixed: toFixed,
      installments: count,
      paidInstallments: toFixed ? 0 : current - 1,
    }, extra).map(x => {
      if (toFixed) {
        if (coll !== 'otherExpenses') return x;
        return { ...x, paidMonths: [...new Set(old.filter(o => o.personId === x.personId && o.paid).map(o => o.date.slice(0, 7)))] };
      }
      if (!item.fixed || x.installmentNumber !== current) return x;
      const was = old.find(o => o.personId === x.personId);
      return was && isPaidIn(was, x.date.slice(0, 7)) ? { ...x, paid: true } : x;
    });
    write(store.removeMany(old.map(x => [coll, x.id])));
    write(store.setMany(coll, fresh));
    setToast({
      text: toFixed ? `“${item.description}” virou fixo: ${money(total)} por mês.` : `“${item.description}” ${item.fixed ? 'virou parcelado' : 'refeito'}: ${count > 1 ? `${count}x de ${money(total / (info.uneven ? 1 : info.people.length) / count)}${info.uneven ? ' no total' : ''}` : `à vista, ${money(total)}`}.`,
      action: { label: 'Desfazer', run: () => { write(store.removeMany(fresh.map(x => [coll, x.id]))); write(store.setMany(coll, old.map(ownAuthor))); } },
    });
  }

  // Parcelas que faltam numa compra (de cada pessoa, se for dividida), a partir
  // da editada (ou da 1ª, na compra inteira): copiam a parcela mais próxima da
  // mesma pessoa, já com a edição, na data do mês certo.
  function missingInstallments(items, item, scope, clean, shared, dateShift) {
    const total = item.installmentTotal;
    const first = scope === 'next' ? item.installmentNumber : 1;
    const out = [];
    for (const personId of new Set(items.map(x => x.personId))) {
      const mine = items.filter(x => x.personId === personId && x.installmentTotal === total);
      const has = new Set(mine.map(x => Number(x.installmentNumber)));
      for (let n = first; n <= total; n++) {
        if (has.has(n)) continue;
        const base = mine.reduce((a, b) => (Math.abs(b.installmentNumber - n) < Math.abs(a.installmentNumber - n) ? b : a));
        const { id, coll: _c, paidMonths, ...rest } = base;
        const { date: _d, personId: _p, fixed: _f, ...edits } = base.id === item.id ? clean : shared;
        const date = dateShift ? monthsLaterDate(clean.date, n - item.installmentNumber)
          : monthsLaterDate(base.date, n - base.installmentNumber);
        out.push({
          ...rest, ...edits, id: newId(), createdBy: user?.uid, installmentNumber: n, paid: false, date,
          ...(paidMonths ? { paidMonths: [] } : {}),
        });
      }
    }
    return out;
  }

  function updateEntry(coll, item, patch, scope = 'one') {
    if (patch.rebuild) { rebuildPurchase(coll, item, patch); return; }
    const clean = {
      description: patch.description?.trim() || item.description,
      amount: Number(patch.amount) || 0,
      date: patch.date || item.date,
      personId: patch.personId || item.personId,
      fixed: !(item.installmentTotal > 1) && !!patch.fixed,
      category: patch.category || item.category || DEFAULT_CATEGORY,
    };
    // Só o que de fato mudou vai para as outras partes (o valor de cada parcela
    // pode diferir em centavos; não mexer nele se não foi editado).
    // Forma de pagamento: um cartão (ou pessoa a pagar) pelo id, ou fora do cartão
    // ('outside' / 'outside:<lista>'), com a forma (Pix, débito…).
    const currentTarget = coll === 'cardTransactions' ? item.cardId : 'outside';
    const parsedTarget = parseTarget(patch.target || currentTarget);
    const target = parsedTarget.outside ? 'outside' : parsedTarget.cardId;
    if (parsedTarget.outside) {
      clean.groupId = parsedTarget.groupId;
      if (patch.method !== undefined) clean.method = patch.method || undefined;
    }
    const shared = Object.fromEntries(['description', 'category', 'amount', 'groupId', 'method']
      .filter(k => k in clean && clean[k] !== item[k]).map(k => [k, clean[k]]));

    const targetColl = target === 'outside' ? 'otherExpenses' : 'cardTransactions';
    const moving = target !== currentTarget;
    // O lançamento no formato da coleção de destino.
    const reshape = (x, changes) => {
      const { cardId, paidMonths, ...rest } = { ...x, ...changes };
      return targetColl === 'cardTransactions'
        ? { ...rest, cardId: target }
        : { ...rest, paidMonths: coll === 'otherExpenses' ? (paidMonths || []) : [] };
    };
    // Quem pode ver: só muda se a edição trouxe `hideFrom`.
    const newVisibleTo = patch.hideFrom ? visibleToFor(patch.hideFrom) : (item.visibleTo || null);
    const sameSet = (a, b) => (a || []).length === (b || []).length && (a || []).every(u => (b || []).includes(u));
    const visibilityChanged = !sameSet(newVisibleTo, item.visibleTo);
    const withVisibility = x => {
      const { visibleTo, coll: _c, ...rest } = x;
      return newVisibleTo ? { ...rest, visibleTo: newVisibleTo } : rest;
    };
    const targetName = target === 'outside'
      ? `${groups.find(g => g.id === clean.groupId)?.name || 'fora do cartão'}${clean.method ? ` (${methodLabel(clean.method)})` : ''}`
      : (c => (c ? (c.kind === 'payee' ? `Devo para ${c.name}` : `cartão ${c.name}`) : 'cartão'))(cards.find(c => c.id === target));

    if (scope === 'from') {
      // Fixo: as partes antigas valem até o mês anterior; daqui em diante, novas
      // partes com as mudanças (com um vínculo de divisão novo, só entre elas).
      const parts = fixedParts(coll, item);
      if (!clean.fixed) {
        for (const x of parts) write(store.update(coll, x, { endMonth: selectedMonth }));
        return;
      }
      const endMonth = shiftMonth(selectedMonth, -1);
      const newSplitId = parts.length > 1 ? newId() : undefined;
      for (const x of parts) {
        const changes = x.id === item.id ? clean : shared;
        const day = (x.id === item.id && clean.date !== item.date ? clean.date : dueDateIn(x, selectedMonth)).slice(8, 10);
        const next = {
          ...withVisibility(reshape(x, changes)), id: newId(), createdBy: user?.uid, date: `${selectedMonth}-${day}`, paid: false, endMonth: x.endMonth,
          ...(newSplitId ? { splitGroupId: newSplitId } : {}),
          ...(targetColl === 'otherExpenses' ? { paidMonths: (x.paidMonths || []).filter(m => m >= selectedMonth) } : {}),
        };
        write(store.update(coll, x, { endMonth }));
        write(store.set(targetColl, next.id, next));
      }
      if (moving) setToast({ text: `A partir de ${monthLabel(selectedMonth)}, “${clean.description}” vai para ${targetName}.` });
      return;
    }
    const items = entriesInScope(entriesOf(coll), item, scope);
    // Parcelas: o que mudou vale também para as seguintes. Mudar a data muda a
    // de todas (mantém um mês entre elas), e a parcela que faltar em algum mês
    // (apagada sem querer, por exemplo) é criada de novo, já com a edição.
    const isPurchase = item.installmentTotal > 1 && (scope === 'next' || scope === 'all');
    const dateShift = isPurchase && clean.date !== item.date;
    const changesFor = x => (x.id === item.id ? clean
      : dateShift && x.installmentTotal > 1 ? { ...shared, date: monthsLaterDate(clean.date, x.installmentNumber - item.installmentNumber) } : shared);
    const created = isPurchase ? missingInstallments(items, item, scope, clean, shared, dateShift) : [];
    if (created.length) {
      write(store.setMany(targetColl, created.map(x => withVisibility(moving ? reshape(x, {}) : x))));
    }
    const createdNote = created.length === 0 ? ''
      : created.length === 1 ? ' A parcela que faltava foi criada.' : ` ${created.length} parcelas que faltavam foram criadas.`;
    if (visibilityChanged) {
      // Ocultar ou mostrar de novo: o lançamento muda de lugar (hiddenEntries).
      for (const x of items) {
        const changes = changesFor(x);
        const next = withVisibility(moving ? reshape(x, changes) : { ...x, ...changes });
        write(store.relocate(coll, targetColl, x, next, user?.uid));
      }
      setToast({ text: (newVisibleTo ? `“${clean.description}”: ${visibilityLabel({ visibleTo: newVisibleTo }).toLowerCase()}.` : `“${clean.description}” voltou a aparecer para todos.`) + createdNote });
      return;
    }
    if (!moving) {
      for (const x of items) {
        const changes = changesFor(x);
        if (x.id === item.id || Object.keys(changes).length) write(store.update(coll, x, changes));
      }
      if (createdNote) setToast({ text: `“${clean.description}”:${createdNote}` });
      return;
    }
    if (targetColl === coll) {
      // De um cartão para outro (ou para uma pessoa a pagar): só troca o cardId.
      for (const x of items) write(store.update(coll, x, { ...changesFor(x), cardId: target }));
    } else {
      // Entre cartão e "fora do cartão": muda de coleção, no mesmo lote.
      write(store.move(coll, targetColl, items.map(x => ownAuthor(reshape(x, changesFor(x))))));
    }
    setToast({ text: `“${clean.description}” agora é ${targetName}${items.length > 1 ? ` (${items.length} lançamentos)` : ''}.${createdNote}` });
  }
  // Listas de gastos fora do cartão.
  function renameGroup(id, name) {
    const g = groups.find(x => x.id === id);
    if (!g || !name.trim()) return;
    write(store.set('expenseGroups', id, { name: name.trim(), order: g.order || 0 }));
  }
  function addGroup(name) {
    if (!name.trim()) return;
    write(store.set('expenseGroups', newId(), { name: name.trim(), order: Math.max(0, ...groups.map(g => Number(g.order) || 0)) + 1 }));
    setToast({ text: `Lista “${name.trim()}” criada.` });
  }
  // Apagar uma lista não apaga gastos: eles voltam para a lista padrão.
  function removeGroup(id) {
    const g = groups.find(x => x.id === id);
    if (!g || id === DEFAULT_GROUP) return;
    for (const e of otherExpenses.filter(x => x.groupId === id)) write(store.update('otherExpenses', e, { groupId: DEFAULT_GROUP }));
    write(store.remove('expenseGroups', id));
    setToast({ text: `Lista “${g.name}” apagada; os gastos foram para “${groups[0].name}”.` });
  }

  // Gasto fixo: marca o mês em `paidMonths`; os demais têm um `paid` só.
  function toggleOtherExpensePaid(id, month) {
    const e = otherExpenses.find(x => x.id === id);
    if (!e) return;
    if (isRecurring(e)) write(store.toggleMonth('otherExpenses', id, 'paidMonths', month, !isPaidIn(e, month)));
    else write(store.update('otherExpenses', e, { paid: !e.paid }));
  }
  function toggleInvoicePaid(cardId, month) {
    const c = cards.find(x => x.id === cardId);
    if (c) write(store.toggleMonth('cards', cardId, 'paidInvoices', month, !isInvoicePaid(c, month)));
  }
  function clearAll() {
    write(store.removeMany([
      ...people.map(x => ['people', x.id]),
      ...cards.map(x => ['cards', x.id]),
      ...cardTransactions.map(x => ['cardTransactions', x.id]),
      ...otherExpenses.map(x => ['otherExpenses', x.id]),
    ]));
    setOpenPanel(null);
    setFilterPerson('all');
    setToast({ text: `Dados de “${space?.name}” apagados.` });
  }

  const rootStyle = {
    minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif", paddingBottom: '3rem',
    ...paletteVars(pal),
  };

  if (syncState !== 'ready') {
    return (
      <div className="extrato-app" style={rootStyle}>
        <style>{APP_CSS}</style>
        {syncState === 'loading' ? (
          <div aria-busy="true" aria-label="Carregando seus gastos" style={{ maxWidth: 1180, margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="skeleton" style={{ height: 40, width: 260, maxWidth: '70%' }} />
            <div className="skeleton" style={{ height: 36, width: 320, maxWidth: '90%' }} />
            <div className="overview">
              {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 92 }} />)}
            </div>
            <div className="skeleton" style={{ height: 160 }} />
            <div className="skeleton" style={{ height: 220 }} />
          </div>
        ) : (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="panel" style={{ maxWidth: 380, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                Não consegui carregar os dados de “{space?.name}”
              </div>
              <p className="muted" style={{ marginBottom: '1.25rem' }}>
                Verifique sua conexão e tente de novo. Seus dados continuam salvos na nuvem.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="primary" onClick={retryLoad}>Tentar de novo</button>
                {spaceId !== spacesApi.homeSpaceId
                  ? <button className="ghost" onClick={() => spacesApi.setActiveSpace(spacesApi.homeSpaceId)}>Ir para Meus gastos</button>
                  : <button className="ghost" onClick={logout}>Sair</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasEntries = cardTransactions.length + otherExpenses.length > 0;
  const showOnboarding = !readOnly && !hasEntries;
  const canAddEntry = !readOnly && people.length > 0;
  const openEntryForm = target => setEntryForm({ target });

  const navItems = [
    { id: 'top', label: 'Início', icon: LayoutDashboard },
    show('cards') && { id: 'sec-cards', label: 'Cartões', icon: CreditCard },
    show('other') && { id: 'sec-other', label: 'Gastos', icon: Receipt },
    show('calendar') && hasEntries && { id: 'sec-calendar', label: 'Agenda', icon: CalendarDays },
    show('report') && hasEntries && { id: 'sec-report', label: 'Relatório', icon: FileText },
  ].filter(Boolean);

  // Pessoas: no começo é o primeiro passo; depois é cadastro e vai para o fim.
  const peopleSection = (show('people') || people.length === 0) && (
    <div id="sec-people" data-nav="sec-people" style={{ scrollMarginTop: '1rem' }}>
      <PeopleSection
        people={people} onAdd={addPerson} onRemove={removePerson} onSalary={updateSalary} personColor={personColor} readOnly={readOnly}
        meId={user?.uid} memberLabel={memberLabel} shared={(space?.members?.length || 0) > 1}
        onLinkMe={!readOnly && !myPerson ? linkMeToPerson : null}
        entryCount={id => cardTransactions.filter(t => t.personId === id).length + otherExpenses.filter(t => t.personId === id).length}
        formOpen={peopleFormOpen} setFormOpen={setPeopleFormOpen}
      />
    </div>
  );

  return (
    <div className="extrato-app" style={rootStyle}>
      <style>{APP_CSS}</style>

      <header className="app-header" style={{ padding: '2.5rem 1.5rem 1.5rem', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0 }}>
            <h1 className="display app-title" style={{ fontSize: '2.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{BRAND.name}</h1>
            {spaces.length > 1 ? (
              <label className="no-print label-sm">
                <Users size={15} aria-hidden="true" />
                <select value={spaceId} onChange={e => { setOpenPanel(null); spacesApi.setActiveSpace(e.target.value); }} aria-label="Espaço">
                  {spaces.map(s => <option key={s.id} value={s.id}>{spaceDisplayName(s, user?.uid)}</option>)}
                </select>
              </label>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{space?.name}</span>
            )}
          </div>
          <nav className="no-print header-actions" aria-label="Opções">
            {installUi.button}
            <button className={`ghost${openPanel === 'space' ? ' active' : ''}`} onClick={() => togglePanel('space')} aria-expanded={openPanel === 'space'}
              aria-label={spaces.length > 1 ? 'Espaços' : 'Compartilhar'} title={spaces.length > 1 ? 'Espaços' : 'Compartilhar'}>
              <Link2 size={15} /><span className="btn-label">{spaces.length > 1 ? 'Espaços' : 'Compartilhar'}</span>
            </button>
            <button className={`ghost${openPanel === 'customize' ? ' active' : ''}`} onClick={() => togglePanel('customize')} aria-expanded={openPanel === 'customize'}
              aria-label="Personalizar" title="Personalizar">
              <SlidersHorizontal size={15} /><span className="btn-label">Personalizar</span>
            </button>
            <button className={`ghost${openPanel === 'account' ? ' active' : ''}`} onClick={() => togglePanel('account')} aria-expanded={openPanel === 'account'}
              aria-label="Conta" title={user?.email}>
              <UserRound size={15} /><span className="btn-label">Conta</span>
            </button>
          </nav>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          <button className="icon" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <select value={selectedMonth} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setSelectedMonth(e.target.value); }} aria-label="Mês" style={{ fontWeight: 600 }}>
            {availableMonths.map(m => <option key={m} value={m}>{capitalize(monthLabel(m))}</option>)}
          </select>
          <button className="icon" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))} aria-label="Próximo mês"><ChevronRight size={20} /></button>
          {selectedMonth !== currentMonth() && (
            <button className="ghost" onClick={() => setSelectedMonth(currentMonth())}>Hoje</button>
          )}
          <button className={`ghost${openPanel === 'bills' ? ' active' : ''}`} onClick={() => togglePanel('bills')} aria-expanded={openPanel === 'bills'} style={{ marginLeft: '0.2rem' }}>
            <ListChecks size={15} />Contas
            {monthBills.length > 0 && (
              <span className="mono" style={{ color: billsOverdue > 0 ? 'var(--danger)' : billsPaidCount === monthBills.length ? 'var(--success)' : 'var(--text-muted)' }}>
                {billsPaidCount}/{monthBills.length}
              </span>
            )}
          </button>
          <span style={{ flex: 1 }} />
          {canAddEntry && (
            <button className="primary desktop-only" onClick={() => openEntryForm(null)}><Plus size={16} />Novo gasto</button>
          )}
        </div>

        {openPanel === 'bills' && (
          <BillsPanel
            bills={monthBills} selectedMonth={selectedMonth} onToggle={toggleBill} onClose={() => setOpenPanel(null)}
            personName={personName} personColor={personColor} readOnly={readOnly}
            filterLabel={topIds.size === 0 || topIds.size === people.length ? null : scopePeople.map(p => p.name).join(', ')}
          />
        )}
        {openPanel === 'space' && (
          <SpacePanel spacesApi={spacesApi} userId={user?.uid} onClose={() => setOpenPanel(null)}
            onJoined={name => setToast({ text: `Você entrou em “${name}”.` })} />
        )}
        {openPanel === 'account' && (
          <AccountPanel spacesApi={spacesApi} data={data} spaceName={space?.name} onClose={() => setOpenPanel(null)} visibilityLabel={visibilityLabel}
            onLogout={logout} onClearAll={readOnly ? null : clearAll} />
        )}
        {openPanel === 'customize' && (
          <CustomizePanel visible={visible} onChange={changeVisible} onClose={() => setOpenPanel(null)}
            paletteKey={paletteChoice} onPalette={key => write(spacesApi.setPaletteKey(key))} />
        )}

        {readOnly && (
          <div className="no-print" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem',
            padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--panel)',
          }}>
            <Eye size={16} color="var(--accent-light)" aria-hidden="true" />
            <span style={{ fontSize: '0.85rem', flex: '1 1 200px' }}>
              Você pode só <strong>visualizar</strong> o espaço “{space?.name}”. Para lançar gastos, peça ao dono para mudar seu acesso.
            </span>
          </div>
        )}
      </header>

      <main className="app-main" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {installUi.banner}
        {!readOnly && !myPerson && people.length > 0 && (space?.members?.length || 0) > 1 && (
          <WhoAreYou spaceId={spaceId} people={people} personColor={personColor} onPick={linkMeToPerson} onNew={addMeAsPerson} />
        )}
        {showOnboarding && (
          <Onboarding
            hasPeople={people.length > 0} hasCards={cards.length > 0} hasEntries={hasEntries}
            onAddPerson={() => { setPeopleFormOpen(true); scrollToSection('sec-people'); }}
            onAddCard={() => { if (!show('cards')) changeVisible({ ...visible, cards: true }); setCardFormOpen(true); setTimeout(() => scrollToSection('sec-cards'), 0); }}
            onAddEntry={() => openEntryForm(null)}
          />
        )}
        {readOnly && !hasEntries && (
          <p className="muted">Este espaço ainda não tem gastos lançados.</p>
        )}

        {people.length === 0 && peopleSection}

        {/* "Ver gastos de": filtra os cartões, as pessoas a pagar e os outros gastos abaixo. */}
        {people.length > 1 && hasEntries && (
          <div className="no-print" role="group" aria-label="Ver gastos de" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '-1rem' }}>
            <span className="hint" style={{ marginRight: '0.2rem' }}>Ver gastos de</span>
            <button className="chip" aria-pressed={filterPerson === 'all'} onClick={() => setFilterPerson('all')}>Todos</button>
            {people.map(p => (
              <PersonChip key={p.id} person={p} color={personColor(p.id)} pressed={filterPerson === p.id}
                onClick={() => setFilterPerson(filterPerson === p.id ? 'all' : p.id)} />
            ))}
          </div>
        )}

        {show('cards') && (
          <div id="sec-cards" data-nav="sec-cards" style={{ scrollMarginTop: '1rem' }}>
            <CardsSection
              cards={cards} people={people} cardTransactions={cardTransactions}
              filterPerson={filterPerson} selectedMonth={selectedMonth} expandedCard={expandedCard} setExpandedCard={setExpandedCard}
              onAddCard={addCard} onRemoveCard={removeCard} onUpdateCard={updateCard} onToggleInvoice={toggleInvoicePaid}
              onNewEntry={openEntryForm} onRemoveTx={(t, scope) => removeEntry('cardTransactions', t, scope)} onUpdateTx={(t, patch, scope) => updateEntry('cardTransactions', t, patch, scope)} purchaseInfo={purchaseInfo} authorName={authorName} members={otherMembers} visibilityLabel={visibilityLabel} groups={groups}
              personName={personName} personColor={personColor} cardGradients={pal.cardGradients} readOnly={readOnly}
              formOpen={cardFormOpen} setFormOpen={setCardFormOpen}
            />
          </div>
        )}

        {show('other') && (
          <div id="sec-other" data-nav="sec-other" style={{ scrollMarginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groups.map(g => (
              <OtherExpensesSection key={g.id} group={g} isDefault={g.id === DEFAULT_GROUP}
                expenses={otherExpenses.filter(e => groupOf(e, groupIds) === g.id)} people={people} filterPerson={filterPerson} selectedMonth={selectedMonth}
                cards={cards} groups={groups} onNewEntry={openEntryForm} onRemove={(e, scope) => removeEntry('otherExpenses', e, scope)} onUpdate={(e, patch, scope) => updateEntry('otherExpenses', e, patch, scope)} onTogglePaid={toggleOtherExpensePaid} purchaseInfo={purchaseInfo} authorName={authorName} members={otherMembers} visibilityLabel={visibilityLabel}
                personName={personName} personColor={personColor} readOnly={readOnly}
                onRename={name => renameGroup(g.id, name)} onRemoveGroup={() => removeGroup(g.id)}
              />
            ))}
            {!readOnly && <NewGroupButton onAdd={addGroup} />}
          </div>
        )}

        {hasEntries && show('payments') && (
          <PaymentsSection
            cards={cards} cardTransactions={cardTransactions} otherExpenses={otherExpenses}
            filterPerson={filterPerson} selectedMonth={selectedMonth}
          />
        )}

        {hasEntries && (show('categories') || show('summary')) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '2rem', alignItems: 'start' }}>
            {show('categories') && (
              <CategorySummarySection
                cards={cards} cardTransactions={cardTransactions} otherExpenses={otherExpenses}
                filterPerson={filterPerson} selectedMonth={selectedMonth} categoryColors={pal.people}
              />
            )}
            {show('summary') && (
              <SummarySection people={people} personTotal={personTotal} personColor={personColor} selectedMonth={selectedMonth} />
            )}
          </div>
        )}

        {people.length > 0 && peopleSection}

        {hasEntries && show('report') && (
          <div id="sec-report" data-nav="sec-report" className="print-keep" style={{ scrollMarginTop: '1rem' }}>
            <ReportSection
              people={people} cards={cards} cardTransactions={cardTransactions} otherExpenses={otherExpenses}
              selectedMonth={selectedMonth} personTotal={personTotal} personColor={personColor}
            />
          </div>
        )}
      </main>

      {canAddEntry && (
        <button className="fab no-print" onClick={() => openEntryForm(null)} aria-label="Novo gasto"><Plus size={26} /></button>
      )}
      <nav className="bottom-nav no-print" aria-label="Seções">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => scrollToSection(id)} aria-current={activeNav === id ? 'true' : undefined}>
            <Icon size={20} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>

      {entryForm && (
        <EntryForm
          people={people} cards={cards} selectedMonth={selectedMonth} initialTarget={entryForm.target} defaultPersonId={myPerson?.id} members={otherMembers} groups={groups}
          personColor={personColor} onSubmit={submitEntry} onClose={() => setEntryForm(null)}
        />
      )}
      {installUi.iosHelp}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
