'use client';

import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { Sheet } from './ui';
import { BRAND } from '../lib/brand';
import { useInstall, installBannerDismissed, dismissInstallBanner } from '../lib/install';

// Aviso "Instale o app" (some por 14 dias ao fechar) + setinha fixa no topo.
// Some de vez quando o app já está instalado.
export function useInstallUi() {
  const { installed, canPrompt, ios, install } = useInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(() => installBannerDismissed());
  const available = !installed && (canPrompt || ios);

  async function start() {
    if (canPrompt) {
      const ok = await install();
      if (ok) setBannerHidden(true);
    } else if (ios) setShowIosHelp(true);
  }
  function closeBanner() {
    dismissInstallBanner();
    setBannerHidden(true);
  }

  return {
    available,
    button: available && (
      <button className="ghost" onClick={start} aria-label={`Instalar o ${BRAND.shortName} no aparelho`} title="Instalar o app">
        <Download size={15} /><span className="btn-label">Instalar</span>
      </button>
    ),
    banner: available && !bannerHidden && (
      <section className="panel no-print" role="region" aria-label="Instalar o app"
        style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', borderColor: 'var(--accent)' }}>
        <span aria-hidden="true" style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent)', color: 'var(--on-accent)',
        }}><Download size={22} /></span>
        <span style={{ flex: '1 1 200px' }}>
          <strong>Instale o {BRAND.name}</strong>
          <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            Abre direto da tela inicial, em tela cheia, como um aplicativo.
          </span>
        </span>
        <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="primary" onClick={start}><Download size={15} />Instalar</button>
          <button className="icon" onClick={closeBanner} aria-label="Agora não"><X size={18} /></button>
        </span>
      </section>
    ),
    iosHelp: showIosHelp && (
      <Sheet title="Instalar no iPhone" onClose={() => setShowIosHelp(false)}>
        <ol style={{ margin: '0.8rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', lineHeight: 1.5 }}>
          <li>No Safari, toque em <strong>Compartilhar</strong> <Share size={16} style={{ verticalAlign: -3 }} aria-label="(ícone de compartilhar)" /> na barra de baixo.</li>
          <li>Role e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare size={16} style={{ verticalAlign: -3 }} aria-hidden="true" />.</li>
          <li>Toque em <strong>Adicionar</strong>. O ícone do {BRAND.shortName} aparece junto dos seus apps.</li>
        </ol>
        <p className="hint" style={{ marginTop: '1rem' }}>Precisa ser no Safari: outros navegadores do iPhone não mostram essa opção.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="primary" onClick={() => setShowIosHelp(false)}>Entendi</button>
        </div>
      </Sheet>
    ),
  };
}
