'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

function traduzErro(code) {
  const mapa = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/missing-password': 'Digite uma senha.',
  };
  return mapa[code] || 'Não foi possível entrar. Tente novamente.';
}

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' | 'cadastro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (mode === 'cadastro' && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      router.replace('/');
    } catch (err) {
      setError(traduzErro(err.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F1115',
        color: '#EDEDEF',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .login-card * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .login-card .display { font-family: 'Fraunces', serif; }
        .login-card input {
          width: 100%; background: #1F232C; border: 1px solid #2A2F3A; color: #EDEDEF;
          border-radius: 8px; padding: 0.65rem 0.8rem; font-size: 0.9rem; outline: none;
          transition: border-color 0.15s;
        }
        .login-card input:focus { border-color: #C9A227; }
        .login-card button.primary {
          width: 100%; background: #C9A227; color: #0F1115; border: none; border-radius: 8px;
          padding: 0.7rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: filter 0.15s;
        }
        .login-card button.primary:hover { filter: brightness(1.1); }
        .login-card button.primary:disabled { opacity: 0.6; cursor: default; }
        .login-card button.link {
          background: none; border: none; color: #C9A227; font-size: 0.85rem; cursor: pointer; padding: 0;
        }
      `}</style>

      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#171A21',
          border: '1px solid #22262F',
          borderRadius: 16,
          padding: '2rem',
        }}
      >
        <div className="display" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
          Extrato
        </div>
        <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          {mode === 'login' ? 'Entre para ver suas contas' : 'Crie sua conta para começar'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#9096A3' }}>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="voce@email.com"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#9096A3' }}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />
          </label>

          {mode === 'cadastro' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#9096A3' }}>
              Confirmar senha
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </label>
          )}

          {error && (
            <div style={{ color: '#C1543C', fontSize: '0.82rem' }}>{error}</div>
          )}

          <button className="primary" type="submit" disabled={submitting} style={{ marginTop: '0.4rem' }}>
            {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#6B7280', textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              Ainda não tem conta?{' '}
              <button className="link" onClick={() => { setMode('cadastro'); setError(''); }}>
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button className="link" onClick={() => { setMode('login'); setError(''); }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
