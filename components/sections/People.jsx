'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dot, MoneyInput } from '../ui';
import { money, parseAmount, amountInput, entriesNote } from '../../lib/ledger';

export default function PeopleSection({ people, onAdd, onRemove, onSalary, personColor, readOnly, entryCount, formOpen, setFormOpen, meId, memberLabel, shared, onLinkMe }) {
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  // Sem ninguém cadastrado, o formulário já aparece aberto.
  const showForm = !readOnly && (formOpen || people.length === 0);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Digite o nome.'); return; }
    onAdd(name.trim(), parseAmount(salary));
    setName(''); setSalary(''); setError(''); setFormOpen(false);
  }

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="display section-title">Pessoas & salários</h2>
        {!readOnly && people.length > 0 && (
          <button className={`ghost${formOpen ? ' active' : ''}`} onClick={() => setFormOpen(!formOpen)} aria-expanded={formOpen}>
            <Plus size={14} />Pessoa
          </button>
        )}
      </div>

      {people.length === 0 && (
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          {readOnly ? 'Nenhuma pessoa cadastrada ainda.' : 'Comece adicionando quem divide as contas (você incluso). O salário é opcional e serve para mostrar quanto sobra.'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {people.map(p => (
          <div key={p.id} className="row-line" style={{ gap: '0.75rem', padding: '0.4rem 0' }}>
            <Dot color={personColor(p.id)} size={10} />
            <span style={{ flex: '1 1 110px', fontWeight: 500 }}>
              {p.name}
              {/* Conta ligada a esta pessoa (em espaço compartilhado) */}
              {shared && p.uid && (
                <span className="hint" style={{ marginLeft: 6, fontWeight: 400 }}>
                  {p.uid === meId ? '(você)' : `· conta de ${memberLabel(p.uid)}`}
                </span>
              )}
              {shared && !p.uid && onLinkMe && (
                <button type="button" className="ghost" style={{ marginLeft: 8, minHeight: 0, padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}
                  onClick={() => onLinkMe(p.id)} title="Ligar esta pessoa à sua conta">
                  Sou eu
                </button>
              )}
            </span>
            {readOnly ? (
              <span className="mono" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>salário {money(p.salary)}</span>
            ) : (
              <SalaryInput value={p.salary} onCommit={v => onSalary(p.id, v)} label={`Salário de ${p.name}`} />
            )}
            {!readOnly && confirmId !== p.id && (
              <button className="icon delete" onClick={() => setConfirmId(p.id)} aria-label={`Remover ${p.name}`}><Trash2 size={15} /></button>
            )}
            {!readOnly && confirmId === p.id && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', flexBasis: '100%' }}>
                <span style={{ color: 'var(--danger)' }}>Apagar {p.name}{entriesNote(entryCount(p.id))}?</span>
                <button className="ghost danger" onClick={() => { setConfirmId(null); onRemove(p.id); }}>Apagar</button>
                <button className="ghost" onClick={() => setConfirmId(null)}>Cancelar</button>
              </span>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', marginTop: people.length ? '1rem' : 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} aria-label="Nome" aria-invalid={!!error}
            autoFocus={people.length > 0} maxLength={80} style={{ flex: '1 1 140px' }} />
          <MoneyInput value={salary} onChange={setSalary} aria-label="Salário (opcional)" title="Salário (opcional)" style={{ flex: '0 1 170px' }} />
          <button type="submit" className="primary">Adicionar</button>
          {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', flexBasis: '100%' }}>{error}</span>}
        </form>
      )}
    </section>
  );
}

// Salário editável: grava ao sair do campo ou com Enter (não a cada tecla).
function SalaryInput({ value, onCommit, label }) {
  const [text, setText] = useState(amountInput(value));
  useEffect(() => { setText(amountInput(value)); }, [value]);
  function commit() {
    const v = parseAmount(text);
    if (v !== (Number(value) || 0)) onCommit(v);
  }
  return (
    <label className="label-sm">
      salário
      <MoneyInput value={text} onChange={setText} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label={label} style={{ width: 140 }} />
    </label>
  );
}
