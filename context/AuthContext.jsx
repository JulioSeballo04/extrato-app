'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
  reload,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
} from 'firebase/auth';
import { auth, clearLocalDataAndReload } from '../lib/firebase';

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

  // Alguns navegadores (Safari, in-app browsers, bloqueadores de pop-up)
  // impedem o signInWithPopup; nesses casos caímos para o fluxo de redirect.
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        return signInWithRedirect(auth, provider);
      }
      throw err;
    }
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

  async function logout() {
    await signOut(auth);
    await clearLocalDataAndReload();
  }

  // Envia o link de redefinição. Não revela se o e-mail tem conta ou não.
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Conta com senha ou com Google (define como confirmar a identidade).
  function signInMethod() {
    const ids = (auth.currentUser?.providerData || []).map(p => p.providerId);
    return ids.includes('password') ? 'password' : 'google';
  }

  // Ações sensíveis (excluir a conta) exigem login recente: pede a senha de
  // novo, ou reabre o Google, antes de apagar qualquer coisa.
  async function reauthenticate(password) {
    const current = auth.currentUser;
    if (signInMethod() === 'password') {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
    } else {
      await reauthenticateWithPopup(current, new GoogleAuthProvider());
    }
  }

  // Remove o usuário do Firebase Auth (os dados já devem ter sido apagados).
  async function deleteAccount() {
    await deleteUser(auth.currentUser);
    await clearLocalDataAndReload();
  }

  return (
    <AuthContext.Provider
      value={{
        user, loading, login, loginWithGoogle, register, logout, resendVerificationEmail, refreshUser,
        resetPassword, signInMethod, reauthenticate, deleteAccount,
      }}
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
