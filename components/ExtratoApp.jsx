'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, Pencil, Check, X, Palette, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserData, saveUserData } from '../lib/firestore';

const CATEGORIES = ['Alimentação', 'Compras', 'Mercado', 'Lazer', 'Contas fixas', 'Transporte', 'Saúde', 'Educação', 'Assinaturas', 'Outros'];
const DEFAULT_CATEGORY = 'Outros';

// Paletas do app: cada opção é um esquema de cores completo (fundo, painéis, bordas,
// textos, cor de destaque, cores semânticas, cores por pessoa e gradientes de cartão),
// não só uma cor de destaque isolada. Trocar a paleta muda a aparência inteira do app.
const PALETTES = {
  gold: {
    label: 'Dourado',
    bg: '#0F1115', panel: '#171A21', panelAlt: '#1B1F27', border: '#22262F', borderStrong: '#2A2F3A', inputBg: '#1F232C',
    text: '#EDEDEF', textDim: '#9096A3', textMuted: '#6B7280',
    accent: '#C9A227', accentLight: '#E7C765',
    success: '#4F9D6E', successBg: '#1E2E2A', danger: '#C1543C', dangerBg: '#2E211B', info: '#5B8DBE',
    people: ['#C9A227', '#5B8DBE', '#8A6FBF', '#4F9D6E', '#C1543C', '#3FA7A0'],
    cardGradients: [['#1B2138', '#3A4A78'], ['#3B2A1E', '#8A6136'], ['#1E2E2A', '#2F6E5C'], ['#2A1E2E', '#6E3F8A']],
  },
  blue: {
    label: 'Azul',
    bg: '#0B1220', panel: '#121B2E', panelAlt: '#16213A', border: '#1E2A42', borderStrong: '#293A57', inputBg: '#17233A',
    text: '#E7ECF5', textDim: '#8D9BB5', textMuted: '#5E6C87',
    accent: '#3E7CC9', accentLight: '#7FB0E7',
    success: '#3FA76E', successBg: '#12281F', danger: '#D1594B', dangerBg: '#301B16', info: '#6FA8DC',
    people: ['#3E7CC9', '#7FB0E7', '#3FA76E', '#C9A227', '#D1594B', '#8A6FBF'],
    cardGradients: [['#0F2148', '#22417F'], ['#152C1F', '#1F5C3B'], ['#241636', '#4A2C74'], ['#2E1A12', '#7A3E1D']],
  },
  green: {
    label: 'Verde',
    bg: '#0D1410', panel: '#141F19', panelAlt: '#182821', border: '#20342A', borderStrong: '#2B4438', inputBg: '#182720',
    text: '#E8F0EA', textDim: '#8FA89A', textMuted: '#607468',
    accent: '#3E9D6E', accentLight: '#78CBA1',
    success: '#4FBE7F', successBg: '#153524', danger: '#C1543C', dangerBg: '#2E2116', info: '#5B9DBE',
    people: ['#3E9D6E', '#C9A227', '#5B9DBE', '#8A6FBF', '#C1543C', '#78CBA1'],
    cardGradients: [['#122A20', '#1E6146'], ['#2A2110', '#78652B'], ['#141F30', '#33547F'], ['#241633', '#5A3673']],
  },
  purple: {
    label: 'Roxo',
    bg: '#130F1B', panel: '#1C1628', panelAlt: '#221B31', border: '#2E2540', borderStrong: '#3D3054', inputBg: '#221A30',
    text: '#EDE8F5', textDim: '#A398BA', textMuted: '#726690',
    accent: '#8A6FBF', accentLight: '#B79DE6',
    success: '#4F9D6E', successBg: '#1B2E22', danger: '#C1543C', dangerBg: '#301F1B', info: '#6F8FD6',
    people: ['#8A6FBF', '#C9607F', '#3E9D6E', '#C9A227', '#6F8FD6', '#B79DE6'],
    cardGradients: [['#241633', '#5A3673'], ['#301B2E', '#7A3E6E'], ['#151A33', '#39468C'], ['#20180F', '#6E4A1E']],
  },
  rose: {
    label: 'Rosé',
    bg: '#170F12', panel: '#221518', panelAlt: '#291A1E', border: '#3A2429', borderStrong: '#4B2E35', inputBg: '#291A1E',
    text: '#F5E9EC', textDim: '#BA96A0', textMuted: '#8C6871',
    accent: '#C9607F', accentLight: '#E79FB4',
    success: '#4F9D6E', successBg: '#1B2E22', danger: '#C1543C', dangerBg: '#301B1B', info: '#8A6FBF',
    people: ['#C9607F', '#C9A227', '#8A6FBF', '#4F9D6E', '#5B8DBE', '#E79FB4'],
    cardGradients: [['#301B2E', '#7A3E6E'], ['#3B2A1E', '#8A6136'], ['#1E2E2A', '#2F6E5C'], ['#241636', '#4A2C74']],
  },
};
const DEFAULT_PALETTE = 'gold';

// Paletas inspiradas na identidade visual de cada instituição (cores de marca,
// sem reproduzir logotipos ou marcas registradas). O "mono" é um monograma
// simples criado a partir do nome do banco, não o logotipo oficial.
const BANKS = {
  nubank: { label: 'Nubank', gradient: ['#8A05BE', '#5C0184'], chip: '#F2D9FF', mono: 'Nu' },
  santander: { label: 'Santander', gradient: ['#EC0000', '#8C0000'], chip: '#FFD6D6', mono: 'S' },
  itau: { label: 'Itaú', gradient: ['#003DA5', '#EC7000'], chip: '#FFDCB0', mono: 'I' },
  mercadopago: { label: 'Mercado Pago', gradient: ['#00AAFF', '#0038B8'], chip: '#FFF06B', mono: 'MP' },
  portoseguro: { label: 'Porto Seguro', gradient: ['#003057', '#0058A3'], chip: '#BFDCFF', mono: 'PS' },
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function money(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d) {
  if (!d) return '';
  const parts = d.slice(5).split('-');
  return parts.length === 2 ? `${parts[1]}/${parts[0]}` : d;
}

const MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES_PT[m - 1]} de ${y}`;
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthsLaterDate(dateStr, n) {
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
function matchesMonth(item, month) {
  if (!item?.date || !month) return false;
  const itemMonth = item.date.slice(0, 7);
  if (itemMonth === month) return true;
  return !!item.fixed && itemMonth < month;
}

function seedData() {
  const p1 = uid(), p2 = uid();
  const c1 = uid();
  return {
    people: [
      { id: p1, name: 'Você', salary: 4500 },
      { id: p2, name: 'Parceiro(a)', salary: 3200 },
    ],
    cards: [{ id: c1, name: 'Cartão Principal', limitValue: 5000 }],
    cardTransactions: [
      { id: uid(), cardId: c1, personId: p1, description: 'Supermercado', amount: 320.5, date: '2026-08-03', category: 'Mercado' },
      { id: uid(), cardId: c1, personId: p2, description: 'Farmácia', amount: 89.9, date: '2026-08-07', category: 'Saúde' },
      { id: uid(), cardId: c1, personId: p1, description: 'Assinatura streaming', amount: 39.9, date: '2026-08-10', category: 'Assinaturas' },
    ],
    otherExpenses: [
      { id: uid(), personId: p1, description: 'Aluguel', amount: 1200, date: '2026-08-05', fixed: true, category: 'Contas fixas' },
      { id: uid(), personId: p2, description: 'Academia', amount: 110, date: '2026-08-05', fixed: true, category: 'Lazer' },
    ],
  };
}

export default function ExtratoApp() {
  const { user, logout } = useAuth();
  const userId = user?.uid;

  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardTransactions, setCardTransactions] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [filterPerson, setFilterPerson] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [expandedCard, setExpandedCard] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const data = await getUserData(userId);
        if (data) {
          setPeople(data.people || []);
          setCards(data.cards || []);
          setCardTransactions(data.cardTransactions || []);
          setOtherExpenses(data.otherExpenses || []);
          if (data.paletteKey && PALETTES[data.paletteKey]) setPaletteKey(data.paletteKey);
        } else {
          const seed = seedData();
          setPeople(seed.people);
          setCards(seed.cards);
          setCardTransactions(seed.cardTransactions);
          setOtherExpenses(seed.otherExpenses);
          setSelectedMonth('2026-08');
        }
      } catch (e) {
        setStorageError(true);
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!loaded || !userId) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    const data = { people, cards, cardTransactions, otherExpenses, paletteKey };
    (async () => {
      try {
        await saveUserData(userId, data);
        setStorageError(false);
      } catch (e) {
        setStorageError(true);
      }
    })();
  }, [people, cards, cardTransactions, otherExpenses, paletteKey, loaded, userId]);

  function personTotal(personId, month) {
    const cardSum = cardTransactions.filter(t => t.personId === personId && (!month || matchesMonth(t, month))).reduce((s, t) => s + Number(t.amount || 0), 0);
    const otherSum = otherExpenses.filter(t => t.personId === personId && (!month || matchesMonth(t, month))).reduce((s, t) => s + Number(t.amount || 0), 0);
    return { cardSum, otherSum, total: cardSum + otherSum };
  }
  function cardTotal(cardId, month) {
    return cardTransactions.filter(t => t.cardId === cardId && (!month || matchesMonth(t, month))).reduce((s, t) => s + Number(t.amount || 0), 0);
  }
  const availableMonths = Array.from(new Set([
    selectedMonth,
    ...cardTransactions.map(t => t.date && t.date.slice(0, 7)),
    ...otherExpenses.map(t => t.date && t.date.slice(0, 7)),
  ].filter(Boolean))).sort();
  function personName(id) {
    const p = people.find(p => p.id === id);
    return p ? p.name : '—';
  }
  function personColor(id) {
    const idx = people.findIndex(p => p.id === id);
    const colors = PALETTES[paletteKey]?.people || PALETTES[DEFAULT_PALETTE].people;
    return colors[idx >= 0 ? idx % colors.length : 0];
  }

  function addPerson(name, salary) {
    if (!name.trim()) return;
    setPeople(p => [...p, { id: uid(), name: name.trim(), salary: Number(salary) || 0 }]);
  }
  function removePerson(id) {
    setPeople(p => p.filter(x => x.id !== id));
    setCardTransactions(t => t.filter(x => x.personId !== id));
    setOtherExpenses(t => t.filter(x => x.personId !== id));
  }
  function updateSalary(id, salary) {
    setPeople(p => p.map(x => x.id === id ? { ...x, salary: Number(salary) || 0 } : x));
  }
  function addCard(name, limitValue, bank) {
    if (!name.trim()) return;
    setCards(c => [...c, { id: uid(), name: name.trim(), limitValue: Number(limitValue) || 0, bank: bank || '' }]);
  }
  function removeCard(id) {
    setCards(c => c.filter(x => x.id !== id));
    setCardTransactions(t => t.filter(x => x.cardId !== id));
    setExpandedCard(e => (e === id ? null : e));
  }
  function addCardTransaction(cardId, tx) {
    if (!tx.description.trim() || !tx.personId) return;
    const total = Math.max(1, Math.floor(Number(tx.installments)) || 1);
    const paidCount = Math.min(total, Math.max(0, Math.floor(Number(tx.paidInstallments)) || 0));
    const groupId = uid();
    const participants = [tx.personId, ...((tx.splitWith || []).filter(id => id && id !== tx.personId))];
    const splitGroupId = participants.length > 1 ? uid() : undefined;
    const perPersonAmount = (Number(tx.amount) || 0) / participants.length;
    const perInstallmentAmount = perPersonAmount / total;
    // A data informada é a da PRÓXIMA parcela a vencer (nº paidCount+1).
    // As parcelas já pagas ficam com datas retroativas; as futuras seguem em frente a partir dela.
    const newTxs = participants.flatMap(personId =>
      Array.from({ length: total }, (_, i) => ({
        id: uid(),
        cardId,
        personId,
        description: tx.description.trim(),
        amount: perInstallmentAmount,
        date: monthsLaterDate(tx.date, i - paidCount),
        fixed: !!tx.fixed,
        category: tx.category || DEFAULT_CATEGORY,
        installmentNumber: i + 1,
        installmentTotal: total,
        ...(total > 1 ? { installmentGroupId: groupId } : {}),
        ...(splitGroupId ? { splitGroupId, splitCount: participants.length } : {}),
        paid: i < paidCount,
      }))
    );
    setCardTransactions(t => [...t, ...newTxs]);
  }
  function removeCardTransaction(id) {
    setCardTransactions(t => t.filter(x => x.id !== id));
  }
  function toggleCardTransactionPaid(id) {
    setCardTransactions(t => t.map(x => x.id === id ? { ...x, paid: !x.paid } : x));
  }
  function updateCardTransaction(id, patch) {
    setCardTransactions(t => t.map(x => x.id === id ? {
      ...x,
      description: patch.description?.trim() || x.description,
      amount: Number(patch.amount) || 0,
      date: patch.date || x.date,
      personId: patch.personId || x.personId,
      fixed: !!patch.fixed,
      category: patch.category || x.category || DEFAULT_CATEGORY,
    } : x));
  }
  function addOtherExpense(exp) {
    if (!exp.description.trim() || !exp.personId) return;
    const total = Math.max(1, Math.floor(Number(exp.installments)) || 1);
    const paidCount = Math.min(total, Math.max(0, Math.floor(Number(exp.paidInstallments)) || 0));
    const groupId = uid();
    // Divide o valor igualmente entre o responsável principal e quem mais
    // estiver marcado em "dividir com" (ex.: consórcio dividido com a namorada).
    const participants = [exp.personId, ...((exp.splitWith || []).filter(id => id && id !== exp.personId))];
    const splitGroupId = participants.length > 1 ? uid() : undefined;
    const perPersonAmount = (Number(exp.amount) || 0) / participants.length;
    const perInstallmentAmount = perPersonAmount / total;
    // A data informada é a da PRÓXIMA parcela a vencer (nº paidCount+1).
    // As parcelas já pagas ficam com datas retroativas; as futuras seguem em frente a partir dela.
    const newExpenses = participants.flatMap(personId =>
      Array.from({ length: total }, (_, i) => ({
        id: uid(),
        personId,
        description: exp.description.trim(),
        amount: perInstallmentAmount,
        date: monthsLaterDate(exp.date, i - paidCount),
        fixed: !!exp.fixed,
        category: exp.category || DEFAULT_CATEGORY,
        installmentNumber: i + 1,
        installmentTotal: total,
        ...(total > 1 ? { installmentGroupId: groupId } : {}),
        ...(splitGroupId ? { splitGroupId, splitCount: participants.length } : {}),
        paid: i < paidCount,
      }))
    );
    setOtherExpenses(t => [...t, ...newExpenses]);
  }
  function removeOtherExpense(id) {
    setOtherExpenses(t => t.filter(x => x.id !== id));
  }
  function toggleOtherExpensePaid(id) {
    setOtherExpenses(t => t.map(x => x.id === id ? { ...x, paid: !x.paid } : x));
  }
  function updateOtherExpense(id, patch) {
    setOtherExpenses(t => t.map(x => x.id === id ? {
      ...x,
      description: patch.description?.trim() || x.description,
      amount: Number(patch.amount) || 0,
      date: patch.date || x.date,
      personId: patch.personId || x.personId,
      fixed: !!patch.fixed,
      category: patch.category || x.category || DEFAULT_CATEGORY,
    } : x));
  }
  function clearAll() {
    setPeople([]); setCards([]); setCardTransactions([]); setOtherExpenses([]);
    setConfirmClear(false);
  }

  const pal = PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE];

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: pal.bg, color: pal.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        Carregando extrato…
      </div>
    );
  }

  return (
    <div className="extrato-app" style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif", paddingBottom: '3rem',
      '--bg': pal.bg, '--panel': pal.panel, '--panel-alt': pal.panelAlt, '--border': pal.border, '--border-strong': pal.borderStrong, '--input-bg': pal.inputBg,
      '--text': pal.text, '--text-dim': pal.textDim, '--text-muted': pal.textMuted,
      '--accent': pal.accent, '--accent-light': pal.accentLight,
      '--success': pal.success, '--success-bg': pal.successBg, '--danger': pal.danger, '--danger-bg': pal.dangerBg, '--info': pal.info,
    }}>
      <style>{`
        .extrato-app * { box-sizing: border-box; }
        .extrato-app .display { font-family: 'Fraunces', serif; }
        .extrato-app .mono { font-family: 'IBM Plex Mono', monospace; }
        .extrato-app input, .extrato-app select {
          background: var(--input-bg); border: 1px solid var(--border-strong); color: var(--text);
          border-radius: 8px; padding: 0.45rem 0.6rem; font-family: inherit; font-size: 0.875rem;
          outline: none; transition: border-color 0.15s;
        }
        .extrato-app input:focus, .extrato-app select:focus { border-color: var(--accent); }
        .extrato-app input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
        .extrato-app input[type="number"] { -moz-appearance: textfield; }
        .extrato-app input[type="number"]::-webkit-outer-spin-button,
        .extrato-app input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .extrato-app input:-webkit-autofill,
        .extrato-app input:-webkit-autofill:hover,
        .extrato-app input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--text);
          -webkit-box-shadow: 0 0 0 1000px var(--input-bg) inset;
          transition: background-color 5000s ease-in-out 0s;
        }
        .extrato-app ::-webkit-scrollbar { height: 8px; width: 8px; }
        .extrato-app ::-webkit-scrollbar-track { background: transparent; }
        .extrato-app ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .extrato-app ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        .extrato-app button.primary {
          background: var(--accent); color: var(--bg); border: none; border-radius: 8px;
          padding: 0.5rem 0.9rem; font-weight: 600; font-size: 0.875rem; cursor: pointer;
          display: inline-flex; align-items: center; gap: 0.4rem; transition: filter 0.15s;
        }
        .extrato-app button.primary:hover { filter: brightness(1.1); }
        .extrato-app button.primary:focus-visible, .extrato-app button.ghost:focus-visible, .extrato-app select:focus-visible, .extrato-app input:focus-visible {
          outline: 2px solid var(--accent-light); outline-offset: 2px;
        }
        .extrato-app button.ghost {
          background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px;
          padding: 0.4rem 0.7rem; font-size: 0.8rem; cursor: pointer;
        }
        .extrato-app button.ghost:hover { border-color: var(--accent); color: var(--text); }
        .extrato-app button.icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; }
        .extrato-app button.icon:hover { color: var(--danger); }
        .extrato-app .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; }
        .extrato-app .credit-card { border-radius: 18px; padding: 1.1rem 1.3rem; position: relative; overflow: hidden; cursor: pointer;
          transition: transform 0.2s ease; min-width: 250px; }
        .extrato-app .credit-card:hover { transform: translateY(-3px); }
        .extrato-app .bank-mono {
          width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center;
          font-family: 'Fraunces', serif; font-weight: 700; font-size: 0.85rem; color: #fff;
          background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.35); letter-spacing: -0.02em;
        }
        @media (prefers-reduced-motion: reduce) {
          .extrato-app .credit-card, .extrato-app button.primary { transition: none; }
          .extrato-app .credit-card:hover { transform: none; }
        }
        @media print {
          .extrato-app { background: #fff; color: #111; }
          .extrato-app main > *:not(#relatorio-print-area) { display: none !important; }
          .extrato-app header { display: none !important; }
          .extrato-app .no-print { display: none !important; }
          .extrato-app #relatorio-print-area { background: #fff; border: none; padding: 0; color: #111; }
          .extrato-app #relatorio-print-area .mono, .extrato-app #relatorio-print-area * { color: #111 !important; }
        }
      `}</style>

      <header style={{ padding: '2.5rem 1.5rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="display" style={{ fontSize: '2.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Gestor de Gastos</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>gestão de contas compartilhadas</span>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <Palette size={15} />
              <select value={paletteKey} onChange={e => setPaletteKey(e.target.value)}>
                {Object.entries(PALETTES).map(([key, pal]) => <option key={key} value={key}>{pal.label}</option>)}
              </select>
            </label>
            <button className="ghost" onClick={() => (confirmClear ? clearAll() : setConfirmClear(true))}>
              {confirmClear ? 'Confirmar limpeza' : 'Limpar tudo'}
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user?.email}</span>
            <button className="ghost" onClick={logout} title="Sair">
              <LogOut size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Sair
            </button>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.1rem' }}>
          <button className="icon" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {availableMonths.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{monthLabel(m)}</option>)}
          </select>
          <button className="icon" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
        </div>

        {storageError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Não consegui sincronizar seus dados com o servidor agora. Verifique sua conexão.
          </p>
        )}
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <PeopleSection people={people} onAdd={addPerson} onRemove={removePerson} onSalary={updateSalary} personColor={personColor} />

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Ver gastos de:</span>
          <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
            <option value="all">Todas as pessoas</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <CardsSection
          cards={cards} people={people} cardTransactions={cardTransactions}
          filterPerson={filterPerson} selectedMonth={selectedMonth} expandedCard={expandedCard} setExpandedCard={setExpandedCard}
          onAddCard={addCard} onRemoveCard={removeCard}
          onAddTx={addCardTransaction} onRemoveTx={removeCardTransaction} onTogglePaid={toggleCardTransactionPaid} onUpdateTx={updateCardTransaction}
          cardTotal={cardTotal} personName={personName} personColor={personColor} cardGradients={pal.cardGradients}
        />

        <OtherExpensesSection
          expenses={otherExpenses} people={people} filterPerson={filterPerson} selectedMonth={selectedMonth}
          onAdd={addOtherExpense} onRemove={removeOtherExpense} onUpdate={updateOtherExpense} onTogglePaid={toggleOtherExpensePaid}
          personName={personName} personColor={personColor}
        />

        <CategorySummarySection
          people={people} cardTransactions={cardTransactions} otherExpenses={otherExpenses}
          filterPerson={filterPerson} selectedMonth={selectedMonth} categoryColors={pal.people}
        />

        <SummarySection people={people} personTotal={personTotal} personColor={personColor} selectedMonth={selectedMonth} />

        <ReportSection
          people={people} cards={cards} cardTransactions={cardTransactions} otherExpenses={otherExpenses}
          selectedMonth={selectedMonth} personTotal={personTotal} personColor={personColor}
        />
      </main>
    </div>
  );
}

function PeopleSection({ people, onAdd, onRemove, onSalary, personColor }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');

  function submit() {
    onAdd(name, salary);
    setName(''); setSalary(''); setShowForm(false);
  }

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Pessoas & salários</h2>
        <button className="ghost" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Pessoa
        </button>
      </div>

      {people.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma pessoa cadastrada ainda. Adicione quem usa as contas.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {people.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: personColor(p.id), flexShrink: 0 }} />
            <span style={{ minWidth: 120, fontWeight: 500 }}>{p.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>salário</span>
            <input type="number" value={p.salary} onChange={e => onSalary(p.id, e.target.value)} style={{ width: 110 }} />
            <button className="icon" onClick={() => onRemove(p.id)} aria-label={`Remover ${p.name}`}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} style={{ flex: '1 1 140px' }} />
          <input placeholder="Salário" type="number" value={salary} onChange={e => setSalary(e.target.value)} style={{ width: 110 }} />
          <button className="primary" onClick={submit}>Adicionar</button>
        </div>
      )}
    </section>
  );
}

function CardsSection({ cards, people, cardTransactions, filterPerson, selectedMonth, expandedCard, setExpandedCard, onAddCard, onRemoveCard, onAddTx, onRemoveTx, onTogglePaid, onUpdateTx, cardTotal, personName, personColor, cardGradients }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [bank, setBank] = useState('');

  function submit() {
    onAddCard(name, limitValue, bank);
    setName(''); setLimitValue(''); setBank(''); setShowForm(false);
  }

  const activeCard = cards.find(c => c.id === expandedCard);

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Cartões de crédito</h2>
        <button className="ghost" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Cartão
        </button>
      </div>

      {showForm && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Nome do cartão" value={name} onChange={e => setName(e.target.value)} style={{ flex: '1 1 160px' }} />
          <select value={bank} onChange={e => setBank(e.target.value)} style={{ width: 150 }}>
            <option value="">Sem bandeira</option>
            {Object.entries(BANKS).map(([key, b]) => <option key={key} value={key}>{b.label}</option>)}
          </select>
          <input placeholder="Limite" type="number" value={limitValue} onChange={e => setLimitValue(e.target.value)} style={{ width: 110 }} />
          <button className="primary" onClick={submit}>Adicionar</button>
        </div>
      )}

      {cards.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum cartão cadastrado. Adicione o primeiro para começar a lançar gastos.</p>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {cards.map((c, i) => {
            const bankInfo = c.bank && BANKS[c.bank];
            const [ca, cb] = bankInfo ? bankInfo.gradient : cardGradients[i % cardGradients.length];
            const chipColor = bankInfo ? bankInfo.chip : null;
            const used = cardTotal(c.id, selectedMonth);
            const pct = c.limitValue > 0 ? Math.min(100, (used / c.limitValue) * 100) : 0;
            return (
              <div key={c.id} className="credit-card" onClick={() => setExpandedCard(expandedCard === c.id ? null : c.id)}
                style={{ background: `linear-gradient(135deg, ${ca}, ${cb})`, flex: '0 0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 30, height: 22, borderRadius: 5, background: chipColor ? `linear-gradient(135deg, ${chipColor}, #ffffffaa)` : 'linear-gradient(135deg,var(--accent-light),var(--accent))' }} />
                    {bankInfo && (
                      <span className="bank-mono" title={bankInfo.label}>{bankInfo.mono}</span>
                    )}
                  </div>
                  {bankInfo && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                      {bankInfo.label}
                    </span>
                  )}
                  <button className="icon" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={e => { e.stopPropagation(); onRemoveCard(c.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: '0.8rem', color: '#fff' }}>{money(used)} <span style={{ color: 'rgba(255,255,255,0.5)' }}>/ {money(c.limitValue)}</span></div>
                  </div>
                  {expandedCard === c.id ? <ChevronUp size={16} color="rgba(255,255,255,0.7)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.7)" />}
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: '0.6rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: used > c.limitValue ? 'var(--danger)' : (chipColor || 'var(--accent-light)') }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeCard && (
        <CardLedger
          card={activeCard}
          people={people}
          selectedMonth={selectedMonth}
          transactions={cardTransactions.filter(t => t.cardId === activeCard.id && matchesMonth(t, selectedMonth) && (filterPerson === 'all' || t.personId === filterPerson))}
          onAddTx={onAddTx} onRemoveTx={onRemoveTx} onTogglePaid={onTogglePaid} onUpdateTx={onUpdateTx}
          personName={personName} personColor={personColor}
        />
      )}
    </section>
  );
}

function CardLedger({ card, people, transactions, selectedMonth, onAddTx, onRemoveTx, onTogglePaid, onUpdateTx, personName, personColor }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [date, setDate] = useState(`${selectedMonth}-01`);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [fixed, setFixed] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [splitWith, setSplitWith] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    if (people.length > 0 && !people.find(p => p.id === personId)) setPersonId(people[0].id);
  }, [people]);

  useEffect(() => {
    setSplitWith(prev => prev.filter(id => id !== personId));
  }, [personId]);

  useEffect(() => {
    setDate(`${selectedMonth}-01`);
  }, [selectedMonth]);

  const installmentsNum = Math.max(1, Math.floor(Number(installments)) || 1);
  const splitCount = 1 + splitWith.length;

  function submit() {
    onAddTx(card.id, { description: desc, amount, personId, date, category, fixed, installments, paidInstallments, splitWith });
    setDesc(''); setAmount(''); setCategory(DEFAULT_CATEGORY); setFixed(false); setInstallments('1'); setPaidInstallments('0'); setSplitWith([]);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditDraft({ description: t.description, amount: String(t.amount), personId: t.personId, date: t.date, fixed: !!t.fixed, category: t.category || DEFAULT_CATEGORY });
  }
  function cancelEdit() {
    setEditingId(null); setEditDraft(null);
  }
  function saveEdit(id) {
    onUpdateTx(id, editDraft);
    setEditingId(null); setEditDraft(null);
  }

  const fixedTotal = transactions.filter(t => t.fixed && matchesMonth(t, selectedMonth)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="panel" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dim)' }}>Lançamentos · {card.name}</h3>
        {fixedTotal > 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>fixos: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(fixedTotal)}</span>/mês</span>
        )}
      </div>

      {people.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Cadastre uma pessoa acima para lançar gastos neste cartão.</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} style={{ flex: '1 1 160px' }} />
          <input type="number" placeholder="Valor total" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: 100 }} />
          <select value={personId} onChange={e => setPersonId(e.target.value)}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} style={{ width: 'auto', padding: 0 }} />
            fixo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            parcelas
            <input type="number" min="1" placeholder="1" value={installments}
              onChange={e => {
                setInstallments(e.target.value);
                const max = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                if (Number(paidInstallments) > max) setPaidInstallments(String(max));
              }} style={{ width: 60 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            já pagas
            <input type="number" min="0" max={installmentsNum} placeholder="0" value={paidInstallments}
              onChange={e => setPaidInstallments(e.target.value)} style={{ width: 60 }} />
          </label>
          {people.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              dividir com
              {people.filter(p => p.id !== personId).map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={splitWith.includes(p.id)}
                    onChange={e => setSplitWith(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                    style={{ width: 'auto', padding: 0 }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <button className="primary" onClick={submit}><Plus size={14} /> Lançar</button>
        </div>
      )}
      {people.length > 0 && installmentsNum > 1 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-0.6rem', marginBottom: '0.9rem' }}>
          Vai gerar {installmentsNum} lançamentos de {money((Number(amount) || 0) / splitCount / installmentsNum)}.{' '}
          {Number(paidInstallments) > 0
            ? <>{Number(paidInstallments)} já pagas (datadas antes de {fmtDate(date)}) e {installmentsNum - Number(paidInstallments)} a partir de {fmtDate(date)}, uma por mês.</>
            : <>Uma por mês a partir de {fmtDate(date)}.</>}
          {splitCount > 1 && <> Dividido entre {splitCount} pessoas.</>}
        </p>
      )}
      {people.length > 0 && installmentsNum === 1 && splitCount > 1 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-0.6rem', marginBottom: '0.9rem' }}>
          Vai gerar {splitCount} lançamentos de {money((Number(amount) || 0) / splitCount)}, um pra cada pessoa.
        </p>
      )}

      {sorted.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nenhum lançamento para esse filtro.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {sorted.map(t => (
            editingId === t.id ? (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', background: 'var(--panel-alt)', borderRadius: 8 }}>
                <input type="date" value={editDraft.date} onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))} style={{ width: 130 }} />
                <select value={editDraft.personId} onChange={e => setEditDraft(d => ({ ...d, personId: e.target.value }))}>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} style={{ flex: '1 1 140px' }} />
                <select value={editDraft.category} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={editDraft.amount} onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))} style={{ width: 90 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editDraft.fixed} onChange={e => setEditDraft(d => ({ ...d, fixed: e.target.checked }))} style={{ width: 'auto', padding: 0 }} />
                  fixo
                </label>
                <button className="icon" onClick={() => saveEdit(t.id)} title="Salvar" style={{ color: 'var(--success)' }}><Check size={16} /></button>
                <button className="icon" onClick={cancelEdit} title="Cancelar"><X size={16} /></button>
              </div>
            ) : (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span className="mono" style={{ color: 'var(--text-muted)', width: 60 }}>{fmtDate(t.date)}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: personColor(t.personId), flexShrink: 0 }} />
                <span style={{ color: 'var(--text-dim)', width: 100, flexShrink: 0 }}>{personName(t.personId)}</span>
                <span style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {t.description}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--border)', borderRadius: 4, padding: '0.1rem 0.4rem' }}>
                    {t.category || DEFAULT_CATEGORY}
                  </span>
                  {t.fixed && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--bg)', background: 'var(--accent)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.03em' }}>FIXO</span>
                  )}
                  {t.installmentTotal > 1 && (
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--bg)', background: 'var(--info)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600 }}>
                      {t.installmentNumber}/{t.installmentTotal}
                    </span>
                  )}
                  {t.splitGroupId && (
                    <span title={`Dividido entre ${t.splitCount} pessoas`} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--border)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                      DIVIDIDO ÷{t.splitCount}
                    </span>
                  )}
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{money(t.amount)}</span>
                {t.installmentTotal > 1 && (
                  <button
                    onClick={() => onTogglePaid(t.id)}
                    style={{
                      fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em', border: 'none', borderRadius: 4,
                      padding: '0.15rem 0.45rem', cursor: 'pointer',
                      background: t.paid ? 'var(--success-bg)' : 'var(--danger-bg)', color: t.paid ? 'var(--success)' : 'var(--danger)',
                    }}
                    title="Clique para alternar pago/pendente"
                  >
                    {t.paid ? 'PAGA' : 'PENDENTE'}
                  </button>
                )}
                <button className="icon" onClick={() => startEdit(t)} title="Editar"><Pencil size={14} /></button>
                <button className="icon" onClick={() => onRemoveTx(t.id)}><Trash2 size={14} /></button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function OtherExpensesSection({ expenses, people, filterPerson, selectedMonth, onAdd, onRemove, onUpdate, onTogglePaid, personName, personColor }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [date, setDate] = useState(`${selectedMonth}-01`);
  const [fixed, setFixed] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [installments, setInstallments] = useState('1');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [splitWith, setSplitWith] = useState([]);
  const [onlyFixed, setOnlyFixed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    if (people.length > 0 && !people.find(p => p.id === personId)) setPersonId(people[0].id);
  }, [people]);

  // Se a pessoa selecionada como responsável estiver marcada em "dividir com",
  // tira ela de lá pra não duplicar.
  useEffect(() => {
    setSplitWith(prev => prev.filter(id => id !== personId));
  }, [personId]);

  useEffect(() => {
    setDate(`${selectedMonth}-01`);
  }, [selectedMonth]);

  const installmentsNum = Math.max(1, Math.floor(Number(installments)) || 1);
  const splitCount = 1 + splitWith.length;

  function submit() {
    onAdd({ description: desc, amount, personId, date, fixed, category, installments, paidInstallments, splitWith });
    setDesc(''); setAmount(''); setFixed(false); setCategory(DEFAULT_CATEGORY); setInstallments('1'); setPaidInstallments('0'); setSplitWith([]);
  }

  function startEdit(e) {
    setEditingId(e.id);
    setEditDraft({ description: e.description, amount: String(e.amount), personId: e.personId, date: e.date, fixed: !!e.fixed, category: e.category || DEFAULT_CATEGORY });
  }
  function cancelEdit() {
    setEditingId(null); setEditDraft(null);
  }
  function saveEdit(id) {
    onUpdate(id, editDraft);
    setEditingId(null); setEditDraft(null);
  }

  const fixedTotal = expenses.filter(e => e.fixed && matchesMonth(e, selectedMonth)).reduce((s, e) => s + Number(e.amount || 0), 0);

  const filtered = expenses.filter(e => matchesMonth(e, selectedMonth) && (filterPerson === 'all' || e.personId === filterPerson) && (!onlyFixed || e.fixed))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Outros gastos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          {fixedTotal > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>fixos: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(fixedTotal)}</span>/mês</span>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyFixed} onChange={e => setOnlyFixed(e.target.checked)} style={{ width: 'auto', padding: 0 }} />
            só fixos
          </label>
        </div>
      </div>

      {people.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cadastre uma pessoa acima para lançar gastos.</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <input placeholder="Descrição (ex: aluguel)" value={desc} onChange={e => setDesc(e.target.value)} style={{ flex: '1 1 180px' }} />
          <input type="number" placeholder="Valor total" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: 100 }} />
          <select value={personId} onChange={e => setPersonId(e.target.value)}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} style={{ width: 'auto', padding: 0 }} />
            fixo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            parcelas
            <input type="number" min="1" placeholder="1" value={installments}
              onChange={e => {
                setInstallments(e.target.value);
                const max = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                if (Number(paidInstallments) > max) setPaidInstallments(String(max));
              }} style={{ width: 60 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            já pagas
            <input type="number" min="0" max={installmentsNum} placeholder="0" value={paidInstallments}
              onChange={e => setPaidInstallments(e.target.value)} style={{ width: 60 }} />
          </label>
          {people.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              dividir com
              {people.filter(p => p.id !== personId).map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={splitWith.includes(p.id)}
                    onChange={e => setSplitWith(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                    style={{ width: 'auto', padding: 0 }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <button className="primary" onClick={submit}><Plus size={14} /> Lançar</button>
        </div>
      )}
      {people.length > 0 && installmentsNum > 1 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-0.6rem', marginBottom: '0.9rem' }}>
          Vai gerar {installmentsNum} lançamentos de {money((Number(amount) || 0) / splitCount / installmentsNum)}.{' '}
          {Number(paidInstallments) > 0
            ? <>{Number(paidInstallments)} já pagas (datadas antes de {fmtDate(date)}) e {installmentsNum - Number(paidInstallments)} a partir de {fmtDate(date)}, uma por mês.</>
            : <>Uma por mês a partir de {fmtDate(date)}. Ex.: financiamento de moto em {installmentsNum}x.</>}
          {splitCount > 1 && <> Dividido entre {splitCount} pessoas.</>}
        </p>
      )}
      {people.length > 0 && installmentsNum === 1 && splitCount > 1 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-0.6rem', marginBottom: '0.9rem' }}>
          Vai gerar {splitCount} lançamentos de {money((Number(amount) || 0) / splitCount)}, um pra cada pessoa.
        </p>
      )}

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum gasto fora do cartão registrado ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map(e => (
            editingId === e.id ? (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', background: 'var(--panel-alt)', borderRadius: 8 }}>
                <input type="date" value={editDraft.date} onChange={ev => setEditDraft(d => ({ ...d, date: ev.target.value }))} style={{ width: 130 }} />
                <select value={editDraft.personId} onChange={ev => setEditDraft(d => ({ ...d, personId: ev.target.value }))}>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input value={editDraft.description} onChange={ev => setEditDraft(d => ({ ...d, description: ev.target.value }))} style={{ flex: '1 1 140px' }} />
                <select value={editDraft.category} onChange={ev => setEditDraft(d => ({ ...d, category: ev.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={editDraft.amount} onChange={ev => setEditDraft(d => ({ ...d, amount: ev.target.value }))} style={{ width: 90 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editDraft.fixed} onChange={ev => setEditDraft(d => ({ ...d, fixed: ev.target.checked }))} style={{ width: 'auto', padding: 0 }} />
                  fixo
                </label>
                <button className="icon" onClick={() => saveEdit(e.id)} title="Salvar" style={{ color: 'var(--success)' }}><Check size={16} /></button>
                <button className="icon" onClick={cancelEdit} title="Cancelar"><X size={16} /></button>
              </div>
            ) : (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span className="mono" style={{ color: 'var(--text-muted)', width: 60 }}>{fmtDate(e.date)}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: personColor(e.personId), flexShrink: 0 }} />
                <span style={{ color: 'var(--text-dim)', width: 100, flexShrink: 0 }}>{personName(e.personId)}</span>
                <span style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {e.description}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--border)', borderRadius: 4, padding: '0.1rem 0.4rem' }}>
                    {e.category || DEFAULT_CATEGORY}
                  </span>
                  {e.fixed && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--bg)', background: 'var(--accent)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.03em' }}>FIXO</span>
                  )}
                  {e.installmentTotal > 1 && (
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--bg)', background: 'var(--info)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600 }}>
                      {e.installmentNumber}/{e.installmentTotal}
                    </span>
                  )}
                  {e.splitGroupId && (
                    <span title={`Dividido entre ${e.splitCount} pessoas`} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--border)', borderRadius: 4, padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                      DIVIDIDO ÷{e.splitCount}
                    </span>
                  )}
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{money(e.amount)}</span>
                {e.installmentTotal > 1 && (
                  <button
                    onClick={() => onTogglePaid(e.id)}
                    style={{
                      fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em', border: 'none', borderRadius: 4,
                      padding: '0.15rem 0.45rem', cursor: 'pointer',
                      background: e.paid ? 'var(--success-bg)' : 'var(--danger-bg)', color: e.paid ? 'var(--success)' : 'var(--danger)',
                    }}
                    title="Clique para alternar pago/pendente"
                  >
                    {e.paid ? 'PAGA' : 'PENDENTE'}
                  </button>
                )}
                <button className="icon" onClick={() => startEdit(e)} title="Editar"><Pencil size={14} /></button>
                <button className="icon" onClick={() => onRemove(e.id)}><Trash2 size={14} /></button>
              </div>
            )
          ))}
        </div>
      )}
    </section>
  );
}

function CategorySummarySection({ people, cardTransactions, otherExpenses, filterPerson, selectedMonth, categoryColors }) {
  const all = [...cardTransactions, ...otherExpenses].filter(t =>
    matchesMonth(t, selectedMonth) && (filterPerson === 'all' || t.personId === filterPerson)
  );
  const totals = {};
  let grandTotal = 0;
  for (const t of all) {
    const cat = t.category || DEFAULT_CATEGORY;
    totals[cat] = (totals[cat] || 0) + Number(t.amount || 0);
    grandTotal += Number(t.amount || 0);
  }
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const catColor = (i) => categoryColors[i % categoryColors.length];

  return (
    <section className="panel">
      <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1rem' }}>Gastos por categoria</h2>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum gasto categorizado neste mês ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {rows.map(([cat, total], i) => {
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(i) }} />
                    {cat}
                  </span>
                  <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(total)} <span style={{ color: 'var(--text-muted)' }}>({pct.toFixed(0)}%)</span></span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: catColor(i), borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReportSection({ people, cards, cardTransactions, otherExpenses, selectedMonth, personTotal, personColor }) {
  const [target, setTarget] = useState('all');
  const [open, setOpen] = useState(false);

  function cardName(id) {
    const c = cards.find(c => c.id === id);
    return c ? c.name : '—';
  }

  function movementsFor(personId) {
    const cardMoves = cardTransactions
      .filter(t => t.personId === personId && matchesMonth(t, selectedMonth))
      .map(t => ({ ...t, source: cardName(t.cardId) }));
    const otherMoves = otherExpenses
      .filter(t => t.personId === personId && matchesMonth(t, selectedMonth))
      .map(t => ({ ...t, source: t.fixed ? 'Gasto fixo' : 'Outro gasto' }));
    return [...cardMoves, ...otherMoves].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  const targets = target === 'all' ? people : people.filter(p => p.id === target);
  const grandTotals = targets.reduce((acc, p) => {
    const { total } = personTotal(p.id, selectedMonth);
    acc.salary += Number(p.salary || 0);
    acc.spent += total;
    return acc;
  }, { salary: 0, spent: 0 });

  return (
    <section className="panel" id="relatorio-print-area">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Relatório</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={target} onChange={e => { setTarget(e.target.value); setOpen(false); }}>
            <option value="all">Todos</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="primary" onClick={() => setOpen(true)}>Gerar relatório</button>
          {open && <button className="ghost" onClick={() => window.print()}>Imprimir / salvar PDF</button>}
        </div>
      </div>

      {!open ? (
        <p className="no-print" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Escolha "Todos" ou uma pessoa e clique em "Gerar relatório" para ver o extrato consolidado do mês.
        </p>
      ) : people.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma pessoa cadastrada.</p>
      ) : (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="display" style={{ fontSize: '1.3rem' }}>Relatório de gastos</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'capitalize' }}>
              {monthLabel(selectedMonth)} · {target === 'all' ? 'todas as pessoas' : people.find(p => p.id === target)?.name}
            </div>
          </div>

          {targets.map(p => {
            const moves = movementsFor(p.id);
            const { total } = personTotal(p.id, selectedMonth);
            const remaining = p.salary - total;
            return (
              <div key={p.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: personColor(p.id) }} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.82rem' }}>
                    salário {money(p.salary)} · gasto {money(total)} ·{' '}
                    <span style={{ color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {remaining >= 0 ? 'sobra' : 'falta'} {money(Math.abs(remaining))}
                    </span>
                  </span>
                </div>
                {moves.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nenhum gasto neste mês.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {moves.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ color: 'var(--text-muted)', width: 56 }}>{fmtDate(m.date)}</span>
                        <span style={{ color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>{m.source}</span>
                        <span style={{ flex: 1, minWidth: 100 }}>{m.description}</span>
                        <span className="mono">{money(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {target === 'all' && people.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total geral</span>
              <span className="mono">{money(grandTotals.spent)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>de {money(grandTotals.salary)}</span></span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SummarySection({ people, personTotal, personColor, selectedMonth }) {
  return (
    <section className="panel">
      <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1rem' }}>Resumo do mês</h2>
      {people.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cadastre pessoas para ver o resumo.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {people.map(p => {
            const { total } = personTotal(p.id, selectedMonth);
            const remaining = p.salary - total;
            const pct = p.salary > 0 ? Math.min(100, (total / p.salary) * 100) : 0;
            return (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: personColor(p.id) }} />
                    {p.name}
                  </span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {remaining >= 0 ? 'sobra ' : 'falta '}{money(Math.abs(remaining))}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: total > p.salary ? 'var(--danger)' : 'var(--accent)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>gasto: {money(total)}</span>
                  <span>salário: {money(p.salary)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
