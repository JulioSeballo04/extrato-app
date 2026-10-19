'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { Dot, Tag, Sheet } from '../ui';
import { CATEGORIES, DEFAULT_CATEGORY, money, parseAmount, amountInput, fmtDate, isRecurring, defaultDateFor } from '../../lib/ledger';

export const OUTSIDE_CARD = 'outside';

// Formulário único de "Novo gasto": no cartão ou fora dele. O essencial fica à
// vista; parcelas, divisão e "fixo" ficam em "Mais opções".
export function EntryForm({ people, cards, selectedMonth, initialTarget, onSubmit, onClose, personColor }) {
  const [target, setTarget] = useState(initialTarget ?? (cards[0]?.id || OUTSIDE_CARD));
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [date, setDate] = useState(defaultDateFor(selectedMonth));
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [fixed, setFixed] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [splitWith, setSplitWith] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [errors, setErrors] = useState({});

  const installmentsNum = Math.max(1, Math.floor(Number(installments)) || 1);
  const paidNum = Math.min(installmentsNum, Math.max(0, Math.floor(Number(paidInstallments)) || 0));
  const splitCount = 1 + splitWith.filter(id => id !== personId).length;
  const value = parseAmount(amount);
  const each = value / splitCount / installmentsNum;

  function choosePerson(id) {
    setPersonId(id);
    setSplitWith(prev => prev.filter(x => x !== id));
  }

  function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!(value > 0)) nextErrors.amount = 'Informe um valor maior que zero.';
    if (!desc.trim()) nextErrors.desc = 'Descreva o gasto (ex.: mercado, aluguel).';
    if (!personId) nextErrors.person = 'Escolha quem gastou.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(target === OUTSIDE_CARD ? null : target, {
      description: desc, amount: value, personId, date, category, fixed: installmentsNum === 1 && fixed,
      installments: installmentsNum, paidInstallments: paidNum, splitWith: splitWith.filter(id => id !== personId),
    });
  }

  return (
    <Sheet title="Novo gasto" onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.6rem' }}>
        <div className="grid-2">
          <label className="field">
            Valor total
            <input inputMode="decimal" placeholder="0,00" value={amount} onChange={e => { setAmount(e.target.value); setErrors(x => ({ ...x, amount: null })); }}
              aria-invalid={!!errors.amount} className="mono" style={{ fontSize: '1.1rem' }} autoComplete="off" />
            {errors.amount && <span style={{ color: 'var(--danger)' }}>{errors.amount}</span>}
          </label>
          <label className="field">
            Descrição
            <input placeholder="Ex.: mercado, aluguel" value={desc} onChange={e => { setDesc(e.target.value); setErrors(x => ({ ...x, desc: null })); }} aria-invalid={!!errors.desc} maxLength={200} />
            {errors.desc && <span style={{ color: 'var(--danger)' }}>{errors.desc}</span>}
          </label>
        </div>

        <label className="field">
          Onde
          <select value={target} onChange={e => setTarget(e.target.value)}>
            {cards.map(c => <option key={c.id} value={c.id}>Cartão {c.name}</option>)}
            <option value={OUTSIDE_CARD}>Fora do cartão (Pix, boleto, dinheiro…)</option>
          </select>
        </label>

        <div className="field" role="group" aria-label="Quem gastou">
          Quem gastou
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {people.map(p => (
              <PersonChip key={p.id} person={p} color={personColor(p.id)} pressed={personId === p.id} onClick={() => choosePerson(p.id)} />
            ))}
          </div>
          {errors.person && <span style={{ color: 'var(--danger)' }}>{errors.person}</span>}
        </div>

        <div className="grid-2">
          <label className="field">
            {installmentsNum > 1 ? 'Data da próxima parcela' : 'Data'}
            <input type="date" value={date} onChange={e => setDate(e.target.value || defaultDateFor(selectedMonth))} />
          </label>
          <label className="field">
            Categoria
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <button type="button" className="ghost" onClick={() => setShowMore(s => !s)} aria-expanded={showMore} style={{ alignSelf: 'flex-start' }}>
          <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none' }} />
          Mais opções (parcelas, fixo, dividir)
        </button>

        {showMore && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.8rem', borderRadius: 12, background: 'var(--panel-alt)' }}>
            <div className="grid-2">
              <label className="field">
                Parcelas
                <input type="number" inputMode="numeric" min="1" max="480" value={installments} onChange={e => setInstallments(e.target.value)} />
              </label>
              <label className="field">
                Parcelas já pagas
                <input type="number" inputMode="numeric" min="0" max={installmentsNum} value={paidInstallments}
                  onChange={e => setPaidInstallments(e.target.value)} disabled={installmentsNum === 1} />
              </label>
            </div>
            <label className="label-sm" style={{ cursor: installmentsNum > 1 ? 'not-allowed' : 'pointer' }}>
              <input type="checkbox" checked={fixed && installmentsNum === 1} disabled={installmentsNum > 1} onChange={e => setFixed(e.target.checked)} />
              Gasto fixo (repete todo mês, ex.: aluguel, assinatura)
            </label>
            {people.length > 1 && (
              <div className="field" role="group" aria-label="Dividir com">
                Dividir igualmente com
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {people.filter(p => p.id !== personId).map(p => (
                    <PersonChip key={p.id} person={p} color={personColor(p.id)} pressed={splitWith.includes(p.id)}
                      onClick={() => setSplitWith(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {value > 0 && (installmentsNum > 1 || splitCount > 1) && (
          <p className="hint" role="status">
            Vai gerar {installmentsNum * splitCount} lançamento{installmentsNum * splitCount > 1 ? 's' : ''} de <strong className="mono">{money(each)}</strong>
            {installmentsNum > 1 && (paidNum > 0
              ? <>: {paidNum} já paga{paidNum > 1 ? 's' : ''} (antes de {fmtDate(date)}) e {installmentsNum - paidNum} a partir de {fmtDate(date)}, uma por mês</>
              : <>, uma parcela por mês a partir de {fmtDate(date)}</>)}
            {splitCount > 1 && <>, divididos entre {splitCount} pessoas</>}.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary">Lançar</button>
        </div>
      </form>
    </Sheet>
  );
}

export function PersonChip({ person, pressed, onClick, color }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {color && <Dot color={color} />}{person.name}
    </button>
  );
}

// Lista de lançamentos (cartão ou fora dele), com edição na própria linha.
// `status(item)` devolve o selo de pagamento (ou null) daquela linha.
export function EntryList({ items, people, status, onUpdate, onRemove, personName, personColor, readOnly, emptyText }) {
  const [editingId, setEditingId] = useState(null);

  if (items.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <div>
      {items.map(t => (
        editingId === t.id ? (
          <EditRow key={t.id} item={t} people={people}
            onSave={patch => { onUpdate(t.id, patch); setEditingId(null); }}
            onCancel={() => setEditingId(null)} />
        ) : (
          <div key={t.id} className="row">
            <div className="row-line" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>{t.description}</span>
              <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{money(t.amount)}</span>
            </div>
            <div className="row-line" style={{ gap: '0.4rem' }}>
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(t.date)}</span>
              <Dot color={personColor(t.personId)} />
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{personName(t.personId)}</span>
              <Tag>{t.category || DEFAULT_CATEGORY}</Tag>
              {isRecurring(t) && <Tag tone="accent">Fixo</Tag>}
              {t.installmentTotal > 1 && <Tag tone="info" mono title="Parcela">{t.installmentNumber}/{t.installmentTotal}</Tag>}
              {t.splitGroupId && <Tag title={`Dividido entre ${t.splitCount} pessoas`}>Dividido ÷{t.splitCount}</Tag>}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {status(t)}
                {!readOnly && (
                  <>
                    <button className="icon" onClick={() => setEditingId(t.id)} aria-label={`Editar ${t.description}`} title="Editar"><Pencil size={15} /></button>
                    <button className="icon delete" onClick={() => onRemove(t)} aria-label={`Apagar ${t.description}`} title="Apagar"><Trash2 size={15} /></button>
                  </>
                )}
              </span>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// Edição na linha: Enter salva, Esc cancela.
function EditRow({ item, people, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    description: item.description, amount: amountInput(item.amount), personId: item.personId,
    date: item.date, fixed: !!item.fixed, category: item.category || DEFAULT_CATEGORY,
  });
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const isInstallment = item.installmentTotal > 1;

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave({ ...draft, amount: parseAmount(draft.amount) }); }}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.5rem', margin: '0.25rem 0', background: 'var(--panel-alt)', borderRadius: 10 }}
    >
      <input type="date" value={draft.date} onChange={e => set({ date: e.target.value })} aria-label="Data" style={{ width: 150 }} />
      <select value={draft.personId} onChange={e => set({ personId: e.target.value })} aria-label="Pessoa">
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input value={draft.description} onChange={e => set({ description: e.target.value })} aria-label="Descrição" autoFocus style={{ flex: '1 1 140px' }} />
      <select value={draft.category} onChange={e => set({ category: e.target.value })} aria-label="Categoria">
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input inputMode="decimal" value={draft.amount} onChange={e => set({ amount: e.target.value })} aria-label="Valor" className="mono" style={{ width: 100 }} />
      {!isInstallment && (
        <label className="label-sm" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={draft.fixed} onChange={e => set({ fixed: e.target.checked })} />
          fixo
        </label>
      )}
      <button type="submit" className="icon" aria-label="Salvar" title="Salvar (Enter)" style={{ color: 'var(--success)' }}><Check size={18} /></button>
      <button type="button" className="icon" onClick={onCancel} aria-label="Cancelar" title="Cancelar (Esc)"><X size={18} /></button>
    </form>
  );
}
