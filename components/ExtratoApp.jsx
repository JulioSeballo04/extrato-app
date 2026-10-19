'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Users, Link2, Eye, SlidersHorizontal, ListChecks, UserRound, LayoutDashboard, CreditCard, CalendarDays, Receipt, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { spaceStore, subscribeSpaceData, newId } from '../lib/spaces';
import { BRAND } from '../lib/brand';
import { PALETTES, AUTO_PALETTE, DEFAULT_PALETTE, resolvePaletteKey, paletteVars, writeCachedPalette, systemPrefersDark } from '../lib/theme';
import {
  DEFAULT_CATEGORY, monthLabel, capitalize, currentMonth, shiftMonth, monthsLaterDate, matchesMonth, isRecurring, isPaidIn,
  isInvoicePaid, parseDueDay, sumAmounts, buildMonthBills,
} from '../lib/ledger';
import { APP_CSS } from './appStyles';
import { Toast } from './ui';
import SpacePanel from './SpacePanel';
import AccountPanel from './AccountPanel';
import CustomizePanel, { DEFAULT_VISIBLE } from './CustomizePanel';
import PeopleSection from './sections/People';
import CardsSection from './sections/Cards';
import OtherExpensesSection from './sections/OtherExpenses';
import { EntryForm, PersonChip } from './sections/Entries';
import { CalendarSection, BillsPanel } from './sections/Calendar';
import { CategorySummarySection, SummarySection, ReportSection } from './sections/Reports';
import { MonthOverview, Onboarding } from './sections/Overview';

const VISIBLE_SECTIONS_KEY = 'gestor-de-gastos:secoes-visiveis';
const EMPTY_DATA = { people: [], cards: [], cardTransactions: [], otherExpenses: [] };
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
  const { people, cards, cardTransactions, otherExpenses } = data;
  const store = spaceId ? spaceStore(spaceId) : null;

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
      spaceId,
      (next) => { loadedOnce.current = true; setData(next); clearErrorToast(); setSyncState('ready'); },
      // Já carregou antes: os dados na tela valem, só avisa. Senão, tela de erro.
      () => { if (loadedOnce.current) setToast(SAVE_ERROR_TOAST); else setSyncState('failed'); },
    );
  }, [spaceId, retryCount]);

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

  function personTotal(personId, month) {
    const cardSum = sumAmounts(cardTransactions.filter(t => t.personId === personId && (!month || matchesMonth(t, month))));
    const otherSum = sumAmounts(otherExpenses.filter(t => t.personId === personId && (!month || matchesMonth(t, month))));
    return { cardSum, otherSum, total: cardSum + otherSum };
  }
  const availableMonths = Array.from(new Set([
    selectedMonth,
    currentMonth(),
    ...cardTransactions.map(t => t.date && t.date.slice(0, 7)),
    ...otherExpenses.map(t => t.date && t.date.slice(0, 7)),
  ].filter(Boolean))).sort();

  const inScope = t => filterPerson === 'all' || t.personId === filterPerson;
  const monthBills = buildMonthBills(data, selectedMonth, inScope);
  const calendarBills = buildMonthBills(data, selectedMonth, inScope, true);
  function toggleBill(bill) {
    if (bill.kind === 'card') toggleInvoicePaid(bill.refId, selectedMonth);
    else toggleOtherExpensePaid(bill.refId, selectedMonth);
  }
  const billsPaidCount = monthBills.filter(b => b.paid).length;
  const billsOverdue = monthBills.filter(b => b.status === 'overdue').length;

  // Números do topo (respeitam o filtro de pessoa).
  const scopePeople = filterPerson === 'all' ? people : people.filter(p => p.id === filterPerson);
  const overview = scopePeople.reduce((acc, p) => {
    const t = personTotal(p.id, selectedMonth);
    acc.cardSum += t.cardSum; acc.otherSum += t.otherSum; acc.salary += Number(p.salary) || 0;
    return acc;
  }, { cardSum: 0, otherSum: 0, salary: 0 });
  const billsPaid = sumAmounts(monthBills.filter(b => b.paid));
  const billsTotal = sumAmounts(monthBills);

  function personName(id) {
    const p = people.find(p => p.id === id);
    return p ? p.name : '—';
  }
  function personColor(id) {
    const idx = people.findIndex(p => p.id === id);
    return pal.people[idx >= 0 ? idx % pal.people.length : 0];
  }
  const nextOrder = list => list.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1;

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
    if (filterPerson === id) setFilterPerson('all');
  }
  function updateSalary(id, salary) {
    const p = people.find(x => x.id === id);
    if (p) write(store.update('people', p, { salary }));
  }
  function addCard(name, limitValue, color, dueDay) {
    if (!name.trim()) return;
    write(store.set('cards', newId(), { name, limitValue, color, dueDay: parseDueDay(dueDay), paidInvoices: [], order: nextOrder(cards) }));
  }
  function updateCardColor(id, color) {
    const c = cards.find(x => x.id === id);
    if (c) write(store.update('cards', c, { color }));
  }
  function updateCardDueDay(id, dueDay) {
    const c = cards.find(x => x.id === id);
    if (c) write(store.update('cards', c, { dueDay: parseDueDay(dueDay) }));
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
    // Divide o valor igualmente entre o responsável principal e quem mais
    // estiver marcado em "dividir com" (ex.: consórcio dividido com a namorada).
    const participants = [entry.personId, ...((entry.splitWith || []).filter(id => id && id !== entry.personId))];
    const splitGroupId = participants.length > 1 ? newId() : undefined;
    const perInstallmentAmount = (Number(entry.amount) || 0) / participants.length / total;
    // A data informada é a da PRÓXIMA parcela a vencer (nº paidCount+1).
    // As parcelas já pagas ficam com datas retroativas; as futuras seguem em frente a partir dela.
    return participants.flatMap(personId =>
      Array.from({ length: total }, (_, i) => ({
        ...extra,
        id: newId(),
        personId,
        description: entry.description.trim(),
        amount: perInstallmentAmount,
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
    if (cardId) write(store.setMany('cardTransactions', buildEntries(entry, { cardId })));
    else write(store.setMany('otherExpenses', buildEntries(entry, {})));
    setEntryForm(null);
    const entryMonth = entry.date.slice(0, 7);
    setToast(entryMonth === selectedMonth
      ? { text: 'Gasto lançado.' }
      : { text: `Gasto lançado em ${monthLabel(entryMonth)}.`, action: { label: 'Ir para o mês', run: () => setSelectedMonth(entryMonth) } });
  }
  // Apagar um lançamento não pede confirmação: dá para desfazer pelo aviso.
  function removeEntry(coll, item) {
    write(store.remove(coll, item.id));
    setToast({ text: `“${item.description}” apagado.`, action: { label: 'Desfazer', run: () => write(store.set(coll, item.id, item)) } });
  }
  function toggleCardTransactionPaid(id) {
    const t = cardTransactions.find(x => x.id === id);
    if (t) write(store.update('cardTransactions', t, { paid: !t.paid }));
  }
  function editPatch(x, patch) {
    return {
      description: patch.description?.trim() || x.description,
      amount: Number(patch.amount) || 0,
      date: patch.date || x.date,
      personId: patch.personId || x.personId,
      fixed: !(x.installmentTotal > 1) && !!patch.fixed,
      category: patch.category || x.category || DEFAULT_CATEGORY,
    };
  }
  function updateCardTransaction(id, patch) {
    const t = cardTransactions.find(x => x.id === id);
    if (t) write(store.update('cardTransactions', t, editPatch(t, patch)));
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
  function updateOtherExpense(id, patch) {
    const e = otherExpenses.find(x => x.id === id);
    if (e) write(store.update('otherExpenses', e, editPatch(e, patch)));
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
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{space?.name}</span>
            )}
          </div>
          <nav className="no-print header-actions" aria-label="Opções">
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
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} aria-label="Mês" style={{ fontWeight: 600 }}>
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

        {people.length > 1 && (
          <div className="no-print" role="group" aria-label="Ver gastos de" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span className="hint" style={{ marginRight: '0.2rem' }}>Ver gastos de</span>
            <button className="chip" aria-pressed={filterPerson === 'all'} onClick={() => setFilterPerson('all')}>Todos</button>
            {people.map(p => (
              <PersonChip key={p.id} person={p} color={personColor(p.id)} pressed={filterPerson === p.id}
                onClick={() => setFilterPerson(filterPerson === p.id ? 'all' : p.id)} />
            ))}
          </div>
        )}

        {openPanel === 'bills' && (
          <BillsPanel
            bills={monthBills} selectedMonth={selectedMonth} onToggle={toggleBill} onClose={() => setOpenPanel(null)}
            personName={personName} personColor={personColor} readOnly={readOnly}
            filterLabel={filterPerson === 'all' ? null : personName(filterPerson)}
          />
        )}
        {openPanel === 'space' && (
          <SpacePanel spacesApi={spacesApi} userId={user?.uid} onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === 'account' && (
          <AccountPanel spacesApi={spacesApi} data={data} spaceName={space?.name} onClose={() => setOpenPanel(null)}
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

        {hasEntries && (
          <MonthOverview
            spent={overview.cardSum + overview.otherSum} cardSum={overview.cardSum} otherSum={overview.otherSum}
            paid={billsPaid} toPay={billsTotal - billsPaid} overdueCount={billsOverdue} pendingCount={monthBills.length - billsPaidCount}
            salary={overview.salary} onOpenBills={() => { setOpenPanel('bills'); scrollToSection('top'); }}
          />
        )}

        {show('cards') && (
          <div id="sec-cards" data-nav="sec-cards" style={{ scrollMarginTop: '1rem' }}>
            <CardsSection
              cards={cards} people={people} cardTransactions={cardTransactions}
              filterPerson={filterPerson} selectedMonth={selectedMonth} expandedCard={expandedCard} setExpandedCard={setExpandedCard}
              onAddCard={addCard} onRemoveCard={removeCard} onUpdateDueDay={updateCardDueDay} onUpdateColor={updateCardColor}
              onNewEntry={openEntryForm} onRemoveTx={t => removeEntry('cardTransactions', t)} onTogglePaid={toggleCardTransactionPaid} onUpdateTx={updateCardTransaction}
              personName={personName} personColor={personColor} cardGradients={pal.cardGradients} readOnly={readOnly}
              formOpen={cardFormOpen} setFormOpen={setCardFormOpen}
            />
          </div>
        )}

        {show('other') && (
          <div id="sec-other" data-nav="sec-other" style={{ scrollMarginTop: '1rem' }}>
            <OtherExpensesSection
              expenses={otherExpenses} people={people} filterPerson={filterPerson} selectedMonth={selectedMonth}
              onNewEntry={openEntryForm} onRemove={e => removeEntry('otherExpenses', e)} onUpdate={updateOtherExpense} onTogglePaid={toggleOtherExpensePaid}
              personName={personName} personColor={personColor} readOnly={readOnly}
            />
          </div>
        )}

        {hasEntries && show('calendar') && (
          <div id="sec-calendar" data-nav="sec-calendar" style={{ scrollMarginTop: '1rem' }}>
            <CalendarSection bills={calendarBills} selectedMonth={selectedMonth} personName={personName} personColor={personColor} />
          </div>
        )}

        {hasEntries && (show('categories') || show('summary')) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '2rem', alignItems: 'start' }}>
            {show('categories') && (
              <CategorySummarySection
                cardTransactions={cardTransactions} otherExpenses={otherExpenses}
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
          people={people} cards={cards} selectedMonth={selectedMonth} initialTarget={entryForm.target}
          personColor={personColor} onSubmit={submitEntry} onClose={() => setEntryForm(null)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
