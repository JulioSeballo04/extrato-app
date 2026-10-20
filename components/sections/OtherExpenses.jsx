'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { StatusBadge } from '../ui';
import { EntryList, OUTSIDE_CARD } from './Entries';
import { money, monthLabel, matchesMonth, isRecurring, isPaidIn, dueDateIn, entryStatus, sumAmounts } from '../../lib/ledger';

export default function OtherExpensesSection({ expenses, people, cards, filterPerson, selectedMonth, onNewEntry, onRemove, onUpdate, onTogglePaid, personName, personColor, authorName, members, visibilityLabel, readOnly }) {
  const [onlyFixed, setOnlyFixed] = useState(false);

  const inMonth = expenses.filter(e => matchesMonth(e, selectedMonth) && (filterPerson === 'all' || e.personId === filterPerson));
  const fixedTotal = sumAmounts(inMonth.filter(isRecurring));
  const filtered = inMonth.filter(e => !onlyFixed || isRecurring(e)).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h2 className="display section-title">Outros gastos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          {fixedTotal > 0 && (
            <span className="hint">fixos: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(fixedTotal)}</span>/mês</span>
          )}
          <label className="label-sm" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyFixed} onChange={e => setOnlyFixed(e.target.checked)} />
            só fixos
          </label>
          {!readOnly && people.length > 0 && (
            <button className="ghost" onClick={() => onNewEntry(OUTSIDE_CARD)}><Plus size={14} />Gasto</button>
          )}
        </div>
      </div>
      <p className="hint" style={{ marginBottom: '0.5rem' }}>Pix, boleto, dinheiro, débito: tudo que não entra na fatura de um cartão.</p>

      <EntryList
        items={filtered} people={people} cards={cards} readOnly={readOnly}
        status={e => (
          <StatusBadge status={entryStatus(isPaidIn(e, selectedMonth), dueDateIn(e, selectedMonth))} readOnly={readOnly}
            onToggle={() => onTogglePaid(e.id, selectedMonth)} />
        )}
        onUpdate={onUpdate} onRemove={onRemove} selectedMonth={selectedMonth} authorName={authorName}
        members={members} visibilityLabel={visibilityLabel}
        personName={personName} personColor={personColor}
        emptyText={onlyFixed ? 'Nenhum gasto fixo neste mês.' : `Nenhum gasto fora do cartão em ${monthLabel(selectedMonth)}.`}
      />
    </section>
  );
}
