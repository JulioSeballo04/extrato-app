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
    'auth/popup-closed-by-user': 'Janela do Google fechada antes de concluir o login.',
    'auth/account-exists-with-different-credential': 'Já existe uma conta com esse e-mail usando outro método de login.',
  };
  return mapa[code] || 'Não foi possível entrar. Tente novamente.';
}

export default function LoginPage() {
  const { user, loading, login, loginWithGoogle, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' | 'cadastro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

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
        router.replace('/');
      } else {
        await register(email.trim(), password);
        router.replace('/'); // page.jsx vai mostrar a tela de "confirme seu e-mail"
      }
    } catch (err) {
      setError(traduzErro(err.code));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      router.replace('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(traduzErro(err.code));
    } finally {
      setGoogleSubmitting(false);
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
        .login-card button.google {
          width: 100%; background: #1F232C; color: #EDEDEF; border: 1px solid #2A2F3A; border-radius: 8px;
          padding: 0.65rem; font-weight: 500; font-size: 0.9rem; cursor: pointer; transition: border-color 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
        }
        .login-card button.google:hover { border-color: #6B7280; }
        .login-card button.google:disabled { opacity: 0.6; cursor: default; }
        .login-card .divider {
          display: flex; align-items: center; gap: 0.75rem; color: #6B7280; font-size: 0.78rem; margin: 1.1rem 0;
        }
        .login-card .divider::before, .login-card .divider::after {
          content: ''; flex: 1; height: 1px; background: #22262F;
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

        <div className="divider">ou</div>

        <button className="google" type="button" onClick={handleGoogle} disabled={googleSubmitting}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.02l7.73 6c4.51-4.18 7.09-10.36 7.09-17.49z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {googleSubmitting ? 'Aguarde…' : 'Entrar com Google'}
        </button>

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
