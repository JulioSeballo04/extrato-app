'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  reload,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Envia o e-mail de confirmação; a conta só é considerada verificada
    // depois que a pessoa clicar no link recebido.
    await sendEmailVerification(cred.user);
    return cred;
  }

  async function resendVerificationEmail() {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }

  // Recarrega os dados do usuário atual (usado para checar se ele já
  // confirmou o e-mail sem precisar deslogar e logar de novo).
  async function refreshUser() {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
  }

  function logout() {
    return signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, resendVerificationEmail, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  return ctx;
}
