'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { money } from '../../lib/ledger';

// Os números do mês, logo no topo: quanto foi gasto, quanto já foi pago,
// quanto falta pagar e quanto sobra do salário. Respeita o filtro de pessoa.
export function MonthOverview({ spent, cardSum, otherSum, paid, toPay, billsTotal, overdueCount, pendingCount, salary, onOpenBills }) {
  const balance = salary - spent;
  return (
    <section className="overview" aria-label="Resumo do mês">
      <div className="tile">
        <div className="tile-label">Gasto no mês</div>
        <div className="tile-value">{money(spent)}</div>
        <div className="tile-sub">cartão {money(cardSum)} · outros {money(otherSum)}</div>
      </div>
      <button className="tile" onClick={onOpenBills} aria-label={`A pagar: ${money(toPay)}. Abrir contas do mês`}>
        <div className="tile-label">A pagar</div>
        <div className="tile-value" style={{ color: overdueCount > 0 ? 'var(--danger)' : undefined }}>{money(toPay)}</div>
        <div className="tile-sub" style={{ color: overdueCount > 0 ? 'var(--danger)' : undefined }}>
          {overdueCount > 0
            ? `${overdueCount} vencida${overdueCount > 1 ? 's' : ''} · ver contas`
            : pendingCount > 0 ? `${pendingCount} conta${pendingCount > 1 ? 's' : ''} · ver contas` : 'tudo em dia'}
        </div>
      </button>
      <div className="tile">
        <div className="tile-label">Já pago</div>
        <div className="tile-value" style={{ color: 'var(--success)' }}>{money(paid)}</div>
        <div className="tile-sub">{billsTotal > 0 ? `de ${money(billsTotal)} em contas` : 'nenhuma conta vence no mês'}</div>
      </div>
      <div className="tile">
        <div className="tile-label">{salary > 0 ? (balance >= 0 ? 'Sobra' : 'Falta') : 'Sobra'}</div>
        {salary > 0 ? (
          <>
            <div className="tile-value" style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{money(Math.abs(balance))}</div>
            <div className="tile-sub">salários {money(salary)}</div>
          </>
        ) : (
          <>
            <div className="tile-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="tile-sub">informe os salários para ver</div>
          </>
        )}
      </div>
    </section>
  );
}

// Primeiro acesso: três passos para o app começar a fazer sentido.
export function Onboarding({ hasPeople, hasCards, hasEntries, onAddPerson, onAddCard, onAddEntry }) {
  const steps = [
    { done: hasPeople, title: 'Adicione as pessoas', text: 'Quem divide as contas, com o salário (opcional).', action: 'Adicionar pessoa', run: onAddPerson },
    { done: hasCards, title: 'Cadastre os cartões', text: 'Opcional: separa a fatura de cada cartão.', action: 'Adicionar cartão', run: onAddCard, optional: true },
    { done: hasEntries, title: 'Lance o primeiro gasto', text: 'No cartão ou fora dele (Pix, boleto…).', action: 'Novo gasto', run: onAddEntry, disabled: !hasPeople },
  ];
  return (
    <section className="panel" style={{ borderColor: 'var(--accent)' }}>
      <h2 className="display section-title">Comece por aqui</h2>
      <p className="hint" style={{ margin: '0.3rem 0 1rem' }}>Três passos e o resumo do mês já aparece.</p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {steps.map((s, i) => (
          <li key={s.title} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span aria-hidden="true" style={{
              width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontWeight: 700, fontSize: '0.85rem',
              background: s.done ? 'var(--success-bg)' : 'var(--panel-alt)', color: s.done ? 'var(--success)' : 'var(--text-dim)',
              border: `1px solid ${s.done ? 'var(--success)' : 'var(--border-strong)'}`,
            }}>{s.done ? <Check size={15} /> : i + 1}</span>
            <span style={{ flex: '1 1 200px' }}>
              <span style={{ fontWeight: 600, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-muted)' : 'var(--text)' }}>
                {s.title}
              </span>
              {s.done && <span className="sr-only"> (feito)</span>}
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.text}</span>
            </span>
            {!s.done && (
              <button className={i === steps.findIndex(x => !x.done && !x.optional) ? 'primary' : 'ghost'} onClick={s.run} disabled={s.disabled}>
                {s.action}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
