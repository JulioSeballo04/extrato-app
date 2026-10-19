'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ExtratoApp from '../components/ExtratoApp';
import { useSpaces } from '../lib/spaces';
import { PALETTES, DEFAULT_PALETTE, readCachedPalette } from '../lib/theme';

export default function Home() {
  const { user, loading, logout, resendVerificationEmail, refreshUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const spacesApi = useSpaces(user?.emailVerified ? user : null);
  // Cores da última paleta usada neste aparelho: o carregamento já aparece na cor certa.
  const [pal, setPal] = useState(PALETTES[DEFAULT_PALETTE]);
  useEffect(() => {
    const cached = readCachedPalette();
    setPal(cached);
    document.body.style.background = cached.bg;
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const screenStyle = {
    minHeight: '100vh',
    background: pal.bg,
    color: pal.textDim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif',
  };

  if (loading || !user) {
    return <div style={screenStyle}>Carregando…</div>;
  }

  if (!user.emailVerified) {
    return (
      <div style={screenStyle}>
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            background: pal.panel,
            border: `1px solid ${pal.border}`,
            borderRadius: 16,
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ color: pal.text, fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Confirme seu e-mail
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Enviamos um link de confirmação para <strong style={{ color: pal.text }}>{user.email}</strong>.
            Clique nele e depois volte aqui.
          </div>
          <div style={{ fontSize: '0.78rem', color: pal.textMuted, marginBottom: '1.25rem' }}>
            Não encontrou o e-mail? Dá uma olhada na caixa de spam ou lixo eletrônico.
          </div>
          <button
            onClick={async () => {
              setChecking(true);
              await refreshUser();
              setChecking(false);
            }}
            style={{
              width: '100%', background: pal.accent, color: pal.onAccent, border: 'none', borderRadius: 8,
              padding: '0.7rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.6rem',
            }}
          >
            {checking ? 'Verificando…' : 'Já confirmei'}
          </button>
          <button
            onClick={async () => {
              await resendVerificationEmail();
              setResent(true);
            }}
            style={{
              width: '100%', background: 'transparent', color: pal.accent, border: `1px solid ${pal.borderStrong}`, borderRadius: 8,
              padding: '0.7rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.6rem',
            }}
          >
            {resent ? 'E-mail reenviado' : 'Reenviar e-mail'}
          </button>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: pal.textMuted, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  // Primeiro acesso no modelo novo: cria o espaço e migra os dados antigos.
  if (spacesApi.status === 'loading' || (spacesApi.status === 'ready' && !spacesApi.active)) {
    return <div style={screenStyle}>Preparando seus dados…</div>;
  }

  if (spacesApi.status === 'failed') {
    return (
      <div style={screenStyle}>
        <div style={{ maxWidth: 380, background: pal.panel, border: `1px solid ${pal.border}`, borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: pal.text, fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.5rem' }}>Não consegui carregar seus dados</div>
          <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Verifique sua conexão e tente de novo. Seus dados continuam salvos na nuvem.</div>
          <button
            onClick={spacesApi.retry}
            style={{ width: '100%', background: pal.accent, color: pal.onAccent, border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.6rem' }}
          >
            Tentar de novo
          </button>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: pal.textMuted, fontSize: '0.82rem', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
    );
  }

  return <ExtratoApp spacesApi={spacesApi} />;
}
