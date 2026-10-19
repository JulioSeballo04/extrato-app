'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, LogOut } from 'lucide-react';
import { PanelHeader } from './ui';
import { useAuth } from '../context/AuthContext';
import { exportUserData, accountDeletionPlan, deleteUserData } from '../lib/spaces';

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Planilha dos lançamentos do espaço atual. Ponto e vírgula e vírgula decimal
// (padrão do Excel em português); o BOM faz o Excel ler os acentos certo.
function entriesCsv({ people, cards, cardTransactions, otherExpenses }) {
  const personName = id => people.find(p => p.id === id)?.name || '';
  const cardName = id => cards.find(c => c.id === id)?.name || '';
  const cell = v => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const amount = v => (Number(v) || 0).toFixed(2).replace('.', ',');
  const rows = [
    ...cardTransactions.map(t => ({
      ...t, cartao: cardName(t.cardId),
      tipo: cards.find(c => c.id === t.cardId)?.kind === 'payee' ? 'Devo a pessoa' : 'Cartão',
    })),
    ...otherExpenses.map(t => ({ ...t, tipo: 'Outro gasto', cartao: '' })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const header = ['Data', 'Tipo', 'Cartão', 'Descrição', 'Categoria', 'Pessoa', 'Valor', 'Parcela', 'Fixo', 'Pago'];
  const lines = rows.map(t => [
    t.date, t.tipo, t.cartao, t.description, t.category, personName(t.personId), amount(t.amount),
    t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal}` : '', t.fixed ? 'sim' : '', t.paid ? 'sim' : '',
  ].map(cell).join(';'));
  return '﻿' + [header.join(';'), ...lines].join('\r\n');
}

const DELETE_ERRORS = {
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'Senha incorreta.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de confirmar.',
  'auth/user-mismatch': 'Entre com a mesma conta do Google que você usa aqui.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
};

export default function AccountPanel({ spacesApi, data, spaceName, onClose, onLogout, onClearAll }) {
  const { user, signInMethod, reauthenticate, deleteAccount } = useAuth();
  const { spaces } = spacesApi;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const method = signInMethod();
  const plan = accountDeletionPlan(user.uid, spaces);

  async function handleExport() {
    setBusy(true); setMessage(null);
    try {
      const out = await exportUserData(user, spaces);
      download(`meus-dados-${today()}.json`, JSON.stringify(out, null, 2), 'application/json');
      setMessage({ type: 'ok', text: 'Arquivo com todos os seus dados baixado.' });
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível exportar agora. Tente de novo.' });
    } finally {
      setBusy(false);
    }
  }

  function handleCsv() {
    download(`lancamentos-${today()}.csv`, entriesCsv(data), 'text/csv;charset=utf-8');
  }

  async function handleDelete(e) {
    e.preventDefault();
    setBusy(true); setMessage(null);
    try {
      // Confirma a identidade ANTES de apagar qualquer coisa: se falhar, nada muda.
      await reauthenticate(password);
      await deleteUserData(user.uid, spaces);
      await deleteAccount();
      // O AuthContext percebe a saída e o app volta para a tela de login.
    } catch (err) {
      setMessage({ type: 'error', text: DELETE_ERRORS[err?.code] || 'Não foi possível excluir a conta agora. Nada foi apagado se a confirmação falhou; tente de novo.' });
      setBusy(false);
    }
  }

  const label = { fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' };
  const hint = { color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.4rem 0 0' };
  const planText = step => ({
    delete: 'será apagado com todos os gastos',
    transfer: `passa para ${step.heirLabel}, que continua usando`,
    leave: 'você sai; os dados continuam com o dono',
  }[step.action]);

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <PanelHeader title="Sua conta" onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', margin: '0 0 1.25rem' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0, wordBreak: 'break-all' }}>
          {user.email} · entra com {method === 'password' ? 'e-mail e senha' : 'Google'}
        </p>
        <button className="ghost" onClick={onLogout}><LogOut size={14} />Sair</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div>
          <div style={label}>Baixar seus dados</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="ghost" onClick={handleCsv}>
              <Download size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Planilha de “{spaceName}”
            </button>
            <button className="ghost" onClick={handleExport} disabled={busy}>
              <Download size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Tudo (JSON)
            </button>
          </div>
          <p style={hint}>A planilha abre no Excel/Google Planilhas. O JSON traz todos os espaços e preferências.</p>
        </div>

        <div>
          <div style={label}>Privacidade</div>
          <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
            <Link href="/privacidade" style={{ color: 'var(--accent-light)' }}>Política de privacidade</Link>
            {' · '}
            <Link href="/termos" style={{ color: 'var(--accent-light)' }}>Termos de uso</Link>
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...label, color: 'var(--danger)' }}>Zona de perigo</div>
        {onClearAll && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {!confirmClear ? (
              <button className="ghost" onClick={() => setConfirmClear(true)}>Apagar todos os dados de “{spaceName}”</button>
            ) : (
              <>
                <span style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>
                  Apagar todas as pessoas, cartões e gastos de “{spaceName}”? Isso não pode ser desfeito.
                </span>
                <button className="ghost danger" onClick={() => { setConfirmClear(false); onClearAll(); }}>Apagar tudo</button>
                <button className="ghost" onClick={() => setConfirmClear(false)} autoFocus>Cancelar</button>
              </>
            )}
          </div>
        )}
        {!deleting ? (
          <button className="ghost" onClick={() => { setDeleting(true); setMessage(null); }}>Excluir minha conta</button>
        ) : (
          <form onSubmit={handleDelete}>
            <div style={{ ...label, color: 'var(--danger)' }}>Excluir minha conta</div>
            <p style={{ fontSize: '0.82rem', margin: '0 0 0.6rem', color: 'var(--text-dim)' }}>
              Isso não pode ser desfeito. Se quiser guardar uma cópia, baixe seus dados acima antes. O que acontece com cada espaço:
            </p>
            <ul style={{ margin: '0 0 0.9rem', paddingLeft: '1.2rem', fontSize: '0.82rem', lineHeight: 1.6 }}>
              {plan.map(step => (
                <li key={step.space.id}><strong>{step.space.name}</strong> — {planText(step)}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Digite EXCLUIR"
                aria-label="Digite EXCLUIR para confirmar" autoComplete="off" style={{ flex: '1 1 150px' }} />
              {method === 'password' && (
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha"
                  aria-label="Sua senha" autoComplete="current-password" style={{ flex: '1 1 150px' }} />
              )}
            </div>
            {method !== 'password' && <p style={hint}>Vamos pedir para você entrar com o Google de novo, para confirmar que é você.</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
              <button type="submit" className="ghost danger"
                disabled={busy || confirmText.trim().toUpperCase() !== 'EXCLUIR' || (method === 'password' && !password)}>
                {busy ? 'Excluindo…' : 'Excluir conta definitivamente'}
              </button>
              <button type="button" className="ghost" onClick={() => { setDeleting(false); setConfirmText(''); setPassword(''); }} disabled={busy}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {message && (
        <p role="status" style={{ color: message.type === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: '0.82rem', margin: '1rem 0 0' }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
