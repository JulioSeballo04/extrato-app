'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Check, ChevronDown } from 'lucide-react';
import { Dot, Tag, Sheet, MoneyInput } from '../ui';
import { CATEGORIES, DEFAULT_CATEGORY, money, parseAmount, amountInput, fmtDate, isRecurring, defaultDateFor, dueDateIn, changeScopes, splitAmount } from '../../lib/ledger';

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
  // Mesmos centavos que serão gravados (ver splitAmount): podem variar 1 centavo.
  const parts = splitAmount(value, splitCount).flatMap(share => splitAmount(share, installmentsNum));
  const minPart = Math.min(...parts);
  const maxPart = Math.max(...parts);

  function choosePerson(id) {
    setPersonId(id);
    setSplitWith(prev => prev.filter(x => x !== id));
  }

  function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!(value > 0)) nextErrors.amount = 'Informe um valor maior que zero.';
    else if (minPart <= 0) nextErrors.amount = `Valor pequeno demais para ${parts.length} partes (alguma ficaria com R$ 0,00).`;
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
            <MoneyInput value={amount} onChange={v => { setAmount(v); setErrors(x => ({ ...x, amount: null })); }}
              aria-invalid={!!errors.amount} className="money-lg" />
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
            {cards.filter(c => c.kind !== 'payee').map(c => <option key={c.id} value={c.id}>Cartão {c.name}</option>)}
            {cards.filter(c => c.kind === 'payee').map(c => <option key={c.id} value={c.id}>Devo para {c.name}</option>)}
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
            Vai gerar {installmentsNum * splitCount} lançamento{installmentsNum * splitCount > 1 ? 's' : ''} de <strong className="mono">{minPart === maxPart ? money(maxPart) : `${money(minPart)} a ${money(maxPart)}`}</strong>
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
// Ao editar ou apagar uma parcela, parte de compra dividida ou fixo, pergunta
// a quem a mudança vale (ver changeScopes) antes de aplicar.
export function EntryList({ items, people, cards = [], status, onUpdate, onRemove, personName, personColor, readOnly, emptyText, selectedMonth, authorName }) {
  const [editingId, setEditingId] = useState(null);
  const [asking, setAsking] = useState(null); // { item, action: 'edit' | 'delete', patch? }

  if (items.length === 0) return <p className="muted">{emptyText}</p>;

  function remove(t) {
    const scopes = changeScopes(t, selectedMonth, 'delete');
    if (scopes.length === 0) onRemove(t, 'one');
    else setAsking({ item: t, action: 'delete', scopes });
  }
  function save(t, patch) {
    setEditingId(null);
    const scopes = changeScopes(t, selectedMonth, 'edit');
    if (scopes.length === 0) onUpdate(t, patch, 'one');
    else setAsking({ item: t, action: 'edit', patch, scopes });
  }
  function choose(scope) {
    const { item, action, patch } = asking;
    setAsking(null);
    if (action === 'delete') onRemove(item, scope);
    else onUpdate(item, patch, scope);
  }

  return (
    <div>
      {items.map(t => (
        editingId === t.id ? (
          <EditRow key={t.id} item={t} people={people} cards={cards} onSave={patch => save(t, patch)} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={t.id} className="row">
            <div className="row-line" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>{t.description}</span>
              <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{money(t.amount)}</span>
            </div>
            <div className="row-line" style={{ gap: '0.4rem' }}>
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {fmtDate(selectedMonth && isRecurring(t) ? dueDateIn(t, selectedMonth) : t.date)}
              </span>
              <Dot color={personColor(t.personId)} />
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{personName(t.personId)}</span>
              <Tag>{t.category || DEFAULT_CATEGORY}</Tag>
              {isRecurring(t) && <Tag tone="accent">Fixo</Tag>}
              {t.installmentTotal > 1 && <Tag tone="info" mono title="Parcela">{t.installmentNumber}/{t.installmentTotal}</Tag>}
              {t.splitGroupId && <Tag title={`Dividido entre ${t.splitCount} pessoas`}>Dividido ÷{t.splitCount}</Tag>}
              {authorName?.(t.createdBy) && <span className="hint" title="Quem lançou">por {authorName(t.createdBy)}</span>}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {status(t)}
                {!readOnly && (
                  <>
                    <button className="icon" onClick={() => { setAsking(null); setEditingId(t.id); }} aria-label={`Editar ${t.description}`} title="Editar"><Pencil size={15} /></button>
                    <button className="icon delete" onClick={() => remove(t)} aria-label={`Apagar ${t.description}`} title="Apagar"><Trash2 size={15} /></button>
                  </>
                )}
              </span>
            </div>
            {asking?.item.id === t.id && (
              <ScopeChooser asking={asking} onChoose={choose} onCancel={() => setAsking(null)} />
            )}
          </div>
        )
      ))}
    </div>
  );
}

// "Apagar / Salvar alteração em: [Só esta parcela] [Esta e as próximas] [A compra inteira]"
function ScopeChooser({ asking, onChoose, onCancel }) {
  const del = asking.action === 'delete';
  return (
    <div role="group" aria-label={del ? 'O que apagar' : 'Onde aplicar a alteração'}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem', marginTop: '0.25rem', background: 'var(--panel-alt)', borderRadius: 10 }}>
      <span style={{ fontSize: '0.8rem', color: del ? 'var(--danger)' : 'var(--text-dim)', marginRight: '0.2rem' }}>
        {del ? 'Apagar:' : 'Salvar alteração em:'}
      </span>
      {asking.scopes.map((sc, i) => (
        <button key={sc.key} className={`ghost${del && sc.key !== 'from' ? ' danger' : ''}`} onClick={() => onChoose(sc.key)} autoFocus={i === 0}>
          {sc.label}
        </button>
      ))}
      <button className="ghost" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

// Edição na linha: Enter salva, Esc cancela. Dá para mudar também a forma de
// pagamento (outro cartão, pessoa a pagar ou fora do cartão) e a data.
function EditRow({ item, people, cards, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    description: item.description, amount: amountInput(item.amount), personId: item.personId,
    date: item.date, fixed: !!item.fixed, category: item.category || DEFAULT_CATEGORY,
    target: item.cardId || OUTSIDE_CARD,
  });
  const [error, setError] = useState('');
  const set = patch => { setError(''); setDraft(d => ({ ...d, ...patch })); };
  const isInstallment = item.installmentTotal > 1;
  const targetCard = cards.find(c => c.id === draft.target);
  const realCards = cards.filter(c => c.kind !== 'payee');
  const payees = cards.filter(c => c.kind === 'payee');

  function submit(e) {
    e.preventDefault();
    const amount = parseAmount(draft.amount);
    if (!(amount > 0)) { setError('Informe um valor maior que zero.'); return; }
    if (!draft.description.trim()) { setError('A descrição não pode ficar vazia.'); return; }
    if (!draft.date) { setError('Informe a data.'); return; }
    onSave({ ...draft, amount });
  }

  // Quando é pago, conforme a forma de pagamento escolhida.
  const payHint = !targetCard
    ? (draft.fixed ? 'Fora do cartão: vence todo mês neste dia.' : 'Fora do cartão: vence nesta data.')
    : targetCard.kind === 'payee'
      ? (targetCard.dueDay ? `Pagar a ${targetCard.name} até o dia ${targetCard.dueDay} do mesmo mês.` : `Pagar a ${targetCard.name} no mesmo mês.`)
      : (targetCard.dueDay ? `Entra na fatura do ${targetCard.name}, que vence dia ${targetCard.dueDay} do mês seguinte.` : `Entra na fatura do ${targetCard.name} (sem dia de vencimento cadastrado).`);

  return (
    <form
      onSubmit={submit}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
      style={{ padding: '0.75rem', margin: '0.25rem 0', background: 'var(--panel-alt)', borderRadius: 10 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
        <label className="field" style={{ gridColumn: 'span 2' }}>
          Descrição
          <input value={draft.description} onChange={e => set({ description: e.target.value })} autoFocus maxLength={200} />
        </label>
        <label className="field">
          {isInstallment ? 'Valor da parcela' : 'Valor'}
          <MoneyInput value={draft.amount} onChange={v => set({ amount: v })} aria-invalid={!!error} />
        </label>
        <label className="field">
          Pagamento
          <select value={draft.target} onChange={e => set({ target: e.target.value })}>
            {realCards.map(c => <option key={c.id} value={c.id}>Cartão {c.name}</option>)}
            {payees.map(c => <option key={c.id} value={c.id}>Devo para {c.name}</option>)}
            <option value={OUTSIDE_CARD}>Fora do cartão (Pix, boleto…)</option>
          </select>
        </label>
        <label className="field">
          {!targetCard ? (draft.fixed ? 'Vence (a partir de)' : 'Vence em') : targetCard.kind === 'payee' ? 'Data' : 'Data da compra'}
          <input type="date" value={draft.date} onChange={e => set({ date: e.target.value })} />
        </label>
        <label className="field">
          Pessoa
          <select value={draft.personId} onChange={e => set({ personId: e.target.value })}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field">
          Categoria
          <select value={draft.category} onChange={e => set({ category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <p className="hint" style={{ margin: '0.5rem 0 0' }}>{payHint}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
        {!isInstallment && (
          <label className="label-sm" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.fixed} onChange={e => set({ fixed: e.target.checked })} />
            fixo (repete todo mês)
          </label>
        )}
        <span style={{ flex: 1 }} />
        {error && <span role="alert" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</span>}
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary"><Check size={15} />Salvar</button>
      </div>
    </form>
  );
}
