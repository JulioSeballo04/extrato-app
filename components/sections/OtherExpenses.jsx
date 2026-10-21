'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { StatusBadge } from '../ui';
import { EntryList } from './Entries';
import { money, monthLabel, matchesMonth, isRecurring, isPaidIn, dueDateIn, entryStatus, sumAmounts, outsideTarget } from '../../lib/ledger';

// Uma lista de gastos fora do cartão (a padrão é "Outros gastos"; dá para
// renomear e criar outras, ex.: "Casa", "Carro").
export default function OtherExpensesSection({
  group, isDefault, expenses, people, cards, groups, filterPerson, selectedMonth, onNewEntry, onRemove, onUpdate, onTogglePaid,
  personName, personColor, authorName, members, visibilityLabel, readOnly, onRename, onRemoveGroup, purchaseInfo,
}) {
  const [onlyFixed, setOnlyFixed] = useState(false);
  const [renaming, setRenaming] = useState(null); // texto do novo nome
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inMonth = expenses.filter(e => matchesMonth(e, selectedMonth) && (filterPerson === 'all' || e.personId === filterPerson));
  const fixedTotal = sumAmounts(inMonth.filter(isRecurring));
  const filtered = inMonth.filter(e => !onlyFixed || isRecurring(e)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthTotal = sumAmounts(inMonth);

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {renaming !== null ? (
          <form style={{ display: 'flex', gap: '0.4rem', flex: '1 1 220px' }}
            onSubmit={e => { e.preventDefault(); if (renaming.trim()) onRename(renaming); setRenaming(null); }}
            onKeyDown={e => { if (e.key === 'Escape') setRenaming(null); }}>
            <input value={renaming} onChange={e => setRenaming(e.target.value)} maxLength={40} autoFocus aria-label="Nome da lista" style={{ flex: 1 }} />
            <button type="submit" className="icon" aria-label="Salvar nome" style={{ color: 'var(--success)' }}><Check size={18} /></button>
          </form>
        ) : (
          <h2 className="display section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {group.name}
            {!readOnly && (
              <button className="icon" onClick={() => setRenaming(group.name)} aria-label={`Renomear “${group.name}”`} title="Renomear lista">
                <Pencil size={14} />
              </button>
            )}
            {!readOnly && !isDefault && (
              <button className="icon delete" onClick={() => setConfirmDelete(true)} aria-label={`Apagar a lista “${group.name}”`} title="Apagar lista">
                <Trash2 size={14} />
              </button>
            )}
          </h2>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          {monthTotal > 0 && (
            <span className="hint">no mês: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(monthTotal)}</span></span>
          )}
          {fixedTotal > 0 && (
            <span className="hint">fixos: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(fixedTotal)}</span>/mês</span>
          )}
          <label className="label-sm" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyFixed} onChange={e => setOnlyFixed(e.target.checked)} />
            só fixos
          </label>
          {!readOnly && people.length > 0 && (
            <button className="ghost" onClick={() => onNewEntry(outsideTarget(group.id))}><Plus size={14} />Gasto</button>
          )}
        </div>
      </div>
      {confirmDelete && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.6rem', marginBottom: '0.75rem', background: 'var(--panel-alt)', borderRadius: 10 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--danger)', flex: '1 1 220px' }}>
            Apagar a lista “{group.name}”? {expenses.length === 0 ? 'Ela está vazia.'
              : expenses.length === 1 ? `O gasto dela vai para “${groups[0].name}”.`
                : `Os ${expenses.length} gastos dela vão para “${groups[0].name}”.`}
          </span>
          <button className="ghost danger" onClick={() => { setConfirmDelete(false); onRemoveGroup(); }}>Apagar lista</button>
          <button className="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
        </div>
      )}
      {isDefault && (
        <p className="hint" style={{ marginBottom: '0.5rem' }}>Pix, boleto, débito, dinheiro: tudo que não entra na fatura de um cartão.</p>
      )}

      <EntryList
        items={filtered} people={people} cards={cards} groups={groups} purchaseInfo={purchaseInfo} readOnly={readOnly}
        status={e => (
          <StatusBadge status={entryStatus(isPaidIn(e, selectedMonth), dueDateIn(e, selectedMonth))} readOnly={readOnly}
            onToggle={() => onTogglePaid(e.id, selectedMonth)} />
        )}
        onUpdate={onUpdate} onRemove={onRemove} selectedMonth={selectedMonth} authorName={authorName}
        members={members} visibilityLabel={visibilityLabel}
        personName={personName} personColor={personColor}
        emptyText={onlyFixed ? 'Nenhum gasto fixo neste mês.' : `Nenhum gasto em “${group.name}” em ${monthLabel(selectedMonth)}.`}
      />
    </section>
  );
}

// "+ Nova lista": cria outra lista de gastos fora do cartão.
export function NewGroupButton({ onAdd }) {
  const [name, setName] = useState(null);
  if (name === null) {
    return (
      <button className="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setName('')}>
        <Plus size={14} />Nova lista de gastos
      </button>
    );
  }
  return (
    <form className="panel" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
      onSubmit={e => { e.preventDefault(); if (name.trim()) { onAdd(name); setName(null); } }}
      onKeyDown={e => { if (e.key === 'Escape') setName(null); }}>
      <label className="field" style={{ flex: '1 1 220px' }}>
        Nome da nova lista
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Casa, Carro, Mercado" maxLength={40} autoFocus />
      </label>
      <button type="submit" className="primary" disabled={!name.trim()}>Criar lista</button>
      <button type="button" className="ghost" onClick={() => setName(null)}>Cancelar</button>
    </form>
  );
}
