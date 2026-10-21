'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Check, ChevronDown, EyeOff, ArrowDownUp } from 'lucide-react';
import { Dot, Tag, Sheet, MoneyInput } from '../ui';
import { CATEGORIES, DEFAULT_CATEGORY, money, parseAmount, amountInput, fmtDate, isRecurring, defaultDateFor, changeScopes, splitAmount, purchasePlan, PAYMENT_METHODS, methodLabel, parseTarget, outsideTarget, DEFAULT_GROUP, ENTRY_SORTS, sortEntries, shownDate, isPayee, invoiceKeyOf, invoiceDueDate, invoiceName, monthLabel } from '../../lib/ledger';

export const OUTSIDE_CARD = 'outside';

// Formulário único de "Novo gasto": no cartão ou fora dele. O essencial fica à
// vista; parcelas, divisão e "fixo" ficam em "Mais opções".
export function EntryForm({ people, cards, selectedMonth, initialTarget, onSubmit, onClose, personColor, defaultPersonId, members = [], groups = [] }) {
  const [target, setTarget] = useState(initialTarget ?? (cards[0]?.id || OUTSIDE_CARD));
  const [method, setMethod] = useState(lastMethod());
  const outside = parseTarget(target).outside;
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [personId, setPersonId] = useState(defaultPersonId || people[0]?.id || '');
  const [date, setDate] = useState(defaultDateFor(selectedMonth));
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [fixed, setFixed] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [splitWith, setSplitWith] = useState([]);
  // Divisão em partes iguais ou com o valor de cada um (ex.: eu 36, a Sofia 14).
  const [splitMode, setSplitMode] = useState('equal');
  const [shareInputs, setShareInputs] = useState({}); // personId → texto do valor
  // Entrada: parte já paga à parte (ex.: 30 no Pix); o resto vai para "Onde".
  const [down, setDown] = useState('');
  const [downMethod, setDownMethod] = useState('pix');
  const [showMore, setShowMore] = useState(false);
  const [hideFrom, setHideFrom] = useState([]); // membros que não vão ver (ex.: presente)
  const [errors, setErrors] = useState({});

  const installmentsNum = Math.max(1, Math.floor(Number(installments)) || 1);
  const paidNum = Math.min(installmentsNum, Math.max(0, Math.floor(Number(paidInstallments)) || 0));
  const participants = [personId, ...splitWith.filter(id => id !== personId)];
  const splitCount = participants.length;
  const custom = splitCount > 1 && splitMode === 'custom';
  const value = parseAmount(amount);
  const downValue = parseAmount(down);
  const hasDown = downValue > 0;
  const shares = custom ? participants.map(id => parseAmount(shareInputs[id] || '')) : null;
  const sharesLeft = custom ? Math.round((value - shares.reduce((a, b) => a + b, 0)) * 100) / 100 : 0;
  // Mesmos centavos que serão gravados (ver purchasePlan): podem variar 1 centavo.
  const plan = purchasePlan({ amount: value, people: splitCount, shares, installments: installmentsNum, down: hasDown ? downValue : 0 });
  const parts = plan.parts.flat();
  const minPart = Math.min(...parts);
  const maxPart = Math.max(...parts);
  const restValue = Math.round((value - (hasDown ? downValue : 0)) * 100) / 100;
  const isFixed = installmentsNum === 1 && fixed && !hasDown;

  function choosePerson(id) {
    setPersonId(id);
    setSplitWith(prev => prev.filter(x => x !== id));
  }
  function chooseSplitMode(mode) {
    setSplitMode(mode);
    setErrors(x => ({ ...x, split: null }));
    // Começa das partes iguais, para só ajustar.
    if (mode === 'custom' && value > 0) {
      const equal = splitAmount(value, splitCount);
      setShareInputs(Object.fromEntries(participants.map((id, i) => [id, amountInput(equal[i])])));
    }
  }
  function setShare(id, text) {
    setErrors(x => ({ ...x, split: null }));
    setShareInputs(prev => {
      const next = { ...prev, [id]: text };
      // Entre duas pessoas, a outra fica com o que falta.
      if (participants.length === 2 && value > 0) {
        const other = participants.find(x => x !== id);
        const rest = Math.round((value - parseAmount(text)) * 100) / 100;
        next[other] = rest >= 0 ? amountInput(rest) : '';
      }
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!(value > 0)) nextErrors.amount = 'Informe um valor maior que zero.';
    else if (hasDown && downValue >= value) nextErrors.down = 'A entrada precisa ser menor que o valor total.';
    else if (custom && shares.some(s => !(s > 0))) nextErrors.split = 'Informe um valor maior que zero para cada pessoa.';
    else if (custom && sharesLeft !== 0) nextErrors.split = sharesLeft > 0 ? `Faltam ${money(sharesLeft)} para fechar o total.` : `As partes passam ${money(-sharesLeft)} do total.`;
    else if (minPart <= 0) nextErrors.amount = `Valor pequeno demais para ${parts.length} partes (alguma ficaria com R$ 0,00).`;
    if (!desc.trim()) nextErrors.desc = 'Descreva o gasto (ex.: mercado, aluguel).';
    if (!personId) nextErrors.person = 'Escolha quem gastou.';
    if ((nextErrors.down || nextErrors.split) && !showMore) setShowMore(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const where = parseTarget(target);
    if (where.outside) rememberMethod(method);
    onSubmit(where.outside ? null : where.cardId, {
      ...(where.outside ? { groupId: where.groupId, method } : {}),
      description: desc, amount: value, personId, date, category, fixed: isFixed,
      installments: installmentsNum, paidInstallments: paidNum, splitWith: participants.slice(1), hideFrom,
      ...(custom ? { shares } : {}),
      ...(hasDown ? { down: downValue, downMethod } : {}),
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
            <TargetGroupOptions groups={groups} />
          </select>
        </label>

        {outside && <MethodPicker method={method} setMethod={setMethod} />}

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
        <InvoiceHint card={outside ? null : cards.find(c => c.id === target)} date={date} />

        <button type="button" className="ghost" onClick={() => setShowMore(s => !s)} aria-expanded={showMore} style={{ alignSelf: 'flex-start' }}>
          <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none' }} />
          Mais opções (parcelas, entrada, fixo, dividir{members.length > 0 ? ', esconder' : ''})
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
            <div className="field" role="group" aria-label="Entrada">
              <label className="field">
                Entrada já paga à parte (opcional)
                <MoneyInput value={down} onChange={v => { setDown(v); setErrors(x => ({ ...x, down: null })); }} aria-invalid={!!errors.down} />
              </label>
              {errors.down && <span style={{ color: 'var(--danger)' }}>{errors.down}</span>}
              {hasDown && <MethodPicker method={downMethod} setMethod={m => setDownMethod(m || 'pix')} label="Entrada paga com" />}
            </div>
            <label className="label-sm" style={{ cursor: installmentsNum > 1 || hasDown ? 'not-allowed' : 'pointer' }}>
              <input type="checkbox" checked={isFixed} disabled={installmentsNum > 1 || hasDown} onChange={e => setFixed(e.target.checked)} />
              Gasto fixo (repete todo mês, ex.: aluguel, assinatura)
            </label>
            {members.length > 0 && (
              <HideFromPicker members={members} hideFrom={hideFrom} setHideFrom={setHideFrom} />
            )}
            {people.length > 1 && (
              <div className="field" role="group" aria-label="Dividir com">
                Dividir com
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {people.filter(p => p.id !== personId).map(p => (
                    <PersonChip key={p.id} person={p} color={personColor(p.id)} pressed={splitWith.includes(p.id)}
                      onClick={() => { setErrors(x => ({ ...x, split: null })); setSplitWith(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]); }} />
                  ))}
                </div>
                {splitCount > 1 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }} role="group" aria-label="Como dividir">
                    <button type="button" className="chip" aria-pressed={splitMode === 'equal'} onClick={() => chooseSplitMode('equal')}>Partes iguais</button>
                    <button type="button" className="chip" aria-pressed={splitMode === 'custom'} onClick={() => chooseSplitMode('custom')}>Valor de cada um</button>
                  </div>
                )}
                {custom && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                    {participants.map(id => {
                      const p = people.find(x => x.id === id);
                      return (
                        <label key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot color={personColor(id)} />{p?.name}</span>
                          <MoneyInput value={shareInputs[id] || ''} onChange={v => setShare(id, v)} aria-label={`Parte de ${p?.name}`} style={{ maxWidth: 150 }} />
                        </label>
                      );
                    })}
                    {value > 0 && sharesLeft !== 0 && !errors.split && (
                      <span className="hint">{sharesLeft > 0 ? `Faltam ${money(sharesLeft)}` : `Passou ${money(-sharesLeft)}`} para fechar {money(value)}.</span>
                    )}
                  </div>
                )}
                {errors.split && <span style={{ color: 'var(--danger)' }}>{errors.split}</span>}
              </div>
            )}
          </div>
        )}

        {value > 0 && (installmentsNum > 1 || splitCount > 1 || hasDown) && (!custom || sharesLeft === 0) && (!hasDown || downValue < value) && (
          <p className="hint" role="status">
            {hasDown && <>Entrada de <strong className="mono">{money(downValue)}</strong> ({methodLabel(downMethod)}, já paga) em “{groups.find(g => g.id === DEFAULT_GROUP)?.name || 'Outros gastos'}”; o resto, <strong className="mono">{money(restValue)}</strong>, </>}
            {hasDown ? 'vai gerar' : 'Vai gerar'} {installmentsNum * splitCount} lançamento{installmentsNum * splitCount > 1 ? 's' : ''} de <strong className="mono">{minPart === maxPart ? money(maxPart) : `${money(minPart)} a ${money(maxPart)}`}</strong>
            {installmentsNum > 1 && (paidNum > 0
              ? <>: {paidNum} já paga{paidNum > 1 ? 's' : ''} (antes de {fmtDate(date)}) e {installmentsNum - paidNum} a partir de {fmtDate(date)}, uma por mês</>
              : <>, uma parcela por mês a partir de {fmtDate(date)}</>)}
            {splitCount > 1 && (custom
              ? <>, divididos assim: {participants.map((id, i) => `${people.find(x => x.id === id)?.name} ${money(plan.shares[i])}`).join(', ')}</>
              : <>, divididos entre {splitCount} pessoas</>)}.
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
// A ordem (data, valor ou parcelas recentes) é escolhida na própria lista e
// lembrada neste aparelho, separada por `sortScope` (ex.: cartão, fora dele).
export function EntryList({ items, people, cards = [], groups = [], members = [], purchaseInfo, visibilityLabel, status, onUpdate, onRemove, personName, personColor, readOnly, emptyText, selectedMonth, authorName, sortScope = 'lista', defaultSort = 'recent' }) {
  const [editingId, setEditingId] = useState(null);
  const [asking, setAsking] = useState(null); // { item, action: 'edit' | 'delete', patch? }
  const [sort, setSort] = useState(() => savedSort(sortScope, defaultSort));

  if (items.length === 0) return <p className="muted">{emptyText}</p>;
  const cardOf = id => (id ? cards.find(c => c.id === id) : null);
  const sorted = sortEntries(items, sort, selectedMonth, cardOf);
  function chooseSort(key) {
    setSort(key);
    rememberSort(sortScope, key);
  }

  function remove(t) {
    const scopes = changeScopes(t, selectedMonth, 'delete');
    if (scopes.length === 0) onRemove(t, 'one');
    else setAsking({ item: t, action: 'delete', scopes });
  }
  function save(t, patch) {
    setEditingId(null);
    // Refazer o parcelamento vale sempre para a compra inteira: não pergunta.
    if (patch.rebuild) { onUpdate(t, patch, 'all'); return; }
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
      {items.length > 1 && <SortPicker sort={sort} onChange={chooseSort} />}
      {sorted.map(t => (
        editingId === t.id ? (
          <EditRow key={t.id} item={t} people={people} cards={cards} groups={groups} members={members} purchaseInfo={purchaseInfo} onSave={patch => save(t, patch)} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={t.id} className="row">
            <div className="row-line" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>{t.description}</span>
              <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{money(t.amount)}</span>
            </div>
            <div className="row-line" style={{ gap: '0.4rem' }}>
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {fmtDate(shownDate(t, selectedMonth, cardOf(t.cardId)))}
              </span>
              <Dot color={personColor(t.personId)} />
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{personName(t.personId)}</span>
              <Tag>{t.category || DEFAULT_CATEGORY}</Tag>
              {isRecurring(t) && <Tag tone="accent">Fixo</Tag>}
              {t.installmentTotal > 1 && <Tag tone="info" mono title="Parcela">{t.installmentNumber}/{t.installmentTotal}</Tag>}
              {!t.cardId && methodLabel(t.method) && <Tag title="Forma de pagamento">{methodLabel(t.method)}</Tag>}
              {t.splitGroupId && <Tag title={`Dividido entre ${t.splitCount} pessoas`}>Dividido em {t.splitCount}</Tag>}
              {visibilityLabel?.(t) && (
                <span className="tag" title="Os membros listados não veem este lançamento" style={{ color: 'var(--accent-light)', border: '1px solid var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <EyeOff size={11} aria-hidden="true" />{visibilityLabel(t)}
                </span>
              )}
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

// Em qual fatura a compra vai cair, para não haver surpresa com o fechamento
// (ex.: comprar no "melhor dia" já joga a compra para a fatura seguinte).
function InvoiceHint({ card, date }) {
  if (!card || isPayee(card) || !date) return null;
  const key = invoiceKeyOf(card, date);
  const due = invoiceDueDate(card, key);
  return (
    <p className="hint" role="status" style={{ marginTop: '-0.4rem' }}>
      Vai para a fatura de <strong>{invoiceName(card, key)}</strong>{due && <> (vence {fmtDate(due)})</>}, nos gastos de {monthLabel(key)}.
      {!card.closeDay && ' Este cartão não tem dia de fechamento: vale o mês da data.'}
    </p>
  );
}

// "Ordenar por: [Data] [Valor] [Parcelas recentes]"
function SortPicker({ sort, onChange }) {
  return (
    <div role="group" aria-label="Ordenar lançamentos" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
      <span className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowDownUp size={12} aria-hidden="true" />Ordenar por</span>
      {ENTRY_SORTS.map(o => (
        <button key={o.key} type="button" className="chip" aria-pressed={sort === o.key} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

const SORT_KEY = 'gestor-de-gastos:ordem:';
function savedSort(scope, fallback) {
  try {
    const v = localStorage.getItem(SORT_KEY + scope);
    return ENTRY_SORTS.some(o => o.key === v) ? v : fallback;
  } catch { return fallback; }
}
function rememberSort(scope, key) {
  try { localStorage.setItem(SORT_KEY + scope, key); } catch { /* ignora */ }
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
function EditRow({ item, people, cards, groups = [], members = [], purchaseInfo, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    description: item.description, amount: amountInput(item.amount), personId: item.personId,
    date: item.date, fixed: !!item.fixed, category: item.category || DEFAULT_CATEGORY,
    target: item.cardId || outsideTarget(item.groupId),
    method: item.method || '',
    hideFrom: item.visibleTo?.length ? members.filter(m => !item.visibleTo.includes(m.uid)).map(m => m.uid) : [],
  });
  const [error, setError] = useState('');
  const set = patch => { setError(''); setDraft(d => ({ ...d, ...patch })); };
  const isInstallment = item.installmentTotal > 1;
  // "Corrigir parcelamento": refaz a compra inteira com outro número de parcelas.
  const info = purchaseInfo?.(item);
  const [fixing, setFixing] = useState(false);
  const [plan, setPlan] = useState(() => ({
    total: amountInput(info?.total || item.amount), count: String(info?.count || 1), current: String(info?.current || 1),
  }));
  const setPlanField = p => { setError(''); setPlan(x => ({ ...x, ...p })); };
  const planCount = Math.max(1, Math.floor(Number(plan.count)) || 1);
  const planCurrent = Math.min(planCount, Math.max(1, Math.floor(Number(plan.current)) || 1));
  const planEach = parseAmount(plan.total) / (info?.uneven ? 1 : info?.people.length || 1) / planCount;
  const targetCard = cards.find(c => c.id === draft.target);
  const realCards = cards.filter(c => c.kind !== 'payee');
  const payees = cards.filter(c => c.kind === 'payee');

  function submit(e) {
    e.preventDefault();
    if (fixing) {
      if (!(parseAmount(plan.total) > 0)) { setError('Informe o valor total da compra.'); return; }
      if (Number(plan.current) > planCount) { setError('A parcela atual não pode passar do número de parcelas.'); return; }
      onSave({ ...draft, rebuild: { total: parseAmount(plan.total), count: planCount, current: planCurrent } });
      return;
    }
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
            <TargetGroupOptions groups={groups} />
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
      {info && !draft.fixed && !item.fixed && (
        <div style={{ marginTop: '0.6rem' }}>
          <button type="button" className={`ghost${fixing ? ' active' : ''}`} onClick={() => setFixing(f => !f)} aria-expanded={fixing}>
            {fixing ? 'Cancelar correção do parcelamento' : 'Corrigir parcelamento'}
          </button>
          {fixing && (
            <div style={{ marginTop: '0.6rem', padding: '0.6rem', borderRadius: 10, border: '1px solid var(--border-strong)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                <label className="field">
                  Valor total da compra
                  <MoneyInput value={plan.total} onChange={v => setPlanField({ total: v })} />
                </label>
                <label className="field">
                  Número de parcelas
                  <input type="number" inputMode="numeric" min="1" max="480" value={plan.count} onChange={e => setPlanField({ count: e.target.value })} />
                </label>
                <label className="field">
                  Esta é a parcela nº
                  <input type="number" inputMode="numeric" min="1" max={planCount} value={plan.current} onChange={e => setPlanField({ current: e.target.value })} />
                </label>
              </div>
              <p className="hint" style={{ margin: '0.5rem 0 0' }}>
                {planCount > 1
                  ? <>Vai refazer a compra em <strong>{planCount}x</strong> de <strong className="mono">{money(planEach)}</strong>{info.people.length > 1 ? (info.uneven ? ` no total (dividida entre ${info.people.length}, na mesma proporção de hoje)` : ` por pessoa (dividida entre ${info.people.length})`) : ''}: esta linha vira a parcela {planCurrent}/{planCount} em {fmtDate(draft.date)}{planCurrent > 1 ? `, e as ${planCurrent - 1} anteriores ficam como já pagas` : ''}.</>
                  : <>Vai virar uma compra à vista de <strong className="mono">{money(parseAmount(plan.total))}</strong>.</>}
                {' '}As parcelas atuais são substituídas (dá para desfazer).
              </p>
            </div>
          )}
        </div>
      )}
      {!targetCard && (
        <div style={{ marginTop: '0.6rem' }}>
          <MethodPicker method={draft.method} setMethod={m => set({ method: m })} />
        </div>
      )}
      {members.length > 0 && (
        <div style={{ marginTop: '0.6rem' }}>
          <HideFromPicker members={members} hideFrom={draft.hideFrom} setHideFrom={fn => set({ hideFrom: typeof fn === 'function' ? fn(draft.hideFrom) : fn })} />
        </div>
      )}
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

// "Esconder de": membros do espaço que não vão ver o lançamento (ex.: o
// presente da Sofia). Fica guardado à parte e as regras impedem a leitura.
function HideFromPicker({ members, hideFrom, setHideFrom }) {
  const toggle = uid => setHideFrom(prev => (prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]));
  return (
    <div className="field" role="group" aria-label="Esconder de">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><EyeOff size={13} aria-hidden="true" />Esconder de</span>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {members.map(m => (
          <button key={m.uid} type="button" className="chip" aria-pressed={hideFrom.includes(m.uid)} onClick={() => toggle(m.uid)}>
            {m.label}
          </button>
        ))}
      </div>
      {hideFrom.length > 0 && (
        <span className="hint">
          {members.filter(m => hideFrom.includes(m.uid)).map(m => m.label).join(', ')} não vai ver este lançamento — nem nos totais e na fatura.
        </span>
      )}
    </div>
  );
}

// "Onde": as listas de gastos fora do cartão ("Outros gastos", "Casa"…).
function TargetGroupOptions({ groups }) {
  const list = groups.length ? groups : [{ id: DEFAULT_GROUP, name: 'Outros gastos' }];
  return (
    <optgroup label="Fora do cartão (Pix, boleto, débito…)">
      {list.map(g => <option key={g.id} value={outsideTarget(g.id)}>{g.name}</option>)}
    </optgroup>
  );
}

// Forma de pagamento fora do cartão (o crédito é lançar num cartão).
function MethodPicker({ method, setMethod, label = 'Forma de pagamento' }) {
  return (
    <div className="field" role="group" aria-label={label}>
      {label}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {PAYMENT_METHODS.map(m => (
          <button key={m.key} type="button" className="chip" aria-pressed={method === m.key}
            onClick={() => setMethod(method === m.key ? '' : m.key)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A última forma usada vira o padrão do próximo gasto (neste aparelho).
const METHOD_KEY = 'gestor-de-gastos:ultima-forma';
function lastMethod() {
  try { return localStorage.getItem(METHOD_KEY) || 'pix'; } catch { return 'pix'; }
}
function rememberMethod(m) {
  try { if (m) localStorage.setItem(METHOD_KEY, m); } catch { /* ignora */ }
}
