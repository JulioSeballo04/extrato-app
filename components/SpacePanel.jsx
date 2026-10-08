'use client';

import React, { useState } from 'react';
import { Copy, Check, X, Plus } from 'lucide-react';
import { formatCode, ROLES } from '../lib/spaces';

const ERROR_MESSAGES = {
  'invite-not-found': 'Código não encontrado. Confira e tente de novo — cada código vale uma vez só.',
  'invite-expired': 'Esse código expirou. Peça um novo para quem convidou.',
  'already-member': 'Você já participa desse espaço.',
  'cannot-delete-home': 'O espaço “Meus gastos” não pode ser apagado.',
  'permission-denied': 'Sem permissão para isso. Se você acabou de entrar no espaço, recarregue a página.',
};

function messageFor(err) {
  return ERROR_MESSAGES[err?.code] || 'Não foi possível concluir. Tente de novo.';
}

// Painel do espaço ativo: membros, convites, entrar com código, criar, sair e apagar.
export default function SpacePanel({ spacesApi, userId, onClose }) {
  const { active: space, spaces, homeSpaceId } = spacesApi;
  const isOwner = space?.ownerId === userId;
  const isHome = space?.id === homeSpaceId;
  const members = (space?.members || []).map(uid => ({ uid, label: space.labels?.[uid] || 'Membro', role: space.roles?.[uid] }));

  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [newName, setNewName] = useState('');
  const [rename, setRename] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'leave' | 'delete' | `remove:<uid>`
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  async function run(fn, okText) {
    setBusy(true); setMessage(null);
    try {
      const result = await fn();
      if (okText) setMessage({ type: 'ok', text: typeof okText === 'function' ? okText(result) : okText });
      return result;
    } catch (err) {
      setMessage({ type: 'error', text: messageFor(err) });
      return undefined;
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function handleInvite() {
    setCopied(false);
    const code = await run(() => spacesApi.createInvite(space.id, inviteRole, inviteCode));
    if (code) setInviteCode(code);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatCode(inviteCode));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const name = await run(() => spacesApi.joinWithCode(codeInput), n => `Você entrou em “${n}”.`);
    if (name) setCodeInput('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await run(() => spacesApi.createSpace(newName), `Espaço “${newName.trim()}” criado.`);
    setNewName('');
  }

  const label = { fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' };
  const hint = { color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.4rem 0 0' };

  return (
    <section className="panel no-print" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
        {rename !== null ? (
          <form style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}
            onSubmit={e => { e.preventDefault(); run(() => spacesApi.renameSpace(space.id, rename)); setRename(null); }}>
            <input value={rename} onChange={e => setRename(e.target.value)} maxLength={60} autoFocus style={{ flex: '1 1 160px' }} aria-label="Nome do espaço" />
            <button className="primary" type="submit">Salvar</button>
            <button className="ghost" type="button" onClick={() => setRename(null)}>Cancelar</button>
          </form>
        ) : (
          <h2 className="display" style={{ fontSize: '1.15rem', margin: 0 }}>
            {space?.name}
            {isOwner && (
              <button className="ghost" style={{ marginLeft: '0.6rem', fontFamily: 'Inter, sans-serif' }} onClick={() => setRename(space.name)}>Renomear</button>
            )}
          </h2>
        )}
        <button className="icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
        Um espaço reúne pessoas, cartões e gastos. Convide quem divide as contas com você (casal, família, república):
        quem “pode editar” lança e marca contas junto; quem “só visualiza” apenas acompanha.
      </p>

      <div style={label}>Membros</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.25rem' }}>
        {members.map(m => (
          <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.45rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ flex: '1 1 160px', wordBreak: 'break-all' }}>
              {m.label}{m.uid === userId && <span style={{ color: 'var(--text-muted)' }}> (você)</span>}
            </span>
            {isOwner && m.role !== 'owner' ? (
              <select value={m.role} onChange={e => run(() => spacesApi.setMemberRole(space.id, m.uid, e.target.value))} aria-label={`Acesso de ${m.label}`}>
                <option value="editor">{ROLES.editor}</option>
                <option value="viewer">{ROLES.viewer}</option>
              </select>
            ) : (
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{ROLES[m.role] || m.role}</span>
            )}
            {isOwner && m.role !== 'owner' && (
              confirm === `remove:${m.uid}` ? (
                <button className="ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => run(() => spacesApi.removeMember(space.id, m.uid))}>Confirmar remoção</button>
              ) : (
                <button className="ghost" onClick={() => setConfirm(`remove:${m.uid}`)}>Remover</button>
              )
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {isOwner && (
          <div>
            <div style={label}>Convidar alguém para “{space.name}”</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} aria-label="Acesso do convidado">
                <option value="editor">{ROLES.editor}</option>
                <option value="viewer">{ROLES.viewer}</option>
              </select>
              <button className="primary" onClick={handleInvite} disabled={busy}>{inviteCode ? 'Gerar novo código' : 'Gerar código'}</button>
            </div>
            {inviteCode && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: '1.25rem', letterSpacing: '0.08em', color: 'var(--accent-light)' }}>{formatCode(inviteCode)}</span>
                  <button className="ghost" onClick={handleCopy}>
                    {copied ? <Check size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> : <Copy size={14} style={{ marginRight: 4, verticalAlign: -2 }} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p style={hint}>A pessoa digita esse código em “Entrar em um espaço”, no app dela. Vale por 24 horas e uma vez só.</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div style={label}>Entrar em um espaço</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="XXXXX-XXXXX"
              autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label="Código do convite"
              style={{ flex: '1 1 150px', textTransform: 'uppercase' }} />
            <button className="primary" type="submit" disabled={busy || !codeInput.trim()}>Entrar</button>
          </div>
        </form>

        <form onSubmit={handleCreate}>
          <div style={label}>Criar outro espaço</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex.: Casa, Viagem" maxLength={60} aria-label="Nome do novo espaço" style={{ flex: '1 1 150px' }} />
            <button className="primary" type="submit" disabled={busy || !newName.trim()}><Plus size={14} /> Criar</button>
          </div>
          {spaces.length > 1 && <p style={hint}>Troque de espaço pelo seletor no topo da tela.</p>}
        </form>
      </div>

      {!isHome && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isOwner ? (
            confirm === 'delete' ? (
              <>
                <span style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>Apagar “{space.name}” e todos os gastos dele, para todos os membros?</span>
                <button className="ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={busy} onClick={() => run(() => spacesApi.deleteSpace(space.id))}>Apagar espaço</button>
                <button className="ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              </>
            ) : (
              <button className="ghost" onClick={() => setConfirm('delete')}>Apagar este espaço</button>
            )
          ) : (
            confirm === 'leave' ? (
              <>
                <span style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>Sair de “{space.name}”? Para voltar, você vai precisar de um novo convite.</span>
                <button className="ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={busy} onClick={() => run(() => spacesApi.leaveSpace(space.id))}>Sair do espaço</button>
                <button className="ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              </>
            ) : (
              <button className="ghost" onClick={() => setConfirm('leave')}>Sair deste espaço</button>
            )
          )}
        </div>
      )}

      {message && (
        <p style={{ color: message.type === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: '0.82rem', margin: '1rem 0 0' }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
