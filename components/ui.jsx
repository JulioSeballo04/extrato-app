'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { amountInput, parseAmount, moneyTyping, moneyOnBlur } from '../lib/ledger';

// Peças visuais pequenas, usadas em todas as seções.

export function Dot({ color, size = 8 }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />;
}

// Etiqueta: 'neutral' (categoria), 'accent' (fixo), 'info' (parcela).
export function Tag({ children, tone = 'neutral', mono, title }) {
  const tones = {
    neutral: { color: 'var(--text-dim)', background: 'var(--border)' },
    accent: { color: 'var(--on-accent)', background: 'var(--accent)', fontWeight: 600 },
    info: { color: 'var(--on-accent)', background: 'var(--info)', fontWeight: 600 },
  };
  return (
    <span className={mono ? 'tag mono' : 'tag'} title={title} style={tones[tone]}>{children}</span>
  );
}

const STATUS = {
  paid: { label: 'Paga', color: 'var(--success)', background: 'var(--success-bg)', border: 'transparent' },
  pending: { label: 'A pagar', color: 'var(--text-dim)', background: 'transparent', border: 'var(--border-strong)' },
  overdue: { label: 'Vencida', color: 'var(--danger)', background: 'var(--danger-bg)', border: 'transparent' },
};

// Situação de pagamento. Vermelho só para o que já venceu; o resto fica neutro.
export function StatusBadge({ status, onToggle, readOnly }) {
  const s = STATUS[status];
  const style = { color: s.color, background: s.background, borderColor: s.border };
  if (readOnly || !onToggle) return <span className="status" style={style}>{s.label}</span>;
  return (
    <button type="button" className="status" style={style} onClick={onToggle}
      aria-pressed={status === 'paid'} title={status === 'paid' ? 'Marcar como não paga' : 'Marcar como paga'}>
      {s.label}
    </button>
  );
}

export function PanelHeader({ title, onClose, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
      <h2 className="display section-title">{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
        {onClose && <button className="icon" onClick={onClose} aria-label="Fechar"><X size={18} /></button>}
      </div>
    </div>
  );
}

// Janela por cima da tela (no celular, sobe de baixo). Esc ou clique fora fecham.
export function Sheet({ title, onClose, children }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const prevFocus = document.activeElement;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.querySelector('input, select, textarea, button:not(.icon)')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);
  return (
    <div className="sheet-backdrop no-print" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={boxRef}>
        <PanelHeader title={title} onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

// Aviso na parte de baixo da tela, com uma ação opcional (ex.: Desfazer).
export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast || toast.persistent) return undefined;
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast no-print" role={toast.tone === 'error' ? 'alert' : 'status'}
      style={toast.tone === 'error' ? { borderColor: 'var(--danger)' } : undefined}>
      <span style={{ flex: 1 }}>{toast.text}</span>
      {toast.action && (
        <button className="ghost" onClick={() => { toast.action.run(); onClose(); }}>{toast.action.label}</button>
      )}
      <button className="icon" onClick={onClose} aria-label="Fechar aviso"><X size={16} /></button>
    </div>
  );
}

// Campo de dinheiro, como calculadora: digitar 5000 dá "5.000"; a vírgula começa
// os centavos (12,5). Ao sair do campo vira "5.000,00" (ver moneyTyping /
// moneyOnBlur). `value` é o texto; quem usa converte com parseAmount.
export function MoneyInput({ value, onChange, onBlur, style, className = '', ...rest }) {
  return (
    <span className="money-input" style={style}>
      <span className="money-prefix" aria-hidden="true">R$</span>
      <input
        {...rest}
        className={`mono ${className}`}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        value={value}
        onChange={e => onChange(moneyTyping(value, e.target.value))}
        onBlur={e => {
          const done = moneyOnBlur(value);
          if (done !== value) onChange(done);
          onBlur?.(e, done);
        }}
        onPaste={e => {
          e.preventDefault();
          onChange(amountInput(Math.abs(parseAmount(e.clipboardData.getData('text')))));
        }}
      />
    </span>
  );
}

export function Muted({ children, style }) {
  return <p className="muted" style={style}>{children}</p>;
}
