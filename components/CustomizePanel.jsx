'use client';

import React from 'react';
import { X } from 'lucide-react';

// Seções que o usuário pode mostrar/esconder. A ordem aqui é só a ordem do painel.
export const SECTIONS = [
  { key: 'people', label: 'Pessoas & salários' },
  { key: 'cards', label: 'Cartões de crédito' },
  { key: 'calendar', label: 'Calendário de contas' },
  { key: 'other', label: 'Outros gastos' },
  { key: 'categories', label: 'Gastos por categoria' },
  { key: 'summary', label: 'Resumo do mês' },
  { key: 'report', label: 'Relatório' },
];

export const DEFAULT_VISIBLE = Object.fromEntries(SECTIONS.map(s => [s.key, true]));

export default function CustomizePanel({ visible, onChange, onClose }) {
  const allOn = SECTIONS.every(s => visible[s.key]);

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Personalizar</h2>
        <button className="icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
        Escolha o que aparece na tela. Isso só esconde a seção — nenhum dado é apagado — e fica salvo neste aparelho.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.6rem 1rem' }}>
        {SECTIONS.map(s => (
          <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!visible[s.key]}
              onChange={e => onChange({ ...visible, [s.key]: e.target.checked })}
              style={{ width: 'auto', padding: 0 }}
            />
            {s.label}
          </label>
        ))}
      </div>
      {!allOn && (
        <button className="ghost" style={{ marginTop: '1rem' }} onClick={() => onChange({ ...DEFAULT_VISIBLE })}>
          Mostrar tudo
        </button>
      )}
    </section>
  );
}
