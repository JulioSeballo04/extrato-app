'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { PanelHeader } from './ui';
import { PALETTES, AUTO_PALETTE } from '../lib/theme';

// Seções que o usuário pode mostrar/esconder. A ordem aqui é só a ordem do painel.
export const SECTIONS = [
  { key: 'cards', label: 'Cartões de crédito' },
  { key: 'other', label: 'Outros gastos' },
  { key: 'calendar', label: 'Calendário de contas' },
  { key: 'categories', label: 'Gastos por categoria' },
  { key: 'summary', label: 'Resumo por pessoa' },
  { key: 'people', label: 'Pessoas & salários' },
  { key: 'report', label: 'Relatório' },
];

export const DEFAULT_VISIBLE = Object.fromEntries(SECTIONS.map(s => [s.key, true]));

const THEME_OPTIONS = [
  { key: AUTO_PALETTE, label: 'Automático', colors: [PALETTES.light.bg, PALETTES.gold.bg, PALETTES.gold.accent] },
  ...Object.entries(PALETTES).map(([key, p]) => ({ key, label: p.label, colors: [p.bg, p.panel, p.accent] })),
];

export default function CustomizePanel({ visible, onChange, onClose, paletteKey, onPalette }) {
  const allOn = SECTIONS.every(s => visible[s.key]);
  const label = { fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.6rem' };

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <PanelHeader title="Personalizar" onClose={onClose} />

      <div style={{ ...label, marginTop: '0.6rem' }}>Cores do app</div>
      <div role="radiogroup" aria-label="Cores do app" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        {THEME_OPTIONS.map(opt => {
          const selected = paletteKey === opt.key;
          return (
            <button key={opt.key} type="button" role="radio" aria-checked={selected} onClick={() => onPalette(opt.key)}
              className={`ghost${selected ? ' active' : ''}`} style={{ padding: '0.35rem 0.7rem 0.35rem 0.4rem', gap: '0.5rem' }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
                {opt.colors.map((c, i) => <span key={i} style={{ width: 12, height: 22, background: c }} />)}
              </span>
              {opt.label}
              {selected && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="hint" style={{ marginBottom: '1.25rem' }}>“Automático” fica claro ou escuro conforme o seu aparelho. A cor vale para a sua conta, em todos os aparelhos.</p>

      <div style={label}>Seções na tela</div>
      <p className="hint" style={{ marginBottom: '0.75rem' }}>
        Esconder uma seção não apaga nenhum dado. Essa escolha fica salva só neste aparelho.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.6rem 1rem' }}>
        {SECTIONS.map(s => (
          <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', minHeight: 32 }}>
            <input type="checkbox" checked={!!visible[s.key]} onChange={e => onChange({ ...visible, [s.key]: e.target.checked })} />
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
