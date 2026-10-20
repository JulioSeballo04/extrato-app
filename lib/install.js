'use client';

// Instalar o app (PWA) na tela inicial.
// - Android/Chrome/Edge: o navegador dispara `beforeinstallprompt`; guardamos o
//   evento para abrir a instalação quando a pessoa tocar em "Instalar".
// - iPhone/iPad (Safari): não há esse evento; mostramos o passo a passo
//   (Compartilhar → Adicionar à Tela de Início).
// O evento pode chegar antes da tela carregar, por isso a escuta começa
// assim que este arquivo é importado (ver AuthContext).

import { useEffect, useState } from 'react';

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // o app mostra o próprio aviso
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

function isInstalled() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS se apresenta como Mac, mas tem tela de toque.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

// { installed, canPrompt, ios, install() }. `install` devolve true se a pessoa aceitou.
export function useInstall() {
  const [, force] = useState(0);
  const [state, setState] = useState({ installed: false, ios: false });
  useEffect(() => {
    setState({ installed: isInstalled(), ios: isIos() });
    const fn = () => { force(n => n + 1); setState({ installed: isInstalled(), ios: isIos() }); };
    listeners.add(fn);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', fn);
    return () => { listeners.delete(fn); mq?.removeEventListener?.('change', fn); };
  }, []);

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    notify();
    return choice?.outcome === 'accepted';
  }

  return { installed: state.installed, canPrompt: !!deferredPrompt, ios: state.ios, install };
}

// O aviso grande some por 14 dias quando a pessoa fecha; a setinha no topo fica.
const DISMISS_KEY = 'gestor-de-gastos:instalar-dispensado';
export function installBannerDismissed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 86400000; } catch { return false; }
}
export function dismissInstallBanner() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignora */ }
}
