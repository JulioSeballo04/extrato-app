'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Dot, StatusBadge } from '../ui';
import { EntryList } from './Entries';
import { CARD_COLORS, cardColorKey } from '../../lib/theme';
import { money, parseAmount, monthLabel, matchesMonth, isRecurring, invoiceInfo, entriesNote, sumAmounts } from '../../lib/ledger';

export default function CardsSection({
  cards, people, cardTransactions, filterPerson, selectedMonth, expandedCard, setExpandedCard,
  onAddCard, onRemoveCard, onUpdateDueDay, onUpdateColor, onToggleInvoice, onNewEntry, onRemoveTx, onTogglePaid, onUpdateTx,
  personName, personColor, cardGradients, readOnly, formOpen, setFormOpen,
}) {
  const [name, setName] = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [color, setColor] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState('');
  const [confirmCardId, setConfirmCardId] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Dê um nome ao cartão (ex.: Roxinho).'); return; }
    onAddCard(name.trim(), parseAmount(limitValue), color, dueDay);
    setName(''); setLimitValue(''); setColor(''); setDueDay(''); setError(''); setFormOpen(false);
  }

  const activeCard = cards.find(c => c.id === expandedCard);
  const toggleCard = id => setExpandedCard(expandedCard === id ? null : id);

  // Quanto cada pessoa gastou em todos os cartões no mês selecionado.
  const spentByPerson = people.map(p => ({
    person: p,
    total: sumAmounts(cardTransactions.filter(t => t.personId === p.id && matchesMonth(t, selectedMonth))),
  }));
  const spentTotal = spentByPerson.reduce((s, x) => s + x.total, 0);

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="display section-title">Cartões de crédito</h2>
        {!readOnly && (
          <button className={`ghost${formOpen ? ' active' : ''}`} onClick={() => setFormOpen(!formOpen)} aria-expanded={formOpen}>
            <Plus size={14} />Cartão
          </button>
        )}
      </div>

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
            <input placeholder="0,00" inputMode="decimal" value={limitValue} onChange={e => setLimitValue(e.target.value)} />
          </label>
          <label className="field" style={{ flex: '0 1 110px' }}>
            Vence dia
            <input placeholder="1 a 31" type="number" inputMode="numeric" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </label>
          <button type="submit" className="primary">Adicionar</button>
          {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', flexBasis: '100%' }}>{error}</span>}
        </form>
      )}

      {cards.length === 0 ? (
        <p className="muted">
          {readOnly ? 'Nenhum cartão cadastrado.' : 'Nenhum cartão cadastrado. Cadastre os cartões para separar a fatura de cada um — ou lance gastos fora do cartão.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
          {cards.map((c, i) => {
            const colorInfo = CARD_COLORS[cardColorKey(c)];
            const [ca, cb] = colorInfo ? colorInfo.gradient : cardGradients[i % cardGradients.length];
            const used = sumAmounts(cardTransactions.filter(t => t.cardId === c.id && matchesMonth(t, selectedMonth)));
            const pct = c.limitValue > 0 ? Math.min(100, (used / c.limitValue) * 100) : 0;
            const due = invoiceInfo(c, selectedMonth, used);
            const expanded = expandedCard === c.id;
            return (
              <div key={c.id} className="credit-card" role="button" tabIndex={0} aria-expanded={expanded}
                aria-label={`Cartão ${c.name}, ${money(used)} usados em ${monthLabel(selectedMonth)}. ${expanded ? 'Fechar' : 'Ver'} lançamentos`}
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
                    <div className="mono" style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>
                      {money(used)}{c.limitValue > 0 && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontWeight: 500 }}> / {money(c.limitValue)}</span>}
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} color="rgba(255,255,255,0.85)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.85)" />}
                </div>
                {c.limitValue > 0 && (
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 2, marginTop: '0.6rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: used > c.limitValue ? '#FFB4A2' : 'rgba(255,255,255,0.9)' }} />
                  </div>
                )}
                {due && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.55rem', color: due.urgent ? '#FFD2C7' : 'rgba(255,255,255,0.85)' }}>
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

      {cards.length > 0 && people.length > 0 && spentTotal > 0 && (
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
          card={activeCard} people={people} selectedMonth={selectedMonth}
          monthTransactions={cardTransactions.filter(t => t.cardId === activeCard.id && matchesMonth(t, selectedMonth))}
          filterPerson={filterPerson}
          onNewEntry={onNewEntry} onRemoveTx={onRemoveTx} onTogglePaid={onTogglePaid} onUpdateTx={onUpdateTx}
          onUpdateDueDay={onUpdateDueDay} onUpdateColor={onUpdateColor} onToggleInvoice={onToggleInvoice}
          personName={personName} personColor={personColor} readOnly={readOnly}
        />
      )}
    </section>
  );
}

function CardLedger({ card, people, monthTransactions, filterPerson, selectedMonth, onNewEntry, onRemoveTx, onTogglePaid, onUpdateTx, onUpdateDueDay, onUpdateColor, onToggleInvoice, personName, personColor, readOnly }) {
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
  // Fatura com as compras deste mês (vence no mês seguinte).
  const invoiceTotal = sumAmounts(monthTransactions);
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
            <button className="primary" onClick={() => onNewEntry(card.id)}><Plus size={14} />Lançar neste cartão</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem 1.1rem', flexWrap: 'wrap', marginBottom: '0.9rem', fontSize: '0.8rem' }}>
        {readOnly ? (
          card.dueDay ? <span style={{ color: 'var(--text-dim)' }}>Fatura vence dia {card.dueDay}</span> : null
        ) : (
          <label className="label-sm" title="As compras de um mês vencem neste dia do mês seguinte">
            Fatura vence dia
            <input type="number" inputMode="numeric" min="1" max="31" placeholder="—" value={card.dueDay || ''} onChange={e => onUpdateDueDay(card.id, e.target.value)} style={{ width: 70 }} />
          </label>
        )}
        {due && (
          <span style={{ color: dueColor, fontWeight: 600 }}>
            Fatura de {monthLabel(selectedMonth).split(' ')[0]}: {due.paid ? 'paga' : due.text.charAt(0).toLowerCase() + due.text.slice(1)}
          </span>
        )}
        {!readOnly && invoiceTotal > 0 && (
          <button className={`ghost${due?.paid ? ' active' : ''}`} aria-pressed={!!due?.paid}
            onClick={() => onToggleInvoice(card.id, selectedMonth)}
            title={due?.paid ? 'Desmarcar: a fatura volta para "a pagar"' : `Marcar a fatura de ${money(invoiceTotal)} como paga`}
            style={due?.paid ? { color: 'var(--success)', borderColor: 'var(--success)' } : undefined}>
            <Check size={14} />{due?.paid ? 'Fatura paga' : 'Marcar fatura como paga'}
          </button>
        )}
        {!readOnly && (
          <label className="label-sm">
            Cor
            <select value={cardColorKey(card)} onChange={e => onUpdateColor(card.id, e.target.value || 'auto')} aria-label="Cor do cartão">
              <option value="">Automática</option>
              {Object.entries(CARD_COLORS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </label>
        )}
        {spentByPerson.map(({ person, total }) => (
          <span key={person.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dim)' }}>
            <Dot color={personColor(person.id)} />
            {person.name} <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{money(total)}</span>
          </span>
        ))}
      </div>

      {!readOnly && people.length === 0 && (
        <p className="muted" style={{ marginBottom: '0.75rem' }}>Cadastre uma pessoa acima para lançar gastos neste cartão.</p>
      )}

      <EntryList
        items={sorted} people={people} readOnly={readOnly}
        // Parcela no cartão: marca se aquela parcela já foi quitada (não vence sozinha; quem vence é a fatura).
        status={t => (t.installmentTotal > 1
          ? <StatusBadge status={t.paid ? 'paid' : 'pending'} readOnly={readOnly} onToggle={() => onTogglePaid(t.id)} />
          : null)}
        onUpdate={onUpdateTx} onRemove={onRemoveTx}
        personName={personName} personColor={personColor}
        emptyText={filterPerson === 'all' ? `Nenhum lançamento neste cartão em ${monthLabel(selectedMonth)}.` : 'Nenhum lançamento dessa pessoa neste cartão no mês.'}
      />
    </div>
  );
}
