'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ExtratoApp from '../components/ExtratoApp';

export default function Home() {
  const { user, loading, logout, resendVerificationEmail, refreshUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const screenStyle = {
    minHeight: '100vh',
    background: '#0F1115',
    color: '#9096A3',
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
            background: '#171A21',
            border: '1px solid #22262F',
            borderRadius: 16,
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#EDEDEF', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Confirme seu e-mail
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Enviamos um link de confirmação para <strong style={{ color: '#EDEDEF' }}>{user.email}</strong>.
            Clique nele e depois volte aqui.
          </div>
          <button
            onClick={async () => {
              setChecking(true);
              await refreshUser();
              setChecking(false);
            }}
            style={{
              width: '100%', background: '#C9A227', color: '#0F1115', border: 'none', borderRadius: 8,
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
              width: '100%', background: 'transparent', color: '#C9A227', border: '1px solid #2A2F3A', borderRadius: 8,
              padding: '0.7rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.6rem',
            }}
          >
            {resent ? 'E-mail reenviado' : 'Reenviar e-mail'}
          </button>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <ExtratoApp />;
}
