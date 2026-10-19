'use client';

import React, { useState } from 'react';
import { Dot, StatusBadge, PanelHeader, Tag } from '../ui';
import { money, monthLabel, currentMonth, daysInMonth } from '../../lib/ledger';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const CARD_DOT = 'var(--accent-light)';
const OTHER_DOT = 'var(--info)';

// Calendário do mês selecionado: vencimento das faturas dos cartões e gastos com
// data (os "fixos" repetem todo mês, no mesmo dia). Respeita o filtro de pessoa.
export function CalendarSection({ bills, selectedMonth, personName, personColor }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const [y, m] = selectedMonth.split('-').map(Number);
  const dim = daysInMonth(y, m - 1);
  const isCurrentMonth = selectedMonth === currentMonth();
  const todayDay = new Date().getDate();

  const events = {};
  for (const b of bills) {
    if (!b.day) continue;
    (events[b.day] ||= []).push(b);
  }

  const daysWithEvents = Object.keys(events).map(Number).sort((a, b) => a - b);
  const monthTotal = bills.reduce((s, b) => s + b.amount, 0);
  const listDays = selectedDay ? daysWithEvents.filter(d => d === selectedDay) : daysWithEvents;

  const blanks = new Date(y, m - 1, 1).getDay();
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <h2 className="display section-title">Calendário de contas</h2>
        {monthTotal > 0 && (
          <span className="hint">no mês: <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(monthTotal)}</span></span>
        )}
      </div>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        Vencimentos das faturas e gastos com data. Toque num dia para ver só ele.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: '0.5rem' }}>
        {WEEKDAYS.map(w => (
          <div key={w} aria-hidden="true" style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} />;
          const evs = events[day] || [];
          const hasOverdue = evs.some(ev => ev.status === 'overdue');
          const hasCard = evs.some(ev => ev.kind === 'card');
          const isToday = isCurrentMonth && day === todayDay;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              aria-pressed={isSelected}
              aria-label={`Dia ${day}${isToday ? ', hoje' : ''}${evs.length ? `, ${evs.length} conta${evs.length > 1 ? 's' : ''}` : ''}${hasOverdue ? ', com conta vencida' : ''}`}
              style={{
                minHeight: 46, borderRadius: 8, padding: '0.3rem 0.2rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 3,
                background: isSelected ? 'var(--panel-alt)' : 'transparent', color: 'var(--text)', fontFamily: 'inherit',
                border: `1px solid ${isSelected ? 'var(--accent)' : hasOverdue ? 'var(--danger)' : hasCard ? 'var(--border-strong)' : 'var(--border)'}`,
                opacity: isCurrentMonth && day < todayDay && evs.length === 0 ? 0.5 : 1,
              }}
            >
              <span className="mono" style={{
                fontSize: '0.8rem', fontWeight: isToday ? 700 : 500, lineHeight: 1,
                ...(isToday ? { background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 999, padding: '0.15rem 0.35rem' } : {}),
              }}>{day}</span>
              <span style={{ display: 'flex', gap: 3, height: 6 }}>
                {evs.slice(0, 4).map(ev => <Dot key={ev.id} size={6} color={ev.kind === 'card' ? CARD_DOT : OTHER_DOT} />)}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dot size={6} color={CARD_DOT} />fatura do cartão</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dot size={6} color={OTHER_DOT} />outro gasto</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: '1px solid var(--danger)' }} />conta vencida</span>
      </div>

      {listDays.length === 0 ? (
        <p className="muted">
          {selectedDay
            ? `Nenhuma conta no dia ${selectedDay}.`
            : `Nada com data em ${monthLabel(selectedMonth)}. Cadastre o dia de vencimento dos cartões e lance gastos para ver aqui.`}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {listDays.map(day => {
            const weekday = WEEKDAYS[new Date(y, m - 1, day).getDay()];
            const isToday = isCurrentMonth && day === todayDay;
            return (
              <div key={day}>
                <div style={{ fontSize: '0.78rem', color: isToday ? 'var(--accent-light)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Dia {String(day).padStart(2, '0')} · {weekday}{isToday ? ' · hoje' : ''}
                </div>
                {events[day].map(ev => <BillLine key={ev.id} bill={ev} personName={personName} personColor={personColor} />)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BillLine({ bill, personName, personColor }) {
  return (
    <div className="row-line" style={{ fontSize: '0.85rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
      <Dot color={bill.kind === 'card' ? CARD_DOT : OTHER_DOT} />
      <span style={{ flex: '1 1 120px', minWidth: 0 }}>{bill.title}</span>
      {bill.kind === 'expense' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <Dot size={7} color={personColor(bill.personId)} />{personName(bill.personId)}
        </span>
      )}
      {bill.status && <StatusBadge status={bill.status} readOnly />}
      <span className="mono" style={{ fontWeight: 600 }}>{money(bill.amount)}</span>
    </div>
  );
}

// Painel "Contas do mês": lista as contas do mês selecionado para marcar como
// pagas. Gastos fixos são marcados mês a mês; faturas, por cartão e mês.
export function BillsPanel({ bills, selectedMonth, onToggle, onClose, personName, personColor, readOnly, filterLabel }) {
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = bills.filter(b => b.paid).reduce((s, b) => s + b.amount, 0);
  const pct = total > 0 ? (paidTotal / total) * 100 : 0;
  const pending = bills.filter(b => !b.paid);
  const paid = bills.filter(b => b.paid);
  const overdueCount = pending.filter(b => b.status === 'overdue').length;

  function row(b) {
    const overdue = b.status === 'overdue';
    return (
      <label key={b.id} className="row-line" style={{
        gap: '0.6rem', padding: '0.55rem 0.2rem', borderBottom: '1px solid var(--border)',
        cursor: readOnly ? 'default' : 'pointer', fontSize: '0.88rem',
      }}>
        <input type="checkbox" checked={b.paid} disabled={readOnly} onChange={() => onToggle(b)}
          style={{ width: 20, height: 20, accentColor: 'var(--success)', flexShrink: 0 }} aria-label={`${b.title}: ${b.paid ? 'paga' : 'marcar como paga'}`} />
        <span className="mono" style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.8rem', width: 48, flexShrink: 0 }}>
          {b.day ? `dia ${String(b.day).padStart(2, '0')}` : '—'}
        </span>
        <span style={{
          flex: '1 1 140px', minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          textDecoration: b.paid ? 'line-through' : 'none', color: b.paid ? 'var(--text-muted)' : 'var(--text)',
        }}>
          {b.title}
          {b.tag && <Tag mono>{b.tag}</Tag>}
          {overdue && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>venceu</span>}
        </span>
        {b.kind === 'expense' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <Dot size={7} color={personColor(b.personId)} />{personName(b.personId)}
          </span>
        ) : (
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>cartão</span>
        )}
        <span className="mono" style={{ fontWeight: 600, color: b.paid ? 'var(--text-muted)' : 'var(--text)' }}>{money(b.amount)}</span>
      </label>
    );
  }

  const groupLabel = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <PanelHeader title={`Contas de ${monthLabel(selectedMonth)}`} onClose={onClose} />
      <p className="hint" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
        {readOnly ? 'Somente leitura.' : 'Marque o que já foi pago. Gastos fixos e faturas são marcados mês a mês.'}
        {filterLabel && <> Mostrando só as contas de <strong>{filterLabel}</strong>.</>}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
        <span>pago <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{money(paidTotal)}</span> de <span className="mono">{money(total)}</span></span>
        {total - paidTotal > 0.004 && (
          <span style={{ color: 'var(--text-muted)' }}>falta <span className="mono" style={{ color: 'var(--text-dim)' }}>{money(total - paidTotal)}</span></span>
        )}
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: 3, transition: 'width 0.2s' }} />
      </div>

      {bills.length === 0 ? (
        <p className="muted">
          Nenhuma conta neste mês. As faturas dos cartões (com gastos no mês) e os outros gastos aparecem aqui para marcar como pagos.
        </p>
      ) : <>
        <div style={groupLabel}>
          A pagar · {pending.length}
          {overdueCount > 0 && <span style={{ color: 'var(--danger)' }}> · {overdueCount} vencida{overdueCount > 1 ? 's' : ''}</span>}
        </div>
        {pending.length === 0
          ? <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Tudo pago neste mês.</p>
          : <div>{pending.map(row)}</div>}

        {paid.length > 0 && (
          <>
            <div style={{ ...groupLabel, marginTop: '1.25rem' }}>Pagas · {paid.length}</div>
            <div>{paid.map(row)}</div>
          </>
        )}
      </>}
    </section>
  );
}
