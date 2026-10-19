// Estilos do app. As cores vêm das variáveis CSS da paleta (ver lib/theme.js).
export const APP_CSS = `
  .extrato-app * { box-sizing: border-box; }
  .extrato-app .display { font-family: 'Fraunces', serif; }
  .extrato-app .mono { font-family: 'IBM Plex Mono', monospace; }
  .extrato-app .section-title { font-size: 1.15rem; margin: 0; }
  .extrato-app .muted { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
  .extrato-app .hint { color: var(--text-muted); font-size: 0.78rem; margin: 0; }
  .extrato-app a { color: var(--accent-light); }
  .extrato-app .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .extrato-app input, .extrato-app select {
    background: var(--input-bg); border: 1px solid var(--border-strong); color: var(--text);
    border-radius: 8px; padding: 0.45rem 0.6rem; font-family: inherit; font-size: 0.875rem;
    outline: none; transition: border-color 0.15s; min-height: 36px;
  }
  .extrato-app .money-input { position: relative; display: inline-flex; align-items: center; min-width: 0; }
  .extrato-app .money-input input { width: 100%; padding-left: 2.1rem; text-align: right; }
  .extrato-app .money-input input.money-lg { font-size: 1.1rem; }
  .extrato-app .money-prefix { position: absolute; left: 0.6rem; color: var(--text-muted); font-size: 0.85em; pointer-events: none; }
  .extrato-app .field .money-input { width: 100%; }
  .extrato-app input[type="checkbox"] { min-height: 0; width: 16px; height: 16px; padding: 0; accent-color: var(--accent); }
  .extrato-app input:focus, .extrato-app select:focus { border-color: var(--accent); }
  .extrato-app input[aria-invalid="true"] { border-color: var(--danger); }
  .extrato-app input[type="date"]::-webkit-calendar-picker-indicator { filter: var(--picker-filter); cursor: pointer; }
  .extrato-app input:-webkit-autofill,
  .extrato-app input:-webkit-autofill:hover,
  .extrato-app input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--text);
    -webkit-box-shadow: 0 0 0 1000px var(--input-bg) inset;
    transition: background-color 5000s ease-in-out 0s;
  }
  .extrato-app ::-webkit-scrollbar { height: 8px; width: 8px; }
  .extrato-app ::-webkit-scrollbar-track { background: transparent; }
  .extrato-app ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
  .extrato-app ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  .extrato-app button { font-family: inherit; }
  .extrato-app button:disabled { opacity: 0.5; cursor: not-allowed; }
  .extrato-app button.primary {
    background: var(--accent); color: var(--on-accent); border: none; border-radius: 8px;
    padding: 0.5rem 0.9rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; min-height: 36px;
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; transition: filter 0.15s;
  }
  .extrato-app button.primary:hover:not(:disabled) { filter: brightness(1.1); }
  .extrato-app button.ghost {
    background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px;
    padding: 0.4rem 0.7rem; font-size: 0.8rem; cursor: pointer; min-height: 34px;
    display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  }
  .extrato-app button.ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .extrato-app button.ghost.active { border-color: var(--accent); color: var(--text); }
  .extrato-app button.ghost.danger { border-color: var(--danger); color: var(--danger); }
  .extrato-app button.icon {
    background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem;
    border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; min-width: 30px; min-height: 30px;
  }
  .extrato-app button.icon:hover { color: var(--text); background: var(--panel-alt); }
  .extrato-app button.icon.delete:hover { color: var(--danger); }
  .extrato-app button:focus-visible, .extrato-app select:focus-visible, .extrato-app input:focus-visible,
  .extrato-app .credit-card:focus-visible, .extrato-app a:focus-visible {
    outline: 2px solid var(--accent-light); outline-offset: 2px;
  }

  .extrato-app .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; }
  .extrato-app .tag {
    font-size: 0.7rem; border-radius: 4px; padding: 0.1rem 0.4rem; letter-spacing: 0.02em; white-space: nowrap;
  }
  .extrato-app .status {
    font-size: 0.7rem; font-weight: 600; letter-spacing: 0.02em; border: 1px solid; border-radius: 999px;
    padding: 0.15rem 0.55rem; font-family: inherit; white-space: nowrap; line-height: 1.4;
  }
  .extrato-app button.status { cursor: pointer; }
  .extrato-app .label-sm { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-dim); }

  .extrato-app .credit-card { border-radius: 18px; padding: 1.1rem 1.3rem; position: relative; overflow: hidden; cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .extrato-app .credit-card:hover { transform: translateY(-3px); }
  .extrato-app .credit-card[aria-expanded="true"] { box-shadow: 0 0 0 2px var(--accent-light); }

  .extrato-app .chip {
    display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid var(--border-strong); background: transparent;
    color: var(--text-dim); border-radius: 999px; padding: 0.3rem 0.7rem; font-size: 0.8rem; cursor: pointer; min-height: 32px;
  }
  .extrato-app .chip[aria-pressed="true"] { background: var(--panel-alt); border-color: var(--accent); color: var(--text); font-weight: 600; }

  .extrato-app .overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; }
  .extrato-app .tile { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 0.9rem 1rem; text-align: left; color: var(--text); }
  .extrato-app button.tile { cursor: pointer; font: inherit; }
  .extrato-app button.tile:hover { border-color: var(--accent); }
  .extrato-app .tile-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .extrato-app .tile-value { font-family: 'IBM Plex Mono', monospace; font-size: 1.3rem; font-weight: 600; margin-top: 0.3rem; }
  .extrato-app .tile-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }

  .extrato-app .row { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .extrato-app .row-line { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

  .extrato-app .sheet-backdrop {
    position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .extrato-app .sheet {
    background: var(--panel); border: 1px solid var(--border-strong); border-radius: 16px; padding: 1.25rem;
    width: 100%; max-width: 560px; max-height: calc(100vh - 2rem); overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  .extrato-app .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--text-dim); }
  .extrato-app .field input, .extrato-app .field select { width: 100%; }
  .extrato-app .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }

  .extrato-app .toast {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: 1.25rem; z-index: 60;
    display: flex; align-items: center; gap: 0.6rem; width: max-content; max-width: calc(100vw - 2rem);
    background: var(--panel-alt); color: var(--text); border: 1px solid var(--border-strong); border-radius: 12px;
    padding: 0.55rem 0.6rem 0.55rem 1rem; font-size: 0.85rem; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  }

  .extrato-app .skeleton { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }

  .extrato-app .header-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .extrato-app .bottom-nav, .extrato-app .fab { display: none; }

  @media (max-width: 640px) {
    /* 16px evita o zoom automático do iPhone ao tocar num campo. */
    .extrato-app input, .extrato-app select { font-size: 16px; }
    .extrato-app .app-header { padding: 1.25rem 1rem 1rem !important; }
    .extrato-app .app-main { padding: 0 1rem !important; }
    .extrato-app .app-title { font-size: 1.6rem !important; }
    .extrato-app .panel { padding: 1rem; }
    .extrato-app .btn-label { display: none; }
    .extrato-app .overview { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
    .extrato-app .tile-value { font-size: 1.05rem; }
    .extrato-app .grid-2 { grid-template-columns: 1fr; }
    .extrato-app .sheet-backdrop { align-items: flex-end; padding: 0; }
    .extrato-app .sheet { border-radius: 18px 18px 0 0; max-height: 92vh; padding-bottom: calc(1.25rem + env(safe-area-inset-bottom)); }
    .extrato-app .desktop-only { display: none !important; }
    .extrato-app { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)) !important; }
    .extrato-app .bottom-nav {
      display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
      background: var(--panel); border-top: 1px solid var(--border-strong);
      padding: 0.25rem 0.25rem calc(0.25rem + env(safe-area-inset-bottom));
    }
    .extrato-app .bottom-nav button {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 52px; justify-content: center;
      background: none; border: none; color: var(--text-muted); font-size: 0.7rem; cursor: pointer; border-radius: 10px;
    }
    .extrato-app .bottom-nav button[aria-current="true"] { color: var(--accent-light); }
    .extrato-app .fab {
      display: inline-flex; position: fixed; right: 1rem; bottom: calc(4.6rem + env(safe-area-inset-bottom)); z-index: 41;
      width: 56px; height: 56px; border-radius: 50%; border: none; background: var(--accent); color: var(--on-accent);
      align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); cursor: pointer;
    }
    /* Acima da barra de atalhos e do botão "+". */
    .extrato-app .toast { bottom: calc(9rem + env(safe-area-inset-bottom)); }
  }
  /* Telas de toque: alvos de pelo menos 40px para o dedo. */
  @media (pointer: coarse) {
    .extrato-app button.icon { min-width: 40px; min-height: 40px; }
    .extrato-app button.ghost, .extrato-app button.primary, .extrato-app .chip { min-height: 40px; }
    .extrato-app button.status { padding: 0.35rem 0.7rem; }
    .extrato-app input[type="checkbox"] { width: 20px; height: 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .extrato-app .credit-card, .extrato-app button.primary { transition: none; }
    .extrato-app .credit-card:hover { transform: none; }
    .extrato-app .skeleton { animation: none; }
  }
  @media print {
    .extrato-app { background: #fff; color: #111; padding-bottom: 0 !important; }
    .extrato-app main > *:not(.print-keep) { display: none !important; }
    .extrato-app header, .extrato-app .no-print, .extrato-app .bottom-nav, .extrato-app .fab { display: none !important; }
    .extrato-app #relatorio-print-area { background: #fff; border: none; padding: 0; color: #111; }
    .extrato-app #relatorio-print-area .mono, .extrato-app #relatorio-print-area * { color: #111 !important; }
  }
`;
