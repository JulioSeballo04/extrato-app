'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check, HandCoins, Pencil } from 'lucide-react';
import { Dot, StatusBadge, MoneyInput } from '../ui';
import { EntryList } from './Entries';
import { CARD_COLORS, cardColorKey } from '../../lib/theme';
import { money, parseAmount, amountInput, monthLabel, matchesMonth, isRecurring, invoiceInfo, entriesNote, sumAmounts, isPayee, capitalize, cardLimitUsage, entryInInvoice, invoiceCloseDate, fmtDate, todayStr } from '../../lib/ledger';

export default function CardsSection({
  cards, people, cardTransactions, filterPerson, selectedMonth, expandedCard, setExpandedCard,
  onAddCard, onRemoveCard, onUpdateCard, onToggleInvoice, onNewEntry, onRemoveTx, onUpdateTx,
  personName, personColor, authorName, members, visibilityLabel, groups, cardGradients, readOnly, formOpen, setFormOpen,
}) {
  const [name, setName] = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [color, setColor] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [closeDay, setCloseDay] = useState('');
  const [error, setError] = useState('');
  const [confirmCardId, setConfirmCardId] = useState(null);
  const [payeeFormOpen, setPayeeFormOpen] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Dê um nome ao cartão (ex.: Roxinho).'); return; }
    onAddCard(name.trim(), parseAmount(limitValue), color, dueDay, undefined, closeDay);
    setName(''); setLimitValue(''); setColor(''); setDueDay(''); setCloseDay(''); setError(''); setFormOpen(false);
  }

  const activeCard = cards.find(c => c.id === expandedCard);
  const toggleCard = id => setExpandedCard(expandedCard === id ? null : id);
  const realCards = cards.filter(c => !isPayee(c));
  const payees = cards.filter(isPayee);
  const payeeIds = new Set(payees.map(c => c.id));
  const openForm = which => {
    setFormOpen(which === 'card' ? !formOpen : false);
    setPayeeFormOpen(which === 'payee' ? !payeeFormOpen : false);
  };

  // Quanto cada pessoa gastou em todos os cartões (sem as pessoas a pagar) no mês.
  const spentByPerson = people.map(p => ({
    person: p,
    total: sumAmounts(cardTransactions.filter(t => t.personId === p.id && !payeeIds.has(t.cardId) && matchesMonth(t, selectedMonth))),
  }));
  const spentTotal = spentByPerson.reduce((s, x) => s + x.total, 0);

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="display section-title">Cartões de crédito</h2>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className={`ghost${formOpen ? ' active' : ''}`} onClick={() => openForm('card')} aria-expanded={formOpen}>
              <Plus size={14} />Cartão
            </button>
            <button className={`ghost${payeeFormOpen ? ' active' : ''}`} onClick={() => openForm('payee')} aria-expanded={payeeFormOpen}
              title="Alguém a quem você deve: ex.: compras no cartão da mãe, dinheiro emprestado">
              <Plus size={14} />Pessoa a pagar
            </button>
          </div>
        )}
      </div>

      {payeeFormOpen && !readOnly && (
        <PayeeForm onAdd={(n, d) => { onAddCard(n, 0, '', d, 'payee'); setPayeeFormOpen(false); }} />
      )}

      {formOpen && !readOnly && (
        <form onSubmit={submit} className="panel" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 180px' }}>
            Nome do cartão
            <input placeholder="Ex.: Roxinho" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!error} autoFocus maxLength={60} />
          </label>
          <label className="field" style={{ flex: '0 1 150px' }}>
            Cor
            <select value={color} onChange={e => setColor(e.target.value)}>
              <option value="">Automática</option>
              {Object.entries(CARD_COLORS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: '0 1 130px' }}>
            Limite
            <MoneyInput value={limitValue} onChange={setLimitValue} />
          </label>
          <label className="field" style={{ flex: '0 1 110px' }}>
            Fecha dia
            <input placeholder="opcional" type="number" inputMode="numeric" min="1" max="31" value={closeDay} onChange={e => setCloseDay(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '0 1 110px' }}>
            Vence dia
            <input placeholder="1 a 31" type="number" inputMode="numeric" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </label>
          <button type="submit" className="primary">Adicionar</button>
          <p className="hint" style={{ flexBasis: '100%', margin: 0 }}>
            Com o dia de fechamento, compras feitas a partir dele entram na fatura seguinte, como no banco.
          </p>
          {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', flexBasis: '100%' }}>{error}</span>}
        </form>
      )}

      {cards.length === 0 && (
        <p className="muted">
          {readOnly ? 'Nenhum cartão cadastrado.' : 'Nenhum cartão cadastrado. Cadastre seus cartões, ou uma pessoa a quem você deve (ex.: quando usa o cartão da mãe) — ou lance gastos fora do cartão.'}
        </p>
      )}
      {realCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
          {realCards.map((c, i) => {
            const colorInfo = CARD_COLORS[cardColorKey(c)];
            const [ca, cb] = colorInfo ? colorInfo.gradient : cardGradients[i % cardGradients.length];
            // Fatura do mês escolhido (respeita o dia de fechamento, se houver).
            const used = sumAmounts(cardTransactions.filter(t => entryInInvoice(c, t, selectedMonth)));
            // Limite como no banco: parcelas futuras ocupam, fatura paga libera (sempre "hoje").
            const limit = cardLimitUsage(c, cardTransactions);
            const due = invoiceInfo(c, selectedMonth, used);
            // Fechamento da fatura do mês (se o cartão tem dia de fechamento).
            const closeDate = invoiceCloseDate(c, selectedMonth);
            const closed = closeDate && closeDate <= todayStr();
            const expanded = expandedCard === c.id;
            return (
              <div key={c.id} className="credit-card" role="button" tabIndex={0} aria-expanded={expanded}
                aria-label={`Cartão ${c.name}: fatura de ${monthLabel(selectedMonth)} ${money(used)}${c.limitValue > 0 ? `, limite disponível ${money(limit.available)} de ${money(c.limitValue)}` : ''}. ${expanded ? 'Fechar' : 'Ver'} lançamentos`}
                onClick={() => toggleCard(c.id)}
                onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleCard(c.id); } }}
                style={{ background: `linear-gradient(135deg, ${ca}, ${cb})` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div aria-hidden="true" style={{ width: 30, height: 22, borderRadius: 5, background: colorInfo ? 'linear-gradient(135deg, #ffffffcc, #ffffff55)' : 'linear-gradient(135deg,var(--accent-light),var(--accent))' }} />
                  {!readOnly && (
                    <button className="icon" style={{ color: 'rgba(255,255,255,0.75)', margin: '-0.4rem -0.5rem 0 0' }} aria-label={`Remover cartão ${c.name}`}
                      onClick={e => { e.stopPropagation(); setConfirmCardId(c.id); }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>{money(used)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)' }}>fatura de {monthLabel(selectedMonth).split(' ')[0]}</div>
                  </div>
                  {expanded ? <ChevronUp size={18} color="rgba(255,255,255,0.85)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.85)" />}
                </div>
                {c.limitValue > 0 && (
                  <>
                    <div title="Limite usado: inclui as parcelas dos próximos meses" style={{ height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 2, marginTop: '0.6rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${limit.pct}%`, background: limit.over ? '#FFB4A2' : 'rgba(255,255,255,0.9)' }} />
                    </div>
                    <div className="mono" style={{ fontSize: '0.72rem', marginTop: '0.35rem', color: limit.over ? '#FFD2C7' : 'rgba(255,255,255,0.85)' }}>
                      {limit.over
                        ? `Acima do limite em ${money(-limit.available)}`
                        : `Disponível ${money(limit.available)} de ${money(c.limitValue)}`}
                    </div>
                  </>
                )}
                {closeDate && !due?.paid && (
                  <div style={{ fontSize: '0.72rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                    {closed ? `Fechou em ${fmtDate(closeDate)}` : `Fecha em ${fmtDate(closeDate)}`}
                  </div>
                )}
                {due && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: closeDate && !due.paid ? '0.15rem' : '0.55rem', color: due.urgent ? '#FFD2C7' : 'rgba(255,255,255,0.85)' }}>
                    {due.text}
                  </div>
                )}
                {confirmCardId === c.id && (
                  <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{
                    position: 'absolute', inset: 0, background: 'rgba(10,10,14,0.9)', cursor: 'default',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', textAlign: 'center',
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                      Apagar o cartão <strong>{c.name}</strong>{entriesNote(cardTransactions.filter(t => t.cardId === c.id).length)}?
                    </span>
                    <span style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="ghost" style={{ borderColor: '#FFB4A2', color: '#FFB4A2' }} onClick={() => { setConfirmCardId(null); onRemoveCard(c.id); }}>Apagar</button>
                      <button className="ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => setConfirmCardId(null)} autoFocus>Cancelar</button>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payees.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.95rem', margin: realCards.length ? '1.5rem 0 0.75rem' : '0 0 0.75rem', color: 'var(--text-dim)' }}>Pessoas a pagar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
            {payees.map(c => (
              <PayeeTile key={c.id} payee={c} selectedMonth={selectedMonth} readOnly={readOnly}
                owed={sumAmounts(cardTransactions.filter(t => t.cardId === c.id && matchesMonth(t, selectedMonth)))}
                entryCount={cardTransactions.filter(t => t.cardId === c.id).length}
                expanded={expandedCard === c.id} onToggle={() => toggleCard(c.id)} onRemove={() => onRemoveCard(c.id)} />
            ))}
          </div>
        </>
      )}

      {realCards.length > 0 && people.length > 0 && spentTotal > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem 1.1rem', flexWrap: 'wrap', marginTop: '0.9rem', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>No cartão em {monthLabel(selectedMonth)}:</span>
          {spentByPerson.filter(x => x.total > 0).map(({ person, total }) => (
            <span key={person.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Dot color={personColor(person.id)} />
              {person.name} <span className="mono" style={{ fontWeight: 600 }}>{money(total)}</span>
            </span>
          ))}
          {people.length > 1 && (
            <span style={{ color: 'var(--text-muted)' }}>· total <span className="mono" style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{money(spentTotal)}</span></span>
          )}
        </div>
      )}

      {activeCard && (
        <CardLedger
          card={activeCard} cards={cards} allTransactions={cardTransactions} people={people} selectedMonth={selectedMonth}
          monthTransactions={cardTransactions.filter(t => entryInInvoice(activeCard, t, selectedMonth))}
          filterPerson={filterPerson}
          onNewEntry={onNewEntry} onRemoveTx={onRemoveTx} onUpdateTx={onUpdateTx} authorName={authorName}
          members={members} visibilityLabel={visibilityLabel} groups={groups}
          onUpdateCard={onUpdateCard} onToggleInvoice={onToggleInvoice}
          personName={personName} personColor={personColor} readOnly={readOnly}
        />
      )}
    </section>
  );
}

// Cadastro de pessoa a quem se deve (ex.: a mãe, quando se usa o cartão dela).
function PayeeForm({ onAdd }) {
  const [name, setName] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Digite o nome (ex.: Mãe).'); return; }
    onAdd(name.trim(), dueDay);
  }
  return (
    <form onSubmit={submit} className="panel" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <p className="hint" style={{ flexBasis: '100%', marginBottom: '0.25rem' }}>
        Para quem você precisa pagar de volta: compras no cartão de alguém, dinheiro emprestado, uma conta que outra pessoa pagou por você.
      </p>
      <label className="field" style={{ flex: '1 1 180px' }}>
        Nome
        <input placeholder="Ex.: Mãe" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!error} autoFocus maxLength={60} />
      </label>
      <label className="field" style={{ flex: '0 1 170px' }}>
        Pagar até o dia (opcional)
        <input placeholder="1 a 31" type="number" inputMode="numeric" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
      </label>
      <button type="submit" className="primary">Adicionar</button>
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', flexBasis: '100%' }}>{error}</span>}
    </form>
  );
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function PayeeTile({ payee, owed, entryCount, selectedMonth, expanded, onToggle, onRemove, readOnly }) {
  const [confirm, setConfirm] = useState(false);
  const due = invoiceInfo(payee, selectedMonth, owed);
  const month = monthLabel(selectedMonth).split(' ')[0];
  return (
    <div className="panel" role="button" tabIndex={0} aria-expanded={expanded}
      aria-label={`${payee.name}: você deve ${money(owed)} em ${month}. ${expanded ? 'Fechar' : 'Ver'} lançamentos`}
      onClick={onToggle}
      onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } }}
      style={{ cursor: 'pointer', position: 'relative', padding: '1rem', borderColor: expanded ? 'var(--accent)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span aria-hidden="true" style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--panel-alt)', border: '1px solid var(--accent)', color: 'var(--accent-light)', fontWeight: 700, fontSize: '0.9rem',
        }}>{initials(payee.name) || <HandCoins size={18} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{payee.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {owed > 0
              ? <>{due?.paid ? 'pago' : 'você deve'} <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{money(owed)}</span> em {month}</>
              : `nada em ${month}`}
          </div>
        </div>
        {!readOnly && (
          <button className="icon delete" aria-label={`Remover ${payee.name}`} onClick={e => { e.stopPropagation(); setConfirm(true); }}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {due && owed > 0 && (
        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.6rem', color: due.paid ? 'var(--success)' : due.urgent ? 'var(--danger)' : 'var(--text-dim)' }}>
          {due.text}
        </div>
      )}
      {confirm && (
        <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{
          position: 'absolute', inset: 0, background: 'var(--panel)', borderRadius: 16, cursor: 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', textAlign: 'center',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Apagar <strong>{payee.name}</strong>{entriesNote(entryCount)}?</span>
          <span style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="ghost danger" onClick={() => { setConfirm(false); onRemove(); }}>Apagar</button>
            <button className="ghost" onClick={() => setConfirm(false)} autoFocus>Cancelar</button>
          </span>
        </div>
      )}
    </div>
  );
}

function CardLedger({ card, cards, allTransactions, people, monthTransactions, filterPerson, selectedMonth, onNewEntry, onRemoveTx, onUpdateTx, onUpdateCard, onToggleInvoice, personName, personColor, authorName, members, visibilityLabel, groups, readOnly }) {
  const ref = useRef(null);
  // Ao abrir um cartão, traz os lançamentos para a tela (no celular ficam lá embaixo).
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [card.id]);

  const transactions = monthTransactions.filter(t => filterPerson === 'all' || t.personId === filterPerson);
  const fixedTotal = sumAmounts(transactions.filter(isRecurring));
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const spentByPerson = people
    .map(p => ({ person: p, total: sumAmounts(monthTransactions.filter(t => t.personId === p.id)) }))
    .filter(x => x.total > 0);
  const payee = isPayee(card);
  // Fatura com as compras deste mês (cartão: vence no mês seguinte; pessoa: no próprio mês).
  const invoiceTotal = sumAmounts(monthTransactions);
  const month = monthLabel(selectedMonth).split(' ')[0];
  const limit = !payee && card.limitValue > 0 ? cardLimitUsage(card, allTransactions || []) : null;
  const closeDate = payee ? null : invoiceCloseDate(card, selectedMonth);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setEditing(false); }, [card.id]);
  const due = invoiceInfo(card, selectedMonth, invoiceTotal);
  const dueColor = due?.paid ? 'var(--success)' : due?.urgent ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div className="panel" ref={ref} style={{ marginTop: '1rem', scrollMarginTop: '1rem', scrollMarginBottom: '6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Lançamentos · {card.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {fixedTotal > 0 && (
            <span className="hint">fixos: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(fixedTotal)}</span>/mês</span>
          )}
          {!readOnly && people.length > 0 && (
            <button className="primary" onClick={() => onNewEntry(card.id)}><Plus size={14} />{payee ? `Lançar para ${card.name}` : 'Lançar neste cartão'}</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem 1.1rem', flexWrap: 'wrap', marginBottom: '0.9rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {payee
            ? (card.dueDay ? `Pagar até o dia ${card.dueDay}` : 'Sem dia combinado')
            : [card.closeDay ? `Fecha dia ${card.closeDay}` : null, card.dueDay ? `vence dia ${card.dueDay}` : 'sem dia de vencimento']
              .filter(Boolean).join(' · ')}
          {closeDate && !due?.paid && <> · esta fatura fecha {fmtDate(closeDate)}</>}
        </span>
        {!readOnly && (
          <button className={`ghost${editing ? ' active' : ''}`} onClick={() => setEditing(e => !e)} aria-expanded={editing}>
            <Pencil size={13} />{payee ? 'Editar' : 'Editar cartão'}
          </button>
        )}
        {due && (
          <span style={{ color: dueColor, fontWeight: 600 }}>
            {payee ? capitalize(month) : `Fatura de ${month}`}: {due.paid ? (payee ? 'pago' : 'paga') : due.text.charAt(0).toLowerCase() + due.text.slice(1)}
          </span>
        )}
        {!readOnly && invoiceTotal > 0 && (
          <button className={`ghost${due?.paid ? ' active' : ''}`} aria-pressed={!!due?.paid}
            onClick={() => onToggleInvoice(card.id, selectedMonth)}
            title={due?.paid ? 'Desmarcar: volta para "a pagar"' : `Marcar ${money(invoiceTotal)} como pago`}
            style={due?.paid ? { color: 'var(--success)', borderColor: 'var(--success)' } : undefined}>
            <Check size={14} />{payee
              ? (due?.paid ? `Pago a ${card.name}` : `Paguei ${money(invoiceTotal)} a ${card.name}`)
              : (due?.paid ? 'Fatura paga' : 'Marcar fatura como paga')}
          </button>
        )}

        {spentByPerson.map(({ person, total }) => (
          <span key={person.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dim)' }}>
            <Dot color={personColor(person.id)} />
            {person.name} <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{money(total)}</span>
          </span>
        ))}
      </div>

      {editing && !readOnly && (
        <CardEditForm card={card} payee={payee} onCancel={() => setEditing(false)}
          onSave={patch => { onUpdateCard(card.id, patch); setEditing(false); }} />
      )}
      {limit && (
        <p className="hint" style={{ margin: '-0.4rem 0 0.9rem', color: limit.over ? 'var(--danger)' : undefined }}>
          Limite usado hoje: <strong className="mono">{money(limit.used)}</strong> de {money(card.limitValue)}
          {limit.future > 0 && <> (inclui <span className="mono">{money(limit.future)}</span> em parcelas dos próximos meses)</>}
          {' · '}{limit.over ? `acima do limite em ${money(-limit.available)}` : <>disponível <strong className="mono">{money(limit.available)}</strong></>}.
          {' '}Cada fatura marcada como paga libera o limite dela.
        </p>
      )}
      {!readOnly && people.length === 0 && (
        <p className="muted" style={{ marginBottom: '0.75rem' }}>Cadastre uma pessoa acima para lançar gastos neste cartão.</p>
      )}

      <EntryList
        items={sorted} people={people} cards={cards} groups={groups} readOnly={readOnly}
        // Parcela no cartão: marca se aquela parcela já foi quitada (não vence sozinha; quem vence é a fatura).
        // A parcela no cartão segue a fatura do mês: paga quando a fatura foi paga
        // (ou quando foi lançada como "já paga"). Pessoa a pagar: o "pago" é do mês.
        status={t => (t.installmentTotal > 1 && !payee
          ? <StatusBadge status={t.paid || due?.paid ? 'paid' : 'pending'} readOnly />
          : null)}
        selectedMonth={selectedMonth} authorName={authorName} members={members} visibilityLabel={visibilityLabel}
        onUpdate={onUpdateTx} onRemove={onRemoveTx}
        personName={personName} personColor={personColor}
        emptyText={payee
          ? `Nada lançado para ${card.name} em ${monthLabel(selectedMonth)}.`
          : filterPerson === 'all' ? `Nenhum lançamento neste cartão em ${monthLabel(selectedMonth)}.` : 'Nenhum lançamento dessa pessoa neste cartão no mês.'}
      />
    </div>
  );
}

// Editar cartão (ou pessoa a pagar): nome, limite, cor, fechamento e vencimento.
function CardEditForm({ card, payee, onSave, onCancel }) {
  const [name, setName] = useState(card.name);
  const [limitValue, setLimitValue] = useState(amountInput(card.limitValue));
  const [color, setColor] = useState(cardColorKey(card));
  const [dueDay, setDueDay] = useState(card.dueDay ? String(card.dueDay) : '');
  const [closeDay, setCloseDay] = useState(card.closeDay ? String(card.closeDay) : '');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('O nome não pode ficar vazio.'); return; }
    const day = v => (v === '' ? 0 : Number(v));
    if ([dueDay, closeDay].some(v => v !== '' && !(day(v) >= 1 && day(v) <= 31))) { setError('Os dias vão de 1 a 31.'); return; }
    onSave(payee
      ? { name, dueDay }
      : { name, limitValue: parseAmount(limitValue), color: color || 'auto', dueDay, closeDay });
  }

  return (
    <form onSubmit={submit} onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      style={{ padding: '0.75rem', marginBottom: '0.9rem', background: 'var(--panel-alt)', borderRadius: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <label className="field">
          Nome
          <input value={name} onChange={e => { setName(e.target.value); setError(''); }} maxLength={60} autoFocus />
        </label>
        {!payee && (
          <label className="field">
            Limite
            <MoneyInput value={limitValue} onChange={setLimitValue} />
          </label>
        )}
        {!payee && (
          <label className="field">
            Fecha dia
            <input type="number" inputMode="numeric" min="1" max="31" placeholder="opcional" value={closeDay} onChange={e => { setCloseDay(e.target.value); setError(''); }} />
          </label>
        )}
        <label className="field">
          {payee ? 'Pagar até o dia' : 'Vence dia'}
          <input type="number" inputMode="numeric" min="1" max="31" placeholder={payee ? 'opcional' : '1 a 31'} value={dueDay} onChange={e => { setDueDay(e.target.value); setError(''); }} />
        </label>
        {!payee && (
          <label className="field">
            Cor
            <select value={color} onChange={e => setColor(e.target.value)}>
              <option value="">Automática</option>
              {Object.entries(CARD_COLORS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {!payee && (
        <p className="hint" style={{ margin: '0.5rem 0 0' }}>
          Compras feitas a partir do dia de fechamento entram na fatura seguinte. Sem fechamento, cada fatura junta as compras do mês.
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {error && <span role="alert" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginRight: 'auto' }}>{error}</span>}
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary"><Check size={15} />Salvar</button>
      </div>
    </form>
  );
}
