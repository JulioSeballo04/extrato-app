'use client';

import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { Dot } from '../ui';
import { DEFAULT_CATEGORY, money, fmtDate, monthLabel, matchesMonth, isRecurring } from '../../lib/ledger';

export function CategorySummarySection({ cardTransactions, otherExpenses, filterPerson, selectedMonth, categoryColors }) {
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
      <h2 className="display section-title" style={{ marginBottom: '1rem' }}>Gastos por categoria</h2>
      {rows.length === 0 ? (
        <p className="muted">Nenhum gasto neste mês ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {rows.map(([cat, total], i) => {
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Dot color={catColor(i)} />
                    {cat}
                  </span>
                  <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(total)} <span style={{ color: 'var(--text-muted)' }}>({pct.toFixed(0)}%)</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
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

export function SummarySection({ people, personTotal, personColor, selectedMonth }) {
  return (
    <section className="panel">
      <h2 className="display section-title" style={{ marginBottom: '1rem' }}>Resumo por pessoa</h2>
      {people.length === 0 ? (
        <p className="muted">Cadastre pessoas para ver o resumo.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {people.map(p => {
            const { total, cardSum, otherSum } = personTotal(p.id, selectedMonth);
            const salary = Number(p.salary) || 0;
            const remaining = salary - total;
            const pct = salary > 0 ? Math.min(100, (total / salary) * 100) : 0;
            return (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <Dot color={personColor(p.id)} size={10} />
                    {p.name}
                  </span>
                  {salary > 0 ? (
                    <span className="mono" style={{ fontSize: '0.85rem', color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {remaining >= 0 ? 'sobra ' : 'falta '}{money(Math.abs(remaining))}
                    </span>
                  ) : (
                    <span className="mono" style={{ fontSize: '0.85rem' }}>{money(total)}</span>
                  )}
                </div>
                {salary > 0 && (
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: total > salary ? 'var(--danger)' : 'var(--accent)', borderRadius: 3 }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>no cartão {money(cardSum)} · outros {money(otherSum)}</span>
                  {salary > 0 && <span>gasto {money(total)} de {money(salary)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ReportSection({ people, cards, cardTransactions, otherExpenses, selectedMonth, personTotal, personColor }) {
  const [target, setTarget] = useState('all');

  function cardName(id) {
    const c = cards.find(c => c.id === id);
    return c ? `Cartão ${c.name}` : 'Cartão';
  }

  function movementsFor(personId) {
    const cardMoves = cardTransactions
      .filter(t => t.personId === personId && matchesMonth(t, selectedMonth))
      .map(t => ({ ...t, source: cardName(t.cardId) }));
    const otherMoves = otherExpenses
      .filter(t => t.personId === personId && matchesMonth(t, selectedMonth))
      .map(t => ({ ...t, source: isRecurring(t) ? 'Gasto fixo' : 'Outro gasto' }));
    return [...cardMoves, ...otherMoves].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  const targets = target === 'all' ? people : people.filter(p => p.id === target);
  const grandTotals = targets.reduce((acc, p) => {
    acc.salary += Number(p.salary || 0);
    acc.spent += personTotal(p.id, selectedMonth).total;
    return acc;
  }, { salary: 0, spent: 0 });

  return (
    <section className="panel" id="relatorio-print-area">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 className="display section-title">Relatório</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={target} onChange={e => setTarget(e.target.value)} aria-label="Relatório de">
            <option value="all">Todas as pessoas</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="ghost" onClick={() => window.print()}><Printer size={14} />Imprimir / PDF</button>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="muted">Nenhuma pessoa cadastrada.</p>
      ) : (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="display" style={{ fontSize: '1.3rem' }}>Relatório de gastos</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {monthLabel(selectedMonth)} · {target === 'all' ? 'todas as pessoas' : people.find(p => p.id === target)?.name}
            </div>
          </div>

          {targets.map(p => {
            const moves = movementsFor(p.id);
            const { total } = personTotal(p.id, selectedMonth);
            const remaining = (Number(p.salary) || 0) - total;
            return (
              <div key={p.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <Dot color={personColor(p.id)} size={10} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.82rem' }}>
                    {p.salary > 0 && <>salário {money(p.salary)} · </>}gasto {money(total)}
                    {p.salary > 0 && (
                      <> · <span style={{ color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {remaining >= 0 ? 'sobra' : 'falta'} {money(Math.abs(remaining))}
                      </span></>
                    )}
                  </span>
                </div>
                {moves.length === 0 ? (
                  <p className="muted" style={{ fontSize: '0.8rem' }}>Nenhum gasto neste mês.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {moves.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ color: 'var(--text-muted)', width: 50 }}>{fmtDate(m.date)}</span>
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

          {target === 'all' && people.length > 1 && (
            <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontWeight: 600 }}>
              <span>Total geral</span>
              <span className="mono">{money(grandTotals.spent)}{grandTotals.salary > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> de {money(grandTotals.salary)}</span>}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
