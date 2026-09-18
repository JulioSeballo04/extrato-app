'use client';

import React, { useState } from 'react';
import { Copy, Check, Eye, X } from 'lucide-react';
import { formatCode } from '../lib/partners';

const ERROR_MESSAGES = {
  'invite-not-found': 'Código não encontrado. Confira e tente de novo.',
  'invite-expired': 'Esse código expirou. Peça um novo para a outra pessoa.',
  'own-invite': 'Esse código foi gerado por você. Passe-o para a outra pessoa digitar no app dela.',
  'already-linked': 'Vocês já estão vinculados.',
  'permission-denied': 'Sem permissão no Firestore. Publique as regras novas (firestore.rules) no Firebase.',
};

function messageFor(err) {
  return ERROR_MESSAGES[err?.code] || 'Não foi possível concluir. Tente de novo.';
}

export default function PartnersPanel({ partnersApi, onView, onClose }) {
  const { partners, error, createInvite, acceptInvite, removeLink } = partnersApi;
  const [inviteCode, setInviteCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  async function handleCreateInvite() {
    setBusy(true); setMessage(null); setCopied(false);
    try {
      setInviteCode(await createInvite(inviteCode));
    } catch (err) {
      setMessage({ type: 'error', text: messageFor(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatCode(inviteCode));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleAccept(e) {
    e.preventDefault();
    setBusy(true); setMessage(null);
    try {
      await acceptInvite(codeInput);
      setCodeInput('');
      setMessage({ type: 'ok', text: 'Vinculado! Agora vocês veem os gastos um do outro.' });
    } catch (err) {
      setMessage({ type: 'error', text: messageFor(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(linkId) {
    if (confirmRemove !== linkId) { setConfirmRemove(linkId); return; }
    setConfirmRemove(null);
    try {
      await removeLink(linkId);
    } catch (err) {
      setMessage({ type: 'error', text: messageFor(err) });
    }
  }

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>Parceiros</h2>
        <button className="icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
        Vincule outra conta para ver os gastos dela. O vínculo é dos dois lados: vocês passam a ver os gastos um do outro,
        somente para leitura — ninguém edita os dados do outro. Qualquer um pode desvincular a qualquer momento.
      </p>

      {error === 'permission-denied' && (
        <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '0 0 1rem' }}>{ERROR_MESSAGES['permission-denied']}</p>
      )}

      {partners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {partners.map(p => (
            <div key={p.linkId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 500, flex: '1 1 140px', wordBreak: 'break-all' }}>{p.label}</span>
              <button className="ghost" onClick={() => onView(p.uid)}>
                <Eye size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Ver gastos
              </button>
              <button className="ghost" onClick={() => handleRemove(p.linkId)}>
                {confirmRemove === p.linkId ? 'Confirmar' : 'Desvincular'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Convidar alguém</div>
          <button className="primary" onClick={handleCreateInvite} disabled={busy}>
            {inviteCode ? 'Gerar novo código' : 'Gerar código'}
          </button>
          {inviteCode && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '1.25rem', letterSpacing: '0.08em', color: 'var(--accent-light)' }}>{formatCode(inviteCode)}</span>
                <button className="ghost" onClick={handleCopy}>
                  {copied ? <Check size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> : <Copy size={14} style={{ marginRight: 4, verticalAlign: -2 }} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.4rem 0 0' }}>
                Passe esse código para a outra pessoa e peça para ela digitar aqui, em “Tenho um código”.
                Vale por 24 horas e só pode ser usado uma vez.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleAccept}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tenho um código</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="XXXXX-XXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              style={{ flex: '1 1 150px', textTransform: 'uppercase' }}
            />
            <button className="primary" type="submit" disabled={busy || !codeInput.trim()}>Vincular</button>
          </div>
        </form>
      </div>

      {message && (
        <p style={{ color: message.type === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: '0.82rem', margin: '1rem 0 0' }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
