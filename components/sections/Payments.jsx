'use client';

import React, { useState } from 'react';
import { money, monthLabel, matchesMonth, shiftMonth, sumAmounts, isPayee, PAYMENT_METHODS, capitalize } from '../../lib/ledger';

// Crédito x outras formas (Pix, débito, boleto…): compras do mês e dos últimos
// 6 meses. Duas cores fixas (--chart-credit / --chart-other), validadas para
// daltonismo e contraste em todas as paletas; texto sempre na cor do texto.
const CREDIT = 'var(--chart-credit)';
const OTHER = 'var(--chart-other)';

function splitMonth(month, cards, cardTransactions, otherExpenses, inScope) {
  const payeeIds = new Set(cards.filter(isPayee).map(c => c.id));
  const cardTx = cardTransactions.filter(t => matchesMonth(t, month) && inScope(t));
  const credit = sumAmounts(cardTx.filter(t => !payeeIds.has(t.cardId)));
  const owed = sumAmounts(cardTx.filter(t => payeeIds.has(t.cardId)));
  const others = otherExpenses.filter(e => matchesMonth(e, month) && inScope(e));
  const byMethod = PAYMENT_METHODS.map(m => ({ key: m.key, label: m.label, total: sumAmounts(others.filter(e => e.method === m.key)) }));
  const noMethod = sumAmounts(others.filter(e => !PAYMENT_METHODS.some(m => m.key === e.method)));
  const other = sumAmounts(others) + owed;
  return { credit, other, owed, byMethod, noMethod };
}

export function PaymentsSection({ cards, cardTransactions, otherExpenses, filterPerson, selectedMonth }) {
  const [hover, setHover] = useState(null);
  const inScope = t => filterPerson === 'all' || t.personId === filterPerson;
  const now = splitMonth(selectedMonth, cards, cardTransactions, otherExpenses, inScope);
  const total = now.credit + now.other;
  const pct = v => (total > 0 ? Math.round((v / total) * 100) : 0);
  const monthName = m => monthLabel(m).split(' ')[0];

  // Por forma de pagamento (só o que teve gasto), maior primeiro.
  const rows = [
    { key: 'credit', label: 'Cartão de crédito', total: now.credit, color: CREDIT },
    ...now.byMethod.map(m => ({ ...m, color: OTHER })),
    { key: 'owed', label: 'Devo a pessoas', total: now.owed, color: OTHER },
    { key: 'none', label: 'Sem forma informada', total: now.noMethod, color: OTHER },
  ].filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  const maxRow = Math.max(1, ...rows.map(r => r.total));

  // Últimos 6 meses até o mês escolhido.
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(selectedMonth, i - 5));
  const series = months.map(m => ({ month: m, ...splitMonth(m, cards, cardTransactions, otherExpenses, inScope) }));
  const maxMonth = Math.max(1, ...series.map(s => s.credit + s.other));
  const shown = series.find(s => s.month === hover) || series[series.length - 1];

  return (
    <section className="panel" aria-labelledby="pay-title">
      <h2 id="pay-title" className="display section-title">Crédito x débito</h2>
      <p className="hint" style={{ margin: '0.3rem 0 1rem' }}>
        Compras de {monthName(selectedMonth)}: no cartão de crédito e nas outras formas (Pix, débito, boleto, dinheiro…).
      </p>

      {total === 0 ? (
        <p className="muted">Nenhum gasto em {monthLabel(selectedMonth)}.</p>
      ) : (
        <>
          {/* Divisão do mês: uma barra, dois segmentos, com legenda e valores */}
          <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden', background: 'var(--border)' }}
            role="img" aria-label={`Crédito ${money(now.credit)} (${pct(now.credit)}%), outras formas ${money(now.other)} (${pct(now.other)}%)`}>
            {now.credit > 0 && <span style={{ flex: now.credit, background: CREDIT }} />}
            {now.other > 0 && <span style={{ flex: now.other, background: OTHER }} />}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem 1.5rem', flexWrap: 'wrap', marginTop: '0.6rem', fontSize: '0.85rem' }}>
            <LegendItem color={CREDIT} label="Crédito" value={`${money(now.credit)} · ${pct(now.credit)}%`} />
            <LegendItem color={OTHER} label="Outras formas" value={`${money(now.other)} · ${pct(now.other)}%`} />
          </div>

          {/* Por forma de pagamento */}
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.25rem 0 0.5rem' }}>
            Por forma de pagamento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {rows.map(r => (
              <div key={r.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                  <span>{r.label}</span>
                  <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(r.total)} <span style={{ color: 'var(--text-muted)' }}>({pct(r.total)}%)</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(r.total / maxRow) * 100}%`, background: r.color, borderRadius: '0 4px 4px 0' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Últimos 6 meses: colunas empilhadas (crédito embaixo, outras em cima) */}
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.5rem 0 0.5rem' }}>
        Últimos 6 meses
      </div>
      <div style={{ fontSize: '0.82rem', minHeight: '1.3em', marginBottom: '0.5rem' }} aria-live="polite">
        <strong>{capitalize(monthName(shown.month))}:</strong>{' '}
        <span className="mono">crédito {money(shown.credit)} · outras {money(shown.other)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: 140, borderBottom: '1px solid var(--border-strong)' }}
        onMouseLeave={() => setHover(null)}>
        {series.map(s => {
          const h = v => `${(v / maxMonth) * 100}%`;
          const active = (hover || selectedMonth) === s.month;
          return (
            <button key={s.month} type="button" onMouseEnter={() => setHover(s.month)} onFocus={() => setHover(s.month)} onClick={() => setHover(s.month)}
              aria-label={`${monthLabel(s.month)}: crédito ${money(s.credit)}, outras formas ${money(s.other)}`}
              style={{
                flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, padding: '0 4px',
                background: active ? 'var(--panel-alt)' : 'transparent', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              }}>
              {s.other > 0 && <span style={{ height: h(s.other), background: OTHER, borderRadius: s.credit > 0 ? '4px 4px 0 0' : '4px 4px 0 0', minHeight: 2 }} />}
              {s.credit > 0 && <span style={{ height: h(s.credit), background: CREDIT, borderRadius: s.other > 0 ? 0 : '4px 4px 0 0', minHeight: 2 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem' }}>
        {series.map(s => (
          <span key={s.month} style={{
            flex: 1, textAlign: 'center', fontSize: '0.72rem',
            color: s.month === selectedMonth ? 'var(--text)' : 'var(--text-muted)', fontWeight: s.month === selectedMonth ? 600 : 400,
          }}>{monthName(s.month).slice(0, 3)}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        <LegendItem color={CREDIT} label="Crédito" />
        <LegendItem color={OTHER} label="Outras formas" />
      </div>

      {/* Tabela para leitores de tela */}
      <table className="sr-only">
        <caption>Crédito e outras formas nos últimos 6 meses</caption>
        <thead><tr><th>Mês</th><th>Crédito</th><th>Outras formas</th></tr></thead>
        <tbody>{series.map(s => <tr key={s.month}><td>{monthLabel(s.month)}</td><td>{money(s.credit)}</td><td>{money(s.other)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      {label}{value && <span className="mono" style={{ fontWeight: 600 }}>{value}</span>}
    </span>
  );
}
